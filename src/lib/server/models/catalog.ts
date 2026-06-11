import { z } from 'zod';

const modelSchema = z.object({
	id: z.string(),
	name: z.string().optional(),
	family: z.string().optional(),
	reasoning: z.boolean().optional(),
	temperature: z.boolean().optional(),
	limit: z
		.object({
			context: z.number().optional(),
			output: z.number().optional()
		})
		.passthrough()
		.optional(),
	cost: z.record(z.string(), z.unknown()).optional()
});

const providerSchema = z.object({
	id: z.string(),
	name: z.string(),
	npm: z.string().optional(),
	api: z.string().optional(),
	env: z.array(z.string()).optional(),
	models: z.record(z.string(), modelSchema)
});

const catalogSchema = z.record(z.string(), providerSchema);

export type CatalogModel = z.infer<typeof modelSchema> & {
	enabled: boolean;
	logoUrl: string;
};

export type CatalogProvider = Omit<z.infer<typeof providerSchema>, 'models'> & {
	enabled: boolean;
	logoUrl: string;
	models: CatalogModel[];
};

let cached: { expiresAt: number; providers: CatalogProvider[] } | undefined;

const IMPLEMENTED_PACKAGES = new Set([
	'@ai-sdk/openai',
	'@ai-sdk/anthropic',
	'@ai-sdk/google',
	'@ai-sdk/mistral',
	'@ai-sdk/groq',
	'@ai-sdk/xai',
	'@ai-sdk/cohere',
	'@ai-sdk/perplexity',
	'@ai-sdk/togetherai',
	'@ai-sdk/deepinfra',
	'@ai-sdk/cerebras',
	'@ai-sdk/openai-compatible',
	'@openrouter/ai-sdk-provider'
]);

export async function getCatalog() {
	const now = Date.now();
	if (cached && cached.expiresAt > now) return cached.providers;

	const response = await fetch('https://models.dev/api.json');
	if (!response.ok) throw new Error('Could not fetch models.dev catalog');

	const raw: unknown = await response.json();
	const parsed = catalogSchema.parse(raw);
	const providers = Object.values(parsed)
		.map((provider) => {
			const enabled = Boolean(provider.npm && IMPLEMENTED_PACKAGES.has(provider.npm));
			const logoUrl = `https://models.dev/logos/${provider.id}.svg`;

			return {
				...provider,
				enabled,
				logoUrl,
				models: Object.values(provider.models)
					.filter((model) => model.id)
					.map((model) => ({ ...model, enabled, logoUrl }))
					.sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id))
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));

	cached = { expiresAt: now + 1000 * 60 * 10, providers };
	return providers;
}

export async function findCatalogModel(providerId: string, modelId: string) {
	const provider = (await getCatalog()).find((item) => item.id === providerId);
	const model = provider?.models.find((item) => item.id === modelId);
	if (!provider || !model) return undefined;
	return { provider, model };
}

export async function getRunnableModelKeys() {
	const catalog = await getCatalog();
	return new Set(
		catalog.flatMap((provider) =>
			provider.models
				.filter((model) => model.enabled)
				.map((model) => `${provider.id}/${model.id}`)
		)
	);
}
