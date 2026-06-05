<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let busy = $state(false);

	async function login(path: string, body?: { email: string; password: string }) {
		busy = true;
		error = '';
		const response = await fetch(path, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: body ? JSON.stringify(body) : undefined
		});
		busy = false;
		if (!response.ok) {
			error = 'Invalid credentials';
			return;
		}
		await goto(resolve('/'), { invalidateAll: true });
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		void login('/api/auth/sign-in/email', { email, password });
	}

	function loginAsDemo() {
		void login('/api/auth/sign-in/demo');
	}
</script>

<svelte:head><title>Login | ensemblr</title></svelte:head>

<main class="relative grid flex-1 place-items-center bg-background px-4 py-12">
	<div class="relative w-full max-w-[380px] px-1 py-4 sm:px-2">
		<!-- Dynamic Logo Branding above Card -->
		<div class="mb-6 text-center">
			<span class="font-mono tracking-tighter text-3xl font-extrabold text-foreground">
				ensemblr
			</span>
			<p class="mt-1.5 text-xs text-muted-foreground font-mono tracking-tight">
				mixture-of-agents orchestration
			</p>
		</div>

		<Card class="w-full border border-border bg-card rounded shadow-xs p-1">
			<CardHeader class="pb-3 pt-4 px-5">
				<CardTitle class="text-base font-bold font-mono tracking-tight text-foreground">
					Sign in
				</CardTitle>
				<p class="text-[11px] font-mono text-muted-foreground mt-0.5">
					Authenticate or run an instant demo instance.
				</p>
			</CardHeader>
			<CardContent class="px-5 pb-5">
				<form class="space-y-3.5" onsubmit={submit}>
					<!-- Email Field -->
					<div class="space-y-1">
						<Label for="email" class="text-[9px] font-mono font-bold text-muted-foreground/90 uppercase tracking-widest">Email</Label>
						<Input 
							id="email" 
							type="email" 
							autocomplete="email" 
							bind:value={email}
							placeholder="you@domain.com"
							class="text-xs font-mono"
							required
						/>
					</div>

					<!-- Password Field -->
					<div class="space-y-1">
						<Label for="password" class="text-[9px] font-mono font-bold text-muted-foreground/90 uppercase tracking-widest">Password</Label>
						<Input 
							id="password" 
							type="password" 
							autocomplete="current-password" 
							bind:value={password}
							placeholder="••••••••"
							class="text-xs font-mono"
							required
						/>
					</div>

					<!-- Error Message -->
					{#if error}
						<div class="rounded border border-destructive/20 bg-destructive/5 px-3 py-2 text-[11px] font-mono text-destructive">
							{error}
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="pt-1.5 grid gap-2.5">
						<Button 
							class="w-full h-8.5 font-mono text-xs font-bold rounded shadow-none" 
							type="submit" 
							disabled={busy}
						>
							{#if busy}
								<span class="animate-spin mr-2 size-3.5 border-2 border-primary-foreground border-t-transparent rounded-full"></span>
								Authenticating...
							{:else}
								Authenticate
							{/if}
						</Button>

						<div class="relative my-0.5 flex items-center justify-center">
							<div class="absolute inset-0 flex items-center">
								<div class="w-full border-t border-border"></div>
							</div>
							<span class="relative bg-card px-2 text-[9px] uppercase font-mono tracking-widest text-muted-foreground">
								Or
							</span>
						</div>

						<Button
							class="w-full h-8.5 font-mono text-xs font-bold rounded border-border hover:bg-muted/50"
							type="button"
							variant="outline"
							disabled={busy}
							onclick={loginAsDemo}
						>
							Launch Demo Session
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	</div>
</main>
