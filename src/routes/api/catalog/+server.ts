import { requireUser } from '#lib/server/authz.js';
import { getCatalog } from '#lib/server/models/catalog.js';

export async function GET({ locals }) {
	requireUser(locals);
	return Response.json({ providers: await getCatalog() });
}
