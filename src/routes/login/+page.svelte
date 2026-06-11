<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Loader2 } from '@lucide/svelte';

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

<main class="grid flex-1 place-items-center bg-background px-4 py-12">
	<div class="w-full max-w-[380px]">
		<div class="mb-6 text-center">
			<span class="text-3xl font-bold tracking-tight text-foreground">ensemblr</span>
			<p class="mt-1.5 text-sm text-muted-foreground">Mixture-of-agents orchestration</p>
		</div>

		<Card class="w-full">
			<CardHeader>
				<CardTitle class="text-base font-semibold text-foreground">Sign in</CardTitle>
				<p class="text-sm text-muted-foreground">
					Use your account or start an instant demo session.
				</p>
			</CardHeader>
			<CardContent>
				<form class="space-y-3.5" onsubmit={submit}>
					<div class="space-y-1">
						<Label for="email">Email</Label>
						<Input
							id="email"
							type="email"
							autocomplete="email"
							bind:value={email}
							placeholder="you@domain.com"
							required
						/>
					</div>

					<div class="space-y-1">
						<Label for="password">Password</Label>
						<Input
							id="password"
							type="password"
							autocomplete="current-password"
							bind:value={password}
							placeholder="••••••••"
							required
						/>
					</div>

					{#if error}
						<div
							class="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
							role="alert"
						>
							{error}
						</div>
					{/if}

					<div class="grid gap-2.5 pt-1.5">
						<Button class="w-full" type="submit" disabled={busy}>
							{#if busy}
								<Loader2 class="size-4 animate-spin" />
								Signing in…
							{:else}
								Sign in
							{/if}
						</Button>

						<div class="relative my-0.5 flex items-center justify-center">
							<div class="absolute inset-0 flex items-center">
								<div class="w-full border-t border-border"></div>
							</div>
							<span class="relative bg-card px-2 text-xs text-muted-foreground">or</span>
						</div>

						<Button
							class="w-full"
							type="button"
							variant="outline"
							disabled={busy}
							onclick={loginAsDemo}
						>
							Start demo session
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>

		<nav
			class="mt-5 flex items-center justify-center gap-3 text-xs text-muted-foreground"
			aria-label="Legal links"
		>
			<a
				class="underline-offset-4 hover:text-foreground hover:underline"
				href="https://legal.kaufmann.dev/privacy?site=ensemblr.kaufmann.dev"
				rel="noreferrer"
			>
				Privacy
			</a>
			<span aria-hidden="true" class="text-muted-foreground/40">·</span>
			<a
				class="underline-offset-4 hover:text-foreground hover:underline"
				href="https://legal.kaufmann.dev/imprint?site=ensemblr.kaufmann.dev"
				rel="noreferrer"
			>
				Imprint
			</a>
		</nav>
	</div>
</main>
