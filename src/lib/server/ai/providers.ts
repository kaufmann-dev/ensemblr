import { createAnthropic } from '@ai-sdk/anthropic';
import { createCerebras } from '@ai-sdk/cerebras';
import { createCohere } from '@ai-sdk/cohere';
import { createDeepInfra } from '@ai-sdk/deepinfra';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createPerplexity } from '@ai-sdk/perplexity';
import { createTogetherAI } from '@ai-sdk/togetherai';
import { createXai } from '@ai-sdk/xai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';
import type { CatalogProvider } from '$lib/server/models/catalog';

type ProviderFactory = (
	apiKey: string,
	provider: CatalogProvider,
	modelId: string
) => LanguageModel;

const factories: Record<string, ProviderFactory> = {
	'@ai-sdk/openai': (apiKey, _provider, modelId) => createOpenAI({ apiKey })(modelId),
	'@ai-sdk/anthropic': (apiKey, _provider, modelId) => createAnthropic({ apiKey })(modelId),
	'@ai-sdk/google': (apiKey, _provider, modelId) => createGoogleGenerativeAI({ apiKey })(modelId),
	'@ai-sdk/mistral': (apiKey, _provider, modelId) => createMistral({ apiKey })(modelId),
	'@ai-sdk/groq': (apiKey, _provider, modelId) => createGroq({ apiKey })(modelId),
	'@ai-sdk/xai': (apiKey, _provider, modelId) => createXai({ apiKey })(modelId),
	'@ai-sdk/cohere': (apiKey, _provider, modelId) => createCohere({ apiKey })(modelId),
	'@ai-sdk/perplexity': (apiKey, _provider, modelId) => createPerplexity({ apiKey })(modelId),
	'@ai-sdk/togetherai': (apiKey, _provider, modelId) => createTogetherAI({ apiKey })(modelId),
	'@ai-sdk/deepinfra': (apiKey, _provider, modelId) => createDeepInfra({ apiKey })(modelId),
	'@ai-sdk/cerebras': (apiKey, _provider, modelId) => createCerebras({ apiKey })(modelId),
	'@ai-sdk/openai-compatible': (apiKey, provider, modelId) => {
		if (!provider.api) throw new Error(`${provider.name} does not expose an API base URL`);
		return createOpenAICompatible({
			name: provider.id,
			apiKey,
			baseURL: provider.api
		})(modelId);
	},
	'@openrouter/ai-sdk-provider': (apiKey, _provider, modelId) =>
		createOpenRouter({ apiKey })(modelId)
};

export function createLanguageModel(provider: CatalogProvider, modelId: string, apiKey: string) {
	if (!provider.npm || !factories[provider.npm]) {
		throw new Error(`${provider.name} is visible in the catalog but inference is not enabled`);
	}

	return factories[provider.npm](apiKey, provider, modelId);
}
