import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { appSetting, type ModelSelection } from '$lib/server/db/schema';

export const DEFAULT_INTERMEDIATE_TEMPLATE =
	'Original prompt:\n{{original_prompt}}\n\nPrevious answers:\n{{previous_answers}}\n\nImprove your answer using the strongest points above.';

export const DEFAULT_JUDGE_TEMPLATE =
	'Original prompt:\n{{original_prompt}}\n\nCandidate answers:\n{{previous_answers}}\n\nSynthesize the best final answer.';

export const DEFAULT_DEMO_RATE_LIMIT_WINDOW_MINUTES = 60;
export const DEFAULT_DEMO_RATE_LIMIT_PER_IP = 5;
export const DEFAULT_DEMO_RATE_LIMIT_GLOBAL = 25;

export async function getSettings() {
	const [settings] = await db.select().from(appSetting).where(eq(appSetting.id, 'global')).limit(1);
	if (settings) return settings;

	const [created] = await db
		.insert(appSetting)
		.values({
			id: 'global',
			intermediateTemplate: DEFAULT_INTERMEDIATE_TEMPLATE,
			judgeTemplate: DEFAULT_JUDGE_TEMPLATE,
			demoAllowedModels: [],
			demoRateLimitWindowMinutes: DEFAULT_DEMO_RATE_LIMIT_WINDOW_MINUTES,
			demoRateLimitPerIp: DEFAULT_DEMO_RATE_LIMIT_PER_IP,
			demoRateLimitGlobal: DEFAULT_DEMO_RATE_LIMIT_GLOBAL
		})
		.onConflictDoNothing()
		.returning();

	return (
		created ?? {
			id: 'global',
			intermediateTemplate: DEFAULT_INTERMEDIATE_TEMPLATE,
			judgeTemplate: DEFAULT_JUDGE_TEMPLATE,
			demoAllowedModels: [] as ModelSelection[],
			demoRateLimitWindowMinutes: DEFAULT_DEMO_RATE_LIMIT_WINDOW_MINUTES,
			demoRateLimitPerIp: DEFAULT_DEMO_RATE_LIMIT_PER_IP,
			demoRateLimitGlobal: DEFAULT_DEMO_RATE_LIMIT_GLOBAL,
			updatedAt: new Date()
		}
	);
}
