import { eq } from 'drizzle-orm';
import { auth } from '../src/lib/server/auth.ts';
import { db } from '../src/lib/server/db/index.ts';
import { appSetting, user, type ModelSelection } from '../src/lib/server/db/schema.ts';
import {
	DEFAULT_INTERMEDIATE_TEMPLATE,
	DEFAULT_JUDGE_TEMPLATE
} from '../src/lib/server/settings.ts';

function required(name: string) {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is required`);
	return value;
}

async function upsertUser(role: 'admin' | 'demo', email: string, password: string, name: string) {
	const [existing] = await db
		.select()
		.from(user)
		.where(eq(user.email, email.toLowerCase()))
		.limit(1);
	if (!existing) {
		await auth.api.signUpEmail({ body: { email, password, name } });
		const [created] = await db
			.select()
			.from(user)
			.where(eq(user.email, email.toLowerCase()))
			.limit(1);
		if (created) await db.update(user).set({ role }).where(eq(user.id, created.id));
	} else {
		await db.update(user).set({ name, role }).where(eq(user.id, existing.id));
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
