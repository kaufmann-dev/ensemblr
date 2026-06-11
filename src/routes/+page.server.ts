import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { providerApiKey } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/authz';
import { getCatalog } from '$lib/server/models/catalog';
import type { CatalogProvider } from '$lib/server/models/catalog';
import { getSettings } from '$lib/server/settings';

export async function load({ locals }) {
	const user = requireUser(locals);
	const keys = await db
		.select({ providerId: providerApiKey.providerId })
		.from(providerApiKey)
		.where(eq(providerApiKey.userId, user.id));
	const keyProviders = keys.map((key) => key.providerId);
	const configuredProviders = new Set(keyProviders);

	let filteredCatalog: CatalogProvider[] = [];
	if (user.role === 'demo') {
		const [catalog, settings] = await Promise.all([getCatalog(), getSettings()]);
		const allowed = new Set(
			settings.demoAllowedModels.map((model) => `${model.providerId}/${model.modelId}`)
		);
		filteredCatalog = catalog
			.map((provider) => ({
				...provider,
				models: provider.models.filter((model) => allowed.has(`${provider.id}/${model.id}`))
			}))
			.filter((provider) => provider.models.length > 0);
	} else if (keyProviders.length > 0) {
		filteredCatalog = (await getCatalog()).filter((provider) =>
			configuredProviders.has(provider.id)
		);
	}

	const workspaceCatalog = filteredCatalog
		.map((provider) => ({
			id: provider.id,
			name: provider.name,
			models: provider.models
				.filter((model) => model.enabled)
				.map((model) => ({
					id: model.id,
					name: model.name,
					enabled: model.enabled
				}))
		}))
		.filter((provider) => provider.models.length > 0);

	return {
		catalog: workspaceCatalog,
		keyProviders,
		userRole: user.role
	};
}
