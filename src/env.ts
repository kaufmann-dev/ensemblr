import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (input: string | undefined) => input;

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'PostgreSQL connection string', schema: optional },
	ORIGIN: { description: 'Public application origin without a path', schema: optional },
	API_KEY_ENCRYPTION_SECRET: {
		description: 'Secret encrypting stored provider API keys',
		schema: optional
	},
	BETTER_AUTH_SECRET: {
		description: 'Secret signing Better Auth session cookies',
		schema: optional
	},
	OIDC_ISSUER_URL: { description: 'OIDC issuer URL', schema: optional },
	OIDC_CLIENT_ID: { description: 'OIDC client ID', schema: optional },
	OIDC_CLIENT_SECRET: { description: 'OIDC client secret', schema: optional }
});
