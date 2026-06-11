import assert from 'node:assert/strict';
import test from 'node:test';
import {
	MIXTURE_CONFIG_COLLAPSED_KEY,
	RUN_DISABLED_REASON_ID,
	buildConversationView,
	getRunAriaDescribedBy,
	getRunDisabledExplanation,
	isFinalJudgeOutput,
	isMixtureConfigurationCollapsed,
	isMixtureConfigurationValid,
	readMixtureCollapsedPreference,
	type MixtureState,
	type WorkspaceOutput
} from './workspace.ts';

const validState: MixtureState = {
	hasModels: true,
	prompt: 'Explain the result',
	selectedWorkerCount: 2,
	judgeId: 'provider/judge',
	running: false
};

const workerOutput: WorkspaceOutput = {
	key: 'worker',
	phase: 'worker',
	round: 1,
	model: { providerId: 'provider', modelId: 'worker' },
	status: 'completed',
	text: 'Worker answer'
};

test('validates mixture configuration independently from the prompt', () => {
	assert.equal(isMixtureConfigurationValid(validState), true);
	assert.equal(isMixtureConfigurationValid({ ...validState, selectedWorkerCount: 1 }), false);
	assert.equal(isMixtureConfigurationValid({ ...validState, judgeId: '' }), false);
	assert.equal(isMixtureConfigurationValid({ ...validState, hasModels: false }), false);
});

test('forces invalid mixture configuration open and restores a valid collapsed preference', () => {
	assert.equal(MIXTURE_CONFIG_COLLAPSED_KEY, 'ensemblr:mixture-config-collapsed');
	assert.equal(readMixtureCollapsedPreference('true'), true);
	assert.equal(readMixtureCollapsedPreference('false'), false);
	assert.equal(readMixtureCollapsedPreference(null), false);
	assert.equal(isMixtureConfigurationCollapsed(false, true), false);
	assert.equal(isMixtureConfigurationCollapsed(true, true), true);
	assert.equal(isMixtureConfigurationCollapsed(true, false), false);
});

test('provides specific disabled run explanations', () => {
	assert.match(getRunDisabledExplanation({ ...validState, prompt: '' }), /Enter a prompt/);
	assert.match(
		getRunDisabledExplanation({ ...validState, selectedWorkerCount: 1 }),
		/at least two worker/
	);
	assert.match(getRunDisabledExplanation({ ...validState, judgeId: '' }), /judge model/);
	assert.match(
		getRunDisabledExplanation({ ...validState, hasModels: false }),
		/No models are available/
	);
});

test('associates disabled explanations with the run button', () => {
	assert.equal(getRunAriaDescribedBy({ ...validState, prompt: '' }), RUN_DISABLED_REASON_ID);
	assert.equal(getRunAriaDescribedBy(validState), undefined);
});

test('starting another generation replaces the active conversation', () => {
	const first = buildConversationView('First prompt', 'First result', [], 1, false, '');
	const second = buildConversationView('Second prompt', '', [], 1, true, '');

	assert.equal(first.userMessage?.source, 'First prompt');
	assert.equal(second.userMessage?.source, 'Second prompt');
	assert.equal(second.primaryAssistant?.source, '');
	assert.equal(JSON.stringify(second).includes('First'), false);
});

test('renders the submitted prompt and final judge output as primary conversation messages', () => {
	const conversation = buildConversationView('**Prompt**', '# Final', [], 1, false, '');

	assert.deepEqual(conversation.userMessage, {
		role: 'user',
		label: 'You',
		source: '**Prompt**'
	});
	assert.deepEqual(conversation.primaryAssistant, {
		role: 'assistant',
		label: 'Synthesis',
		source: '# Final',
		primary: true
	});
});

test('keeps worker and intermediate judge outputs secondary and excludes the final judge output', () => {
	const intermediateJudge = {
		...workerOutput,
		key: 'intermediate',
		phase: 'judge' as const,
		model: { providerId: 'provider', modelId: 'judge' }
	};
	const finalJudge = { ...intermediateJudge, key: 'final', round: 2 };
	const conversation = buildConversationView(
		'Prompt',
		'Final',
		[workerOutput, intermediateJudge, finalJudge],
		1,
		false,
		''
	);

	assert.deepEqual(
		conversation.secondaryOutputs.map((output) => output.key),
		['worker', 'intermediate']
	);
	assert.equal(isFinalJudgeOutput(finalJudge, 1), true);
	assert.equal(isFinalJudgeOutput(intermediateJudge, 1), false);
});
