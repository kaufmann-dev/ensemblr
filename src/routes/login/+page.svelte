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

	async function login(body?: { email: string; password: string }) {
		busy = true;
		error = '';
		const response = await fetch(body ? '/api/auth/sign-in/email' : '/login/demo', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: body ? JSON.stringify(body) : undefined
		});
		busy = false;
		if (!response.ok) {
			error = 'Invalid credentials';
			return;
		}
		await goto(resolve('/'));
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		void login({ email, password });
	}
</script>

<svelte:head><title>Login | Ensemblr</title></svelte:head>

<main class="grid min-h-screen place-items-center px-4">
	<Card class="w-full max-w-sm">
		<CardHeader>
			<CardTitle>Ensemblr</CardTitle>
		</CardHeader>
		<CardContent>
			<form class="space-y-4" onsubmit={submit}>
				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input id="email" type="email" autocomplete="email" bind:value={email} />
				</div>
				<div class="space-y-2">
					<Label for="password">Password</Label>
					<Input
						id="password"
						type="password"
						autocomplete="current-password"
						bind:value={password}
					/>
				</div>
				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
				<Button class="w-full" type="submit" disabled={busy}>Sign in</Button>
				<Button
					class="w-full"
					type="button"
					variant="outline"
					disabled={busy}
					onclick={() => login()}
				>
					Login as Demo
				</Button>
			</form>
		</CardContent>
	</Card>
</main>
