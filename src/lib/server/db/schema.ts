import { relations, sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export * from './auth.schema';

export const providerApiKey = pgTable(
	'provider_api_key',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		providerId: text('provider_id').notNull(),
		encryptedKey: text('encrypted_key').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.providerId] }),
		index('provider_api_key_user_idx').on(table.userId)
	]
);

export const generation = pgTable(
	'generation',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		demoSessionId: text('demo_session_id'),
		prompt: text('prompt').notNull(),
		status: text('status', { enum: ['running', 'completed', 'failed'] })
			.notNull()
			.default('running'),
		config: jsonb('config').$type<GenerationConfig>().notNull(),
		finalOutput: text('final_output'),
		error: text('error'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('generation_user_created_idx').on(table.userId, table.createdAt),
		index('generation_user_demo_session_created_idx').on(
			table.userId,
			table.demoSessionId,
			table.createdAt
		)
	]
);

export const generationOutput = pgTable(
	'generation_output',
	{
		id: text('id').primaryKey(),
		generationId: text('generation_id')
			.notNull()
			.references(() => generation.id, { onDelete: 'cascade' }),
		phase: text('phase', { enum: ['worker', 'judge'] }).notNull(),
		round: integer('round').notNull(),
		providerId: text('provider_id').notNull(),
		modelId: text('model_id').notNull(),
		status: text('status', { enum: ['running', 'completed', 'failed'] }).notNull(),
		output: text('output').notNull().default(''),
		error: text('error'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('generation_output_generation_idx').on(table.generationId)]
);

export const appSetting = pgTable('app_setting', {
	id: text('id').primaryKey().default('global'),
	intermediateTemplate: text('intermediate_template')
		.notNull()
		.default(
			sql`'Original prompt:\n{{original_prompt}}\n\nPrevious answers:\n{{previous_answers}}\n\nImprove your answer using the strongest points above.'`
		),
	judgeTemplate: text('judge_template')
		.notNull()
		.default(
			sql`'Original prompt:\n{{original_prompt}}\n\nCandidate answers:\n{{previous_answers}}\n\nSynthesize the best final answer.'`
		),
	demoAllowedModels: jsonb('demo_allowed_models').$type<ModelSelection[]>().notNull().default([]),
	demoRateLimitWindowMinutes: integer('demo_rate_limit_window_minutes').notNull().default(60),
	demoRateLimitPerIp: integer('demo_rate_limit_per_ip').notNull().default(5),
	demoRateLimitGlobal: integer('demo_rate_limit_global').notNull().default(25),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

export const demoGenerationRateLimit = pgTable(
	'demo_generation_rate_limit',
	{
		scope: text('scope', { enum: ['ip', 'global'] }).notNull(),
		identifier: text('identifier').notNull(),
		windowStart: timestamp('window_start').notNull(),
		count: integer('count').notNull().default(0),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.scope, table.identifier, table.windowStart] }),
		index('demo_generation_rate_limit_window_idx').on(table.windowStart)
	]
);

export const oidcLoginState = pgTable('oidc_login_state', {
	stateHash: text('state_hash').primaryKey(),
	idTokenHint: text('id_token_hint').notNull(),
	expiresAt: timestamp('expires_at').notNull()
});

export const userRelations = relations(user, ({ many }) => ({
	apiKeys: many(providerApiKey),
	generations: many(generation)
}));

export const generationRelations = relations(generation, ({ one, many }) => ({
	user: one(user, { fields: [generation.userId], references: [user.id] }),
	outputs: many(generationOutput)
}));

export type ModelSelection = {
	providerId: string;
	modelId: string;
};

export type GenerationConfig = {
	workers: ModelSelection[];
	judge: ModelSelection;
	rounds: number;
	options?: {
		maxOutputTokens?: number;
	};
};
