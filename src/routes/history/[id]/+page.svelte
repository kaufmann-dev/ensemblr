<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import * as Accordion from '$lib/components/ui/accordion';
	import { 
		ArrowLeft, 
		Activity, 
		Copy, 
		Check, 
		Layers, 
		FileText, 
		Cpu,
		ShieldCheck
	} from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let copySuccess = $state(false);

	async function copyFinalOutput() {
		const text = data.generation.finalOutput ?? data.generation.error;
		if (!text) return;
		try {
			await navigator.clipboard.writeText(text);
			copySuccess = true;
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		} catch {
			// fallback
		}
	}
</script>

<svelte:head><title>Saved generation | ensemblr</title></svelte:head>

<main class="relative flex-1 flex flex-col justify-start max-w-5xl mx-auto w-full px-4 py-8 space-y-5 bg-background">
	<!-- Header Nav Back -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
		<div class="flex items-center gap-3">
			<a
				href={resolve('/history')}
				class="flex size-7 items-center justify-center rounded border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-all shadow-xs"
				aria-label="Back to history"
			>
				<ArrowLeft class="size-4" />
			</a>
			<div>
				<h1 class="text-sm font-bold font-mono tracking-tight text-foreground flex flex-wrap items-center gap-2">
					Saved generation
					<span 
						class={cn(
							"text-[9px] font-mono font-medium uppercase px-1.5 py-0.5 rounded border tracking-wide",
							data.generation.status === 'completed'
								? "border-border bg-foreground/5 text-foreground"
								: "border-destructive/30 bg-destructive/5 text-destructive"
						)}
					>
						{data.generation.status}
					</span>
				</h1>
				<p class="text-[10px] font-mono text-muted-foreground mt-0.5">Review mixture configurations and generated LLM responses</p>
			</div>
		</div>
	</div>

	<!-- Main Details Card -->
	<Card class="border border-border bg-card rounded shadow-xs overflow-hidden">
		<CardHeader class="pb-3 pt-4 px-5 border-b border-border">
			<div class="flex items-center gap-2">
				<FileText class="size-3.5 text-foreground/80" />
				<CardTitle class="text-sm font-bold font-mono tracking-tight">Source prompt</CardTitle>
			</div>
		</CardHeader>
		<CardContent class="p-0 bg-muted/5 border-b border-border">
			<ScrollArea class="max-h-52 w-full">
				<pre class="code-area p-5 text-foreground/80 break-words whitespace-pre-wrap select-text outline-none">{data.generation.prompt}</pre>
			</ScrollArea>
		</CardContent>

		<!-- Final Synthesis Output -->
		<CardHeader class="pb-3 pt-4 px-5 border-t border-border flex flex-row items-center justify-between gap-4">
			<div class="flex items-center gap-2">
				<ShieldCheck class="size-4 text-foreground/80" />
				<div>
					<CardTitle class="text-sm font-bold font-mono tracking-tight">Synthesized output</CardTitle>
					<CardDescription class="text-[10px] font-mono text-muted-foreground mt-0.5">Final synthesized response</CardDescription>
				</div>
			</div>
			{#if data.generation.finalOutput || data.generation.error}
				<Button 
					variant="ghost" 
					size="icon" 
					onclick={copyFinalOutput} 
					class="size-7 rounded text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all"
					aria-label="Copy output"
				>
					{#if copySuccess}
						<Check class="size-3.5 text-foreground" />
					{:else}
						<Copy class="size-3.5" />
					{/if}
				</Button>
			{/if}
		</CardHeader>
		<CardContent class="p-0 bg-muted/5 border-t border-border">
			<ScrollArea class="max-h-[30rem] w-full">
				<pre class="code-area p-5 text-foreground whitespace-pre-wrap selection:bg-foreground/10 break-words select-text outline-none">{data.generation.finalOutput ?? data.generation.error ?? 'No final output saved.'}</pre>
			</ScrollArea>
		</CardContent>
	</Card>

	<!-- Worker Mixture Steps -->
	<div class="space-y-3">
		<div class="flex items-center gap-2 px-1">
			<Layers class="size-4 text-foreground/80" />
			<h2 class="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground/90">Worker Mixture Steps ({data.outputs.length})</h2>
		</div>

		<Accordion.Root type="multiple" class="w-full grid gap-2">
			{#each data.outputs as output (output.id)}
				<Accordion.Item value={output.id} class="rounded border border-border bg-card overflow-hidden transition-all duration-150 hover:border-foreground/30 shadow-xs">
					<Accordion.Trigger class="px-4 py-2.5 text-xs font-mono font-medium hover:no-underline hover:bg-muted/40 transition-colors flex items-center justify-between gap-4">
						<div class="flex items-center gap-2.5 min-w-0">
							<span class="font-mono text-[9px] uppercase px-1.5 py-0.5 border border-border bg-muted text-muted-foreground tracking-wide rounded-sm">
								{output.phase} · Round {output.round}
							</span>
							<span class="truncate text-foreground/90 font-mono text-[11px]">
								{output.providerId}/{output.modelId}
							</span>
						</div>
						
						<span 
							class={cn(
								"text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-medium border",
								output.status === 'completed'
									? "border-border bg-foreground/5 text-foreground"
									: output.status === 'failed'
										? "border-destructive/30 bg-destructive/5 text-destructive"
										: "border-border bg-muted text-muted-foreground"
							)}
						>
							{output.status}
						</span>
					</Accordion.Trigger>
					<Accordion.Content class="p-0 border-t border-border bg-muted/5">
						<ScrollArea class="max-h-96 w-full">
							<pre class="code-area p-4 text-foreground/85 whitespace-pre-wrap break-words bg-muted/10 selection:bg-foreground/10 outline-none">{output.error ?? output.output}</pre>
						</ScrollArea>
					</Accordion.Content>
				</Accordion.Item>
			{:else}
				<div class="border border-dashed border-border rounded bg-card/40 p-6 text-center text-xs font-mono text-muted-foreground">
					No detailed step outputs were archived for this run.
				</div>
			{/each}
		</Accordion.Root>
	</div>
</main>
