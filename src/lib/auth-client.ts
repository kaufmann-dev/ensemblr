import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient();

/** End the session; OIDC sessions continue to provider logout, demo sessions return to login. */
export async function signOut() {
	const { data } = await authClient.signOut({ callbackURL: '/login' });
	if (!data?.redirect) window.location.assign('/login');
}
