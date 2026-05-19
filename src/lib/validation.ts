import { z } from 'zod';

export const modelSelectionSchema = z.object({
	providerId: z.string().min(1),
	modelId: z.string().min(1)
});

export const generateRequestSchema = z.object({
	prompt: z.string().trim().min(1),
	workers: z.array(modelSelectionSchema).min(2).max(5),
	judge: modelSelectionSchema,
	rounds: z.coerce.number().int().min(0).max(3),
	options: z
		.object({
			temperature: z.coerce.number().min(0).max(2).optional(),
			maxOutputTokens: z.coerce.number().int().min(1).max(64000).optional()
		})
		.optional()
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
