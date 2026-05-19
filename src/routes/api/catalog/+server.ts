import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/authz';
import { getCatalog } from '$lib/server/models/catalog';

export async function GET({ locals }) {
	requireUser(locals);
	return json({ providers: await getCatalog() });
}
