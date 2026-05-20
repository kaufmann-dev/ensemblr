import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { generation, providerApiKey } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/authz';
import { getCatalog } from '$lib/server/models/catalog';
import type { CatalogProvider } from '$lib/server/models/catalog';
import { getSettings } from '$lib/server/settings';

export async function load({ locals }) {
	const user = requireUser(locals);
	const [catalog, keys, history, settings] = await Promise.all([
		getCatalog(),
		db
			.select({ providerId: providerApiKey.providerId })
			.from(providerApiKey)
			.where(eq(providerApiKey.userId, user.id)),
		db
			.select()
			.from(generation)
			.where(eq(generation.userId, user.id))
			.orderBy(desc(generation.createdAt))
			.limit(8),
		getSettings()
	]);

	const allowed = new Set(
		settings.demoAllowedModels.map((model) => `${model.providerId}/${model.modelId}`)
	);
	const filteredCatalog: CatalogProvider[] =
		user.role === 'demo'
			? catalog
					.map((provider) => ({
						...provider,
						models: provider.models.filter((model) => allowed.has(`${provider.id}/${model.id}`))
					}))
					.filter((provider) => provider.models.length > 0)
			: catalog;
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
		keyProviders: keys.map((key) => key.providerId),
		history,
		userRole: user.role
	};
}
