<script lang="ts">
	import type { PageProps } from './$types';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '#lib/components/ui/card/index.js';
	import logo from '#lib/assets/ensemblr-aperture-fold.svg';

	import { authClient } from '#lib/auth-client.js';
	import { OIDC_PROVIDER_ID } from '#lib/oidc-policy.js';

	let { data, form }: PageProps = $props();
	let pending = $state(false);
	let startError = $state(false);

	async function signIn() {
		pending = true;
		startError = false;
		const { error } = await authClient.signIn.social({
			provider: OIDC_PROVIDER_ID,
			callbackURL: data.returnTo,
			errorCallbackURL: '/login?error=oidc'
		});
		if (error) {
			startError = true;
			pending = false;
		}
	}
</script>

<svelte:head><title>Login | ensemblr</title></svelte:head>

<main class="relative grid flex-1 place-items-center bg-background px-4 py-12">
	<div class="relative w-full max-w-[380px] px-1 py-4 sm:px-2">
		<!-- Dynamic Logo Branding above Card -->
		<div class="mb-6 text-center">
			<div class="flex items-center justify-center gap-3">
				<img src={logo} alt="" width="48" height="48" class="size-12 shrink-0" />
				<span class="font-mono text-3xl font-extrabold tracking-tighter text-foreground">
					ensemblr
				</span>
			</div>
			<p class="mt-1.5 text-xs tracking-tight text-muted-foreground">
				mixture-of-agents orchestration
			</p>
		</div>

		<Card class="w-full rounded border border-border bg-card p-1 shadow-xs">
			<CardHeader class="px-5 pt-4 pb-3">
				<CardTitle class="text-base font-bold tracking-tight text-foreground">Sign in</CardTitle>
				<p class="mt-0.5 text-xs text-muted-foreground">
					Authenticate or run an instant demo instance.
				</p>
			</CardHeader>
			<CardContent class="px-5 pb-5">
				<div class="space-y-3.5">
					{#if form?.message || startError || data.oidcError}
						<div
							class="rounded border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive"
							role="alert"
						>
							{form?.message ??
								(startError
									? 'Unable to start administrator sign-in'
									: 'Administrator sign-in failed. Please try again.')}
						</div>
					{/if}

					<div class="grid gap-2.5 pt-1.5">
						<p class="text-xs text-muted-foreground">
							Administrator access uses the configured identity provider.
						</p>
						<form
							onsubmit={(event) => {
								event.preventDefault();
								void signIn();
							}}
						>
							<Button
								class="h-8.5 w-full rounded text-xs font-bold shadow-none"
								type="submit"
								disabled={pending}
							>
								Sign in as administrator
							</Button>
						</form>

						<div class="relative my-0.5 flex items-center justify-center">
							<div class="absolute inset-0 flex items-center">
								<div class="w-full border-t border-border"></div>
							</div>
							<span class="relative bg-card px-2 text-xs text-muted-foreground"> Or </span>
						</div>

						<p class="text-xs text-muted-foreground">Demo access needs no credentials.</p>
						<form method="POST" action={`?/demo&returnTo=${encodeURIComponent(data.returnTo)}`}>
							<Button
								class="h-8.5 w-full rounded border-border text-xs font-bold hover:bg-muted/50"
								type="submit"
								variant="outline"
							>
								Launch demo session
							</Button>
						</form>
					</div>
				</div>
			</CardContent>
		</Card>

		<div class="mt-5 text-center text-xs text-muted-foreground/70">
			Better Auth session active · SSL secure
		</div>
	</div>
</main>
