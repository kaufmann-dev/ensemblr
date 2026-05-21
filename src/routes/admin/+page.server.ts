import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appSetting, type ModelSelection } from '$lib/server/db/schema';
import { requireAdmin } from '$lib/server/authz';
import { getSettings } from '$lib/server/settings';

export async function load({ locals, url }) {
	requireAdmin(locals);
	const tab = url.searchParams.get('tab') ?? 'prompts';
	return { settings: await getSettings(), tab };
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
	}
};

