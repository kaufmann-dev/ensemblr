import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import postgres from 'postgres';
import * as schema from '../src/lib/server/db/auth.schema';
import { appSetting, type ModelSelection } from '../src/lib/server/db/schema';

process.loadEnvFile('.env');

const DEFAULT_INTERMEDIATE_TEMPLATE =
	'Original prompt:\n{{original_prompt}}\n\nPrevious answers:\n{{previous_answers}}\n\nImprove your answer using the strongest points above.';

const DEFAULT_JUDGE_TEMPLATE =
	'Original prompt:\n{{original_prompt}}\n\nCandidate answers:\n{{previous_answers}}\n\nSynthesize the best final answer.';

function required(name: string) {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is required`);
	return value;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const client = postgres(databaseUrl);
const db = drizzle(client, { schema });

const auth = betterAuth({
	baseURL: process.env.ORIGIN ?? 'http://localhost:5173',
	secret: required('BETTER_AUTH_SECRET'),
	database: drizzleAdapter(db, { provider: 'pg' }),
	user: {
		additionalFields: {
			role: {
				type: 'string',
				required: true,
				defaultValue: 'user',
				input: false
			}
		}
	},
	emailAndPassword: { enabled: true }
});

async function upsertUser(role: 'admin' | 'demo', email: string, password: string, name: string) {
	const [existing] = await db
		.select()
		.from(schema.user)
		.where(eq(schema.user.email, email.toLowerCase()))
		.limit(1);
	if (!existing) {
		await auth.api.signUpEmail({ body: { email, password, name } });
		const [created] = await db
			.select()
			.from(schema.user)
			.where(eq(schema.user.email, email.toLowerCase()))
			.limit(1);
		if (created) await db.update(schema.user).set({ role }).where(eq(schema.user.id, created.id));
	} else {
		await db.update(schema.user).set({ name, role }).where(eq(schema.user.id, existing.id));
	}
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

await upsertUser(
	'admin',
	required('ADMIN_EMAIL'),
	required('ADMIN_PASSWORD'),
	process.env.ADMIN_NAME ?? 'Admin'
);
await upsertUser(
	'demo',
	required('DEMO_EMAIL'),
	required('DEMO_PASSWORD'),
	process.env.DEMO_NAME ?? 'Demo'
);

await db
	.insert(appSetting)
	.values({
		id: 'global',
		intermediateTemplate: DEFAULT_INTERMEDIATE_TEMPLATE,
		judgeTemplate: DEFAULT_JUDGE_TEMPLATE,
		demoAllowedModels: parseModels(process.env.DEMO_ALLOWED_MODELS)
	})
	.onConflictDoUpdate({
		target: appSetting.id,
		set: {
			demoAllowedModels: parseModels(process.env.DEMO_ALLOWED_MODELS),
			updatedAt: new Date()
		}
	});

console.log('Seed complete');

await client.end();
process.exit(0);
