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

<svelte:head><title>Saved generation | Ensemblr</title></svelte:head>

<main class="relative flex-1 flex flex-col justify-start max-w-5xl mx-auto w-full px-4 py-8 space-y-6 bg-background">
	<!-- Glowing background accent orb -->
	<div class="absolute top-[20%] right-[10%] -z-10 size-[25rem] rounded-full bg-primary/5 blur-[90px]"></div>

	<!-- Header Nav Back -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
		<div class="flex items-center gap-3">
			<a
				href={resolve('/history')}
				class="flex size-9 items-center justify-center rounded-xl border border-border/50 bg-card/65 backdrop-blur-md hover:bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-all shadow-sm"
				aria-label="Back to history"
			>
				<ArrowLeft class="size-4" />
			</a>
			<div>
				<h1 class="text-xl font-bold tracking-tight text-foreground flex flex-wrap items-center gap-2.5">
					Saved generation
					<Badge 
						variant="outline"
						class={cn(
							"text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border shadow-sm",
							data.generation.status === 'completed'
								? "border-emerald-500/25 bg-emerald-500/5 text-emerald-400"
								: "border-amber-500/25 bg-amber-500/5 text-amber-400"
						)}
					>
						{data.generation.status}
					</Badge>
				</h1>
				<p class="text-xs text-muted-foreground/85">Review mixture configurations and generated LLM responses</p>
			</div>
		</div>
	</div>

	<!-- Main Details Card -->
	<Card class="glass-panel border-border/30 premium-glow-purple">
		<CardHeader class="pb-3 border-b border-border/20">
			<div class="flex items-center gap-2">
				<FileText class="size-4 text-primary" />
				<CardTitle class="text-base font-bold">Source prompt</CardTitle>
			</div>
		</CardHeader>
		<CardContent class="p-0 bg-muted/5 border-b border-border/20">
			<ScrollArea class="max-h-56 w-full">
				<pre class="code-area p-5 text-foreground/80 break-words whitespace-pre-wrap select-text">{data.generation.prompt}</pre>
			</ScrollArea>
		</CardContent>

		<!-- Final Synthesis Output -->
		<CardHeader class="pb-3 border-t border-border/10 flex flex-row items-center justify-between gap-4">
			<div class="flex items-center gap-2">
				<ShieldCheck class="size-4 text-cyan-400" />
				<div>
					<CardTitle class="text-base font-bold">Synthesized output</CardTitle>
					<CardDescription class="text-[10px]">The final synthesized Mixture-of-Agents response</CardDescription>
				</div>
			</div>
			{#if data.generation.finalOutput || data.generation.error}
				<Button 
					variant="ghost" 
					size="icon" 
					onclick={copyFinalOutput} 
					class="size-8 rounded-lg text-muted-foreground hover:text-cyan-400 active:scale-95 transition-all"
					aria-label="Copy output"
				>
					{#if copySuccess}
						<Check class="size-3.5 text-emerald-400" />
					{:else}
						<Copy class="size-3.5" />
					{/if}
				</Button>
			{/if}
		</CardHeader>
		<CardContent class="p-0 bg-muted/15">
			<ScrollArea class="max-h-[30rem] w-full">
				<pre class="code-area p-5 text-foreground whitespace-pre-wrap selection:bg-cyan-500/25 break-words select-text">{data.generation.finalOutput ?? data.generation.error ?? 'No final output saved.'}</pre>
			</ScrollArea>
		</CardContent>
	</Card>

	<!-- Worker Mixture Steps -->
	<div class="space-y-3">
		<div class="flex items-center gap-2 px-1">
			<Layers class="size-4 text-cyan-400" />
			<h2 class="text-xs font-bold uppercase tracking-wider text-foreground/80">Worker Mixture Steps ({data.outputs.length})</h2>
		</div>

		<Accordion.Root type="multiple" class="w-full grid gap-2">
			{#each data.outputs as output (output.id)}
				<Accordion.Item value={output.id} class="rounded-xl border border-border/25 bg-card/45 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-primary/25 shadow-sm">
					<Accordion.Trigger class="px-4 py-3 text-sm font-semibold hover:no-underline hover:bg-muted/10 transition-colors flex items-center justify-between gap-4">
						<div class="flex items-center gap-2.5 min-w-0">
							<Badge variant="outline" class="font-mono text-[9px] uppercase px-1.5 py-0 border-primary/25 bg-primary/5 text-primary tracking-wide">
								{output.phase} · Round {output.round}
							</Badge>
							<span class="truncate text-foreground/90 font-medium font-mono text-xs">
								{output.providerId}/{output.modelId}
							</span>
						</div>
						
						<Badge 
							variant="outline" 
							class={cn(
								"text-[9px] uppercase px-2 py-0.5 rounded-full font-bold",
								output.status === 'completed'
									? "border-emerald-500/25 bg-emerald-500/5 text-emerald-400"
									: output.status === 'failed'
										? "border-destructive/25 bg-destructive/5 text-destructive"
										: "border-primary/25 bg-primary/5 text-primary"
							)}
						>
							{output.status}
						</Badge>
					</Accordion.Trigger>
					<Accordion.Content class="p-0 border-t border-border/20 bg-muted/5">
						<ScrollArea class="max-h-96 w-full">
							<pre class="code-area p-4 text-foreground/85 whitespace-pre-wrap break-words">{output.error ?? output.output}</pre>
						</ScrollArea>
					</Accordion.Content>
				</Accordion.Item>
			{:else}
				<div class="rounded-xl border border-border/25 bg-card/45 backdrop-blur-md p-6 text-center text-xs text-muted-foreground/80">
					No detailed step outputs were archived for this run.
				</div>
			{/each}
		</Accordion.Root>
	</div>
</main>
