import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';

export async function POST({ request }) {
	await auth.api.signOut({ headers: request.headers });
	redirect(303, '/login');
}
