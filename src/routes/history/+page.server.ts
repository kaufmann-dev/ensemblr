import { redirect } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { generation } from '$lib/server/db/schema';
import { visibleGenerationsFor } from '$lib/server/generation-access';
import { requireUser } from '$lib/server/authz';

export async function load({ locals }) {
	const user = requireUser(locals);
	return {
		generations: await db
			.select()
			.from(generation)
			.where(visibleGenerationsFor(user, locals.session!.id))
			.orderBy(desc(generation.createdAt))
			.limit(50)
	};
}

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
