import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appSetting, type ModelSelection } from '$lib/server/db/schema';
import { requireAdmin } from '$lib/server/authz';
import { getSettings } from '$lib/server/settings';

export async function load({ locals }) {
	requireAdmin(locals);
	return { settings: await getSettings() };
}

export const actions = {
	default: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const intermediateTemplate = String(form.get('intermediateTemplate') ?? '');
		const judgeTemplate = String(form.get('judgeTemplate') ?? '');
		const demoAllowedModels: ModelSelection[] = form
			.getAll('demoAllowedModels')
			.map(String)
			.filter(Boolean)
			.map((value) => {
				const [providerId, ...model] = value.split('/');
				return { providerId, modelId: model.join('/') };
			});

		if (!intermediateTemplate || !judgeTemplate) {
			return fail(400, { message: 'Both prompt templates are required' });
		}

		await db
			.insert(appSetting)
			.values({
				id: 'global',
				intermediateTemplate,
				judgeTemplate,
				demoAllowedModels
			})
			.onConflictDoUpdate({
				target: appSetting.id,
				set: { intermediateTemplate, judgeTemplate, demoAllowedModels, updatedAt: new Date() }
			});

		redirect(303, '/admin');
	}
};
