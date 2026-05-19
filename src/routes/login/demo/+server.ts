import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';

export async function POST() {
	if (!env.DEMO_EMAIL || !env.DEMO_PASSWORD) {
		return json({ message: 'Demo credentials are not configured' }, { status: 400 });
	}

	const response = await auth.api.signInEmail({
		body: {
			email: env.DEMO_EMAIL,
			password: env.DEMO_PASSWORD
		},
		asResponse: true
	});

	return response;
}
