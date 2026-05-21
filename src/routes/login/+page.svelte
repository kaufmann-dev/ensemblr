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

<svelte:head><title>Login | Ensemblr</title></svelte:head>

<main class="relative grid min-h-screen place-items-center px-4 py-12 overflow-hidden bg-background">
	<!-- Futuristic Glowing Ambient Orbs -->
	<div class="absolute top-[20%] left-[15%] -z-10 size-[25rem] rounded-full bg-primary/8 blur-[100px] animate-pulse duration-[6s] sm:size-[35rem]"></div>
	<div class="absolute bottom-[20%] right-[15%] -z-10 size-[25rem] rounded-full bg-cyan-400/5 blur-[100px] animate-pulse duration-[8s] sm:size-[35rem]"></div>

	<div class="relative w-full max-w-md px-1 py-4 sm:px-4">
		<!-- Dynamic Logo Branding above Card -->
		<div class="mb-8 text-center">
			<span class="font-black text-4xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-cyan-400">
				Ensemblr
			</span>
			<p class="mt-2 text-sm text-muted-foreground/80 font-medium">
				Next-Generation Mixture-of-Agents Workbench
			</p>
		</div>

		<Card class="w-full glass-panel border border-border/30 premium-glow-purple p-2 shadow-2xl">
			<CardHeader class="pb-4">
				<CardTitle class="text-xl font-bold tracking-tight text-foreground">
					Sign in
				</CardTitle>
				<p class="text-xs text-muted-foreground/75">
					Enter your credentials or test the environment instantly as demo.
				</p>
			</CardHeader>
			<CardContent>
				<form class="space-y-4" onsubmit={submit}>
					<!-- Email Field -->
					<div class="space-y-2">
						<Label for="email" class="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Email</Label>
						<Input 
							id="email" 
							type="email" 
							autocomplete="email" 
							bind:value={email}
							placeholder="you@domain.com"
							class="h-10 text-sm border-border/40 focus-visible:ring-primary/20"
							required
						/>
					</div>

					<!-- Password Field -->
					<div class="space-y-2">
						<Label for="password" class="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Password</Label>
						<Input 
							id="password" 
							type="password" 
							autocomplete="current-password" 
							bind:value={password}
							placeholder="••••••••"
							class="h-10 text-sm border-border/40 focus-visible:ring-primary/20"
							required
						/>
					</div>

					<!-- Error Message -->
					{#if error}
						<div class="rounded-xl border border-destructive/15 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive animate-headshake">
							{error}
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="pt-2 grid gap-3">
						<Button 
							class="w-full h-10 font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30" 
							type="submit" 
							disabled={busy}
						>
							{#if busy}
								<span class="animate-spin mr-2 size-4 border-2 border-primary-foreground border-t-transparent rounded-full"></span>
								Signing in...
							{:else}
								Sign in
							{/if}
						</Button>

						<div class="relative my-1 flex items-center justify-center">
							<div class="absolute inset-0 flex items-center">
								<div class="w-full border-t border-border/30"></div>
							</div>
							<span class="relative bg-card px-3 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
								Or
							</span>
						</div>

						<Button
							class="w-full h-10 font-semibold border-border/40 hover:bg-muted/40"
							type="button"
							variant="outline"
							disabled={busy}
							onclick={loginAsDemo}
						>
							Login as Demo
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>

		<!-- Footer Help -->
		<div class="mt-8 text-center text-xs text-muted-foreground/60">
			Securely managed session · Powered by Better Auth
		</div>
	</div>
</main>
