import { fail, redirect } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { appSetting, type ModelSelection, user, providerApiKey } from '$lib/server/db/schema';
import { requireAdmin } from '$lib/server/authz';
import { getSettings } from '$lib/server/settings';
import { encryptSecret } from '$lib/server/crypto';

export async function load({ locals, url }) {
	requireAdmin(locals);
	const tab = url.searchParams.get('tab') ?? 'prompts';
	
	const [demoUser] = await db.select({ id: user.id }).from(user).where(eq(user.role, 'demo')).limit(1);
	let demoKeys: string[] = [];
	let demoUserExists = false;
	
	if (demoUser) {
		demoUserExists = true;
		const keys = await db.select({ providerId: providerApiKey.providerId }).from(providerApiKey).where(eq(providerApiKey.userId, demoUser.id));
		demoKeys = keys.map((key) => key.providerId);
	}
	
	return { settings: await getSettings(), tab, demoKeys, demoUserExists };
}

export const actions = {
	savePrompts: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const intermediateTemplate = String(form.get('intermediateTemplate') ?? '');
		const judgeTemplate = String(form.get('judgeTemplate') ?? '');

		if (!intermediateTemplate || !judgeTemplate) {
			return fail(400, { 
				message: 'Both prompt templates are required', 
				action: 'savePrompts' 
			});
		}

		await db
			.insert(appSetting)
			.values({
				id: 'global',
				intermediateTemplate,
				judgeTemplate
			})
			.onConflictDoUpdate({
				target: appSetting.id,
				set: { intermediateTemplate, judgeTemplate, updatedAt: new Date() }
			});

		redirect(303, '/admin?tab=prompts');
	},

	saveDemoModels: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const demoAllowedModels: ModelSelection[] = form
			.getAll('demoAllowedModels')
			.map(String)
			.filter(Boolean)
			.map((value) => {
				const [providerId, ...model] = value.split('/');
				return { providerId, modelId: model.join('/') };
			});

		await db
			.insert(appSetting)
			.values({
				id: 'global',
				demoAllowedModels
			})
			.onConflictDoUpdate({
				target: appSetting.id,
				set: { demoAllowedModels, updatedAt: new Date() }
			});

		redirect(303, '/admin?tab=demo');
	},

	saveDemoKey: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const providerId = String(form.get('providerId') ?? '');
		const apiKey = String(form.get('apiKey') ?? '');
		if (!providerId || !apiKey) return fail(400, { message: 'Provider and API key are required', action: 'saveDemoKey' });

		const [demoUser] = await db.select().from(user).where(eq(user.role, 'demo')).limit(1);
		if (!demoUser) return fail(400, { message: 'Demo account not found', action: 'saveDemoKey' });

		await db
			.insert(providerApiKey)
			.values({ userId: demoUser.id, providerId, encryptedKey: encryptSecret(apiKey) })
			.onConflictDoUpdate({
				target: [providerApiKey.userId, providerApiKey.providerId],
				set: { encryptedKey: encryptSecret(apiKey), updatedAt: new Date() }
			});

		redirect(303, '/admin?tab=demo-keys');
	},

	deleteDemoKey: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const providerId = String(form.get('providerId') ?? '');
		
		const [demoUser] = await db.select().from(user).where(eq(user.role, 'demo')).limit(1);
		if (!demoUser) return fail(400, { message: 'Demo account not found', action: 'deleteDemoKey' });

		await db
			.delete(providerApiKey)
			.where(and(eq(providerApiKey.userId, demoUser.id), eq(providerApiKey.providerId, providerId)));

		redirect(303, '/admin?tab=demo-keys');
	}
};

