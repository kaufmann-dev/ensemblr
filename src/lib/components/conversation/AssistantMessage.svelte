<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Markdown from '$lib/markdown/Markdown.svelte';
	import { Check, Copy, Loader2 } from '@lucide/svelte';

	let {
		text,
		error = undefined,
		streaming = false
	}: {
		text: string;
		error?: string;
		streaming?: boolean;
	} = $props();

	let copySuccess = $state(false);

	async function copy() {
		if (!text) return;
		try {
			await navigator.clipboard.writeText(text);
			copySuccess = true;
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		} catch {
			// Clipboard unavailable; the copy button simply has no effect.
		}
	}
</script>

<div class="group flex min-w-0 flex-col gap-1">
	{#if error}
		<div
			class="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm break-words text-destructive"
		>
			{error}
		</div>
	{:else if text}
		<Markdown {text} {streaming} />
	{:else if streaming}
		<div class="flex items-center gap-2 py-2 text-sm text-muted-foreground">
			<Loader2 class="size-4 animate-spin" />
			<span>Waiting for the judge model…</span>
		</div>
	{/if}

	{#if text && !streaming}
		<div>
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={copy}
				aria-label="Copy response"
				class="text-muted-foreground hover:text-foreground"
			>
				{#if copySuccess}
					<Check class="size-4" />
				{:else}
					<Copy class="size-4" />
				{/if}
			</Button>
		</div>
	{/if}
</div>
