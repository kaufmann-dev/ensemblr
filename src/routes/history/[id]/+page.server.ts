import { and, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { generation, generationOutput } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/authz';

export async function load({ locals, params }) {
	const user = requireUser(locals);
	const [item] = await db
		.select()
		.from(generation)
		.where(and(eq(generation.id, params.id), eq(generation.userId, user.id)))
		.limit(1);

	if (!item) error(404, 'Generation not found');

	const outputs = await db
		.select()
		.from(generationOutput)
		.where(eq(generationOutput.generationId, item.id));

	return { generation: item, outputs };
}
