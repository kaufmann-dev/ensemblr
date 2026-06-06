import { deserialize } from '$app/forms';

type AutosaveResult = {
	success?: boolean;
	action?: string;
	message?: string;
};

type AutosaveOptions = {
	action: string;
	delay: number;
	getFormData: () => FormData;
	validate?: () => string | null;
};

export class AutosaveController {
	saved = $state(true);
	saving = $state(false);
	dirty = $state(false);
	error = $state('');

	private action: string;
	private delay: number;
	private getFormData: () => FormData;
	private validate: () => string | null;
	private timer: ReturnType<typeof setTimeout> | undefined;
	private revision = 0;
	private activeSave: Promise<boolean> | undefined;

	constructor({ action, delay, getFormData, validate = () => null }: AutosaveOptions) {
		this.action = action;
		this.delay = delay;
		this.getFormData = getFormData;
		this.validate = validate;
	}

	schedule(delay = this.delay) {
		this.revision += 1;
		this.dirty = true;
		this.saved = false;
		this.error = '';
		this.clearTimer();

		const validationError = this.validate();
		if (validationError) {
			this.error = validationError;
			return;
		}

		this.timer = setTimeout(() => {
			void this.saveLatest();
		}, delay);
	}

	async flush() {
		this.clearTimer();
		if (!this.dirty && !this.saving) return true;
		return this.saveLatest();
	}

	async retry() {
		this.error = '';
		return this.saveLatest();
	}

	private clearTimer() {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = undefined;
		}
	}

	private async saveLatest(): Promise<boolean> {
		this.clearTimer();

		if (this.activeSave) {
			await this.activeSave;
			if (!this.dirty) return true;
			if (this.error) return false;
			return this.saveLatest();
		}

		const validationError = this.validate();
		if (validationError) {
			this.error = validationError;
			this.saved = false;
			return false;
		}

		const savingRevision = this.revision;
		this.saving = true;
		this.error = '';
		this.activeSave = this.submit();
		const success = await this.activeSave;
		this.activeSave = undefined;
		this.saving = false;

		if (!success) {
			this.dirty = true;
			this.saved = false;
			return false;
		}

		this.dirty = savingRevision !== this.revision;
		this.saved = !this.dirty;

		if (this.dirty) return this.saveLatest();
		return true;
	}

	private async submit() {
		try {
			const response = await fetch(this.action, {
				method: 'POST',
				body: this.getFormData(),
				headers: {
					'x-sveltekit-action': 'true'
				}
			});
			const result = deserialize<AutosaveResult, AutosaveResult>(await response.text());

			if (result.type === 'success' && result.data?.success) return true;

			if (result.type === 'failure') {
				this.error = result.data?.message ?? 'Could not save changes';
			} else if (result.type === 'error') {
				this.error = result.error.message;
			} else {
				this.error = 'Could not save changes';
			}
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Could not save changes';
		}

		return false;
	}
}
