<script lang="ts">
	let { text }: { text: string } = $props();
</script>

<div class="flex justify-end">
	<div
		class="max-w-[85%] rounded-lg border border-border bg-muted/60 px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
	>
		{text}
	</div>
</div>
