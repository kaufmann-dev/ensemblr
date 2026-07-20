import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { existsSync } from 'node:fs';
import postgres from 'postgres';
import * as schema from '../src/lib/server/db/auth.schema';
import { appSetting, type ModelSelection } from '../src/lib/server/db/schema';

if (existsSync('.env')) process.loadEnvFile('.env');

const DEFAULT_INTERMEDIATE_TEMPLATE =
	'Original prompt:\n{{original_prompt}}\n\nPrevious answers:\n{{previous_answers}}\n\nImprove your answer using the strongest points above.';

const DEFAULT_JUDGE_TEMPLATE =
	'Original prompt:\n{{original_prompt}}\n\nCandidate answers:\n{{previous_answers}}\n\nSynthesize the best final answer.';

const DEMO_USER_ID = 'demo';
const DEMO_USER_INTERNAL_EMAIL = 'guest@ensemblr.local';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const client = postgres(databaseUrl);
const db = drizzle(client, { schema });

async function upsertDemo(name: string) {
	const [existing] = await db
		.select()
		.from(schema.user)
		.where(eq(schema.user.role, 'demo'))
		.limit(1);
	if (existing) {
		await db.update(schema.user).set({ name, role: 'demo' }).where(eq(schema.user.id, existing.id));
		await db.delete(schema.account).where(eq(schema.account.userId, existing.id));
		return;
	}

	await db
		.insert(schema.user)
		.values({
			id: DEMO_USER_ID,
			name,
			email: DEMO_USER_INTERNAL_EMAIL,
			emailVerified: true,
			role: 'demo'
		})
		.onConflictDoUpdate({
			target: schema.user.id,
			set: { name, role: 'demo', updatedAt: new Date() }
		});
	await db.delete(schema.account).where(eq(schema.account.userId, DEMO_USER_ID));
}

function parseModels(value: string | undefined): ModelSelection[] {
	if (!value) return [];
	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean)
		.map((item) => {
			const [providerId, ...model] = item.split('/');
			return { providerId, modelId: model.join('/') };
		})
		.filter((item) => item.providerId && item.modelId);
}

await upsertDemo(process.env.DEMO_NAME ?? 'Demo');

await db
	.insert(appSetting)
	.values({
		id: 'global',
		intermediateTemplate: DEFAULT_INTERMEDIATE_TEMPLATE,
		judgeTemplate: DEFAULT_JUDGE_TEMPLATE,
		demoAllowedModels: parseModels(process.env.DEMO_ALLOWED_MODELS)
	})
	.onConflictDoNothing();

console.log('Seed complete');

await client.end();
process.exit(0);
