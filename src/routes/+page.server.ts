import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { generation, providerApiKey } from '$lib/server/db/schema';
import { visibleGenerationsFor } from '$lib/server/generation-access';
import { requireUser } from '$lib/server/authz';
import { getCatalog } from '$lib/server/models/catalog';
import type { CatalogProvider } from '$lib/server/models/catalog';
import { getSettings } from '$lib/server/settings';

const RECENT_RUNS_LIMIT = 5;

export async function load({ locals }) {
	const user = requireUser(locals);
	const [keys, history] = await Promise.all([
		db
			.select({ providerId: providerApiKey.providerId })
			.from(providerApiKey)
			.where(eq(providerApiKey.userId, user.id)),
		db
			.select()
			.from(generation)
			.where(visibleGenerationsFor(user, locals.session!.id))
			.orderBy(desc(generation.createdAt))
			.limit(RECENT_RUNS_LIMIT + 1)
	]);
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
		history,
		userRole: user.role
	};
}
