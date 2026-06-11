import { redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { generation } from '$lib/server/db/schema';
import { visibleGenerationsFor } from '$lib/server/generation-access';
import { requireUser } from '$lib/server/authz';

export const actions = {
	delete: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');

		if (id) {
			await db
				.delete(generation)
				.where(and(eq(generation.id, id), visibleGenerationsFor(user, locals.session!.id)));
		}

		redirect(303, '/history');
	},
	clear: async ({ locals }) => {
		const user = requireUser(locals);
		await db.delete(generation).where(visibleGenerationsFor(user, locals.session!.id));

		redirect(303, '/history');
	}
};
