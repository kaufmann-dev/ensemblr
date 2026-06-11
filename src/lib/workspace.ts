export const MIXTURE_CONFIG_COLLAPSED_KEY = 'ensemblr:mixture-config-collapsed';
export const RUN_DISABLED_REASON_ID = 'run-disabled-reason';

export type WorkspaceOutput = {
	key: string;
	outputId?: string;
	phase: 'worker' | 'judge';
	round: number;
	model: { providerId: string; modelId: string };
	status: string;
	text: string;
	error?: string;
};

export type MixtureState = {
	hasModels: boolean;
	prompt: string;
	selectedWorkerCount: number;
	judgeId: string;
	running: boolean;
};

export function isMixtureConfigurationValid(
	state: Pick<MixtureState, 'hasModels' | 'selectedWorkerCount' | 'judgeId'>
) {
	return state.hasModels && state.selectedWorkerCount >= 2 && Boolean(state.judgeId);
}

export function isMixtureConfigurationCollapsed(valid: boolean, storedPreference: boolean) {
	return valid && storedPreference;
}

export function readMixtureCollapsedPreference(storedValue: string | null) {
	return storedValue === 'true';
}

export function getRunDisabledExplanation(state: MixtureState) {
	if (state.running) return 'A synthesis is already running.';
	if (!state.hasModels)
		return 'No models are available. Configure an API key or ask an admin to enable demo models.';
	if (!state.prompt.trim()) return 'Enter a prompt to run a synthesis.';
	if (state.selectedWorkerCount < 2) return 'Select at least two worker models.';
	if (!state.judgeId) return 'Select a judge model.';
	return '';
}

export function getRunAriaDescribedBy(state: MixtureState) {
	return getRunDisabledExplanation(state) ? RUN_DISABLED_REASON_ID : undefined;
}

export function isFinalJudgeOutput(
	output: Pick<WorkspaceOutput, 'phase' | 'round'>,
	rounds: number
) {
	return output.phase === 'judge' && output.round > rounds;
}

export function buildConversationView(
	prompt: string,
	final: string,
	outputs: WorkspaceOutput[],
	rounds: number,
	running: boolean,
	error: string
) {
	return {
		userMessage: prompt
			? {
					role: 'user' as const,
					label: 'You',
					source: prompt
				}
			: undefined,
		primaryAssistant:
			prompt && (running || final || error)
				? {
						role: 'assistant' as const,
						label: 'Synthesis',
						source: final || error,
						primary: true
					}
				: undefined,
		secondaryOutputs: outputs.filter((output) => !isFinalJudgeOutput(output, rounds))
	};
}
