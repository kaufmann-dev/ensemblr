<script lang="ts">
	import { AlertCircle, CheckCircle2, Loader2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import type { AutosaveController } from './autosave.svelte';

	let { controller }: { controller: AutosaveController } = $props();
</script>

<div class="flex min-h-7 items-center" aria-live="polite" aria-atomic="true">
	{#if controller.error}
		<div class="flex items-center gap-2 text-xs text-destructive">
			<AlertCircle class="size-3.5 shrink-0" />
			<span>{controller.error}</span>
			<Button
				type="button"
				variant="ghost"
				size="xs"
				class="h-6 px-2 text-destructive"
				onclick={() => controller.retry()}
			>
				Retry
			</Button>
		</div>
	{:else if controller.saving || controller.dirty}
		<div class="flex items-center gap-2 text-xs text-muted-foreground">
			<Loader2 class="size-3.5 animate-spin" />
			<span>Saving</span>
		</div>
	{:else if controller.saved}
		<div class="flex items-center gap-2 text-xs text-muted-foreground">
			<CheckCircle2 class="size-3.5" />
			<span>All changes saved</span>
		</div>
	{/if}
</div>
