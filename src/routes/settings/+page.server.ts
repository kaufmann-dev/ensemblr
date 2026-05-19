import { fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { providerApiKey } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/authz';
import { encryptSecret } from '$lib/server/crypto';
import { getCatalog } from '$lib/server/models/catalog';

export async function load({ locals }) {
	const user = requireUser(locals);
	const [catalog, keys] = await Promise.all([
		getCatalog(),
		db
			.select({ providerId: providerApiKey.providerId })
			.from(providerApiKey)
			.where(eq(providerApiKey.userId, user.id))
	]);

	return { catalog, keys: keys.map((key) => key.providerId), role: user.role };
}

export const actions = {
	save: async ({ request, locals }) => {
		const user = requireUser(locals);
		if (user.role === 'demo') return fail(403, { message: 'Demo users cannot save API keys' });

		const form = await request.formData();
		const providerId = String(form.get('providerId') ?? '');
		const apiKey = String(form.get('apiKey') ?? '');
		if (!providerId || !apiKey) return fail(400, { message: 'Provider and API key are required' });

		await db
			.insert(providerApiKey)
			.values({ userId: user.id, providerId, encryptedKey: encryptSecret(apiKey) })
			.onConflictDoUpdate({
				target: [providerApiKey.userId, providerApiKey.providerId],
				set: { encryptedKey: encryptSecret(apiKey), updatedAt: new Date() }
			});

		redirect(303, '/settings');
	},
	delete: async ({ request, locals }) => {
		const user = requireUser(locals);
		if (user.role === 'demo') return fail(403, { message: 'Demo users cannot delete API keys' });

		const form = await request.formData();
		const providerId = String(form.get('providerId') ?? '');
		await db
			.delete(providerApiKey)
			.where(and(eq(providerApiKey.userId, user.id), eq(providerApiKey.providerId, providerId)));

		redirect(303, '/settings');
	}
};
