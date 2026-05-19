import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { generation } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/authz';

export async function load({ locals }) {
	const user = requireUser(locals);
	return {
		generations: await db
			.select()
			.from(generation)
			.where(eq(generation.userId, user.id))
			.orderBy(desc(generation.createdAt))
			.limit(50)
	};
}
