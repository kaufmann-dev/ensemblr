import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { appSetting, type ModelSelection } from '$lib/server/db/schema';

export const DEFAULT_INTERMEDIATE_TEMPLATE =
	'Original prompt:\n{{original_prompt}}\n\nPrevious answers:\n{{previous_answers}}\n\nImprove your answer using the strongest points above.';

export const DEFAULT_JUDGE_TEMPLATE =
	'Original prompt:\n{{original_prompt}}\n\nCandidate answers:\n{{previous_answers}}\n\nSynthesize the best final answer.';

export async function getSettings() {
	const [settings] = await db.select().from(appSetting).where(eq(appSetting.id, 'global')).limit(1);
	if (settings) return settings;

	const [created] = await db
		.insert(appSetting)
		.values({
			id: 'global',
			intermediateTemplate: DEFAULT_INTERMEDIATE_TEMPLATE,
			judgeTemplate: DEFAULT_JUDGE_TEMPLATE,
			demoAllowedModels: []
		})
		.onConflictDoNothing()
		.returning();

	return (
		created ?? {
			id: 'global',
			intermediateTemplate: DEFAULT_INTERMEDIATE_TEMPLATE,
			judgeTemplate: DEFAULT_JUDGE_TEMPLATE,
			demoAllowedModels: [] as ModelSelection[],
			updatedAt: new Date()
		}
	);
}
