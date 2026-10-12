<script lang="ts">
	import { signOut } from '#lib/auth-client.js';
	import type { Path } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { locales, localizeHref } from '#lib/paraglide/runtime.js';
	import {
		SESSION_TOUCH_HEADER,
		SESSION_TOUCH_HEADER_VALUE,
		shouldSendSessionTouch
	} from '#lib/session-policy.js';
	import { ModeWatcher, toggleMode } from 'mode-watcher';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import { cn } from '#lib/utils.js';
	import { History, Key, LogOut, Menu, Moon, Settings, Shield, Sun } from '@lucide/svelte';
	import './layout.css';
	import logo from '#lib/assets/ensemblr-aperture-fold.svg';

	let { data, children } = $props();
	let mobileMenuOpen = $state(false);
	let lastSessionTouch = -Infinity;

	let navItems = $derived([
		{ href: resolve('/'), label: 'Workspace', icon: Settings },
		{ href: resolve('/history'), label: 'History', icon: History },
		{ href: resolve('/settings'), label: 'API Keys', icon: Key },
		...(data.user?.role === 'admin'
			? [{ href: resolve('/admin'), label: 'Admin', icon: Shield }]
			: [])
	]);

	function isActive(href: string) {
		return page.url.pathname === href;
	}

	function touchSession(event: Event) {
		if (!data.user) return;

		const now = Date.now();
		if (!shouldSendSessionTouch(event.isTrusted, now, lastSessionTouch)) return;
		lastSessionTouch = now;

		void fetch(resolve('auth/session/touch'), {
			method: 'POST',
			headers: { [SESSION_TOUCH_HEADER]: SESSION_TOUCH_HEADER_VALUE },
			credentials: 'same-origin',
			keepalive: true
		}).catch(() => {});
	}
</script>

<svelte:window onpointerdown={touchSession} onkeydown={touchSession} onclick={touchSession} />

<svelte:head>
	<link rel="icon" href={logo} />
	<meta
		name="description"
		content="Ensemblr runs mixture-of-agents generations across multiple AI models and saves generation history."
	/>
</svelte:head>

<ModeWatcher />

<div class="flex min-h-screen flex-col bg-background text-foreground antialiased">
	{#if data.user}
		<header
			class="sticky top-0 z-40 w-full border-b border-border bg-card transition-all duration-200"
		>
			<div class="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
				<!-- Brand Logo -->
				<a
					href={resolve('/')}
					class="group -mx-1 -my-0.5 flex shrink-0 items-center gap-2 rounded px-1 py-0.5"
				>
					<img src={logo} alt="" width="20" height="20" class="size-5 shrink-0" />
					<span
						class="font-mono text-[16px] font-bold tracking-tighter text-foreground transition-all"
					>
						ensemblr
					</span>
					<span
						class="ml-1.5 hidden items-center rounded border border-border bg-muted/50 px-1.5 py-0.5 text-xs font-medium text-muted-foreground sm:inline-flex"
					>
						mixture-of-agents
					</span>
				</a>

				<!-- Desktop Navigation -->
				<nav class="hidden items-center gap-1.5 md:flex">
					{#each navItems as item (item.href)}
						<a
							class={cn(
								'rounded px-3 py-1.5 text-xs font-medium transition-all duration-150',
								isActive(item.href)
									? 'border border-border bg-muted text-foreground shadow-xs'
									: 'border border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
							)}
							aria-current={isActive(item.href) ? 'page' : undefined}
							href={item.href}
						>
							{item.label}
						</a>
					{/each}

					<div class="mx-2 h-4 w-px bg-border/80"></div>

					<!-- Dark Mode Toggle -->
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onclick={toggleMode}
						aria-label="Toggle dark mode"
						class="size-8 rounded text-muted-foreground transition-all duration-150 hover:text-foreground active:scale-95"
					>
						<Moon class="size-4 transition-all dark:hidden" />
						<Sun class="hidden size-4 transition-all dark:block" />
					</Button>

					<!-- Sign Out -->

					<div class="ml-1">
						<Button
							onclick={signOut}
							variant="outline"
							size="sm"
							class="h-8 rounded border-border text-xs font-medium transition-all hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive active:scale-95"
						>
							Sign out
						</Button>
					</div>
				</nav>

				<!-- Mobile Navigation Trigger -->
				<div class="flex items-center gap-1 md:hidden">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onclick={toggleMode}
						aria-label="Toggle dark mode"
						class="size-8 rounded text-muted-foreground transition-all hover:text-foreground active:scale-95"
					>
						<Moon class="size-4 transition-all dark:hidden" />
						<Sun class="hidden size-4 transition-all dark:block" />
					</Button>

					<Sheet.Root bind:open={mobileMenuOpen}>
						<Sheet.Trigger
							class={cn(
								buttonVariants({ variant: 'outline', size: 'icon' }),
								'size-8 rounded border-border transition-all active:scale-95'
							)}
							aria-label="Open navigation"
						>
							<Menu class="size-3.5" />
						</Sheet.Trigger>
						<Sheet.Content
							class="flex w-[20rem] max-w-[calc(100vw-2rem)] flex-col border-l border-border bg-card p-0"
							side="right"
						>
							<Sheet.Header class="border-b border-border px-6 py-4">
								<Sheet.Title
									class="flex items-center gap-2 text-left font-mono text-[16px] font-bold tracking-tighter text-foreground"
								>
									<img src={logo} alt="" width="20" height="20" class="size-5 shrink-0" />
									<span>ensemblr</span>
								</Sheet.Title>
							</Sheet.Header>
							<nav class="grid gap-1 px-4 py-4">
								{#each navItems as item (item.href)}
									{@const Icon = item.icon}
									<a
										class={cn(
											'flex items-center gap-3 rounded px-4 py-3 text-xs font-medium transition-all duration-150',
											isActive(item.href)
												? 'border border-border bg-muted text-foreground shadow-xs'
												: 'border border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
										)}
										aria-current={isActive(item.href) ? 'page' : undefined}
										href={item.href}
										onclick={() => (mobileMenuOpen = false)}
									>
										<Icon class="size-4 shrink-0 text-muted-foreground" />
										<span>{item.label}</span>
									</a>
								{/each}
							</nav>

							<div class="mt-auto border-t border-border bg-muted/20 p-4">
								<div>
									<Button
										class="w-full justify-center gap-2 rounded border border-transparent text-xs text-destructive transition-all hover:border-destructive/20 hover:bg-destructive/5 hover:text-destructive"
										onclick={signOut}
										variant="ghost"
									>
										<LogOut class="size-3.5" />
										<span>Sign out</span>
									</Button>
								</div>
							</div>
						</Sheet.Content>
					</Sheet.Root>
				</div>
			</div>
		</header>
	{/if}

	<div class="flex min-h-0 w-full flex-1 flex-col">
		{@render children()}
	</div>

	<footer class="px-4 pt-2 pb-5 text-center text-xs text-muted-foreground/70">
		<nav class="inline-flex items-center gap-3" aria-label="Legal links">
			<a
				class="rounded px-1 py-0.5 underline-offset-4 transition-colors hover:text-foreground hover:underline"
				href="https://legal.kaufmann.dev/privacy?site=ensemblr.kaufmann.dev"
				rel="noreferrer"
			>
				Privacy
			</a>
			<span aria-hidden="true" class="text-muted-foreground/40">/</span>
			<a
				class="rounded px-1 py-0.5 underline-offset-4 transition-colors hover:text-foreground hover:underline"
				href="https://legal.kaufmann.dev/imprint?site=ensemblr.kaufmann.dev"
				rel="noreferrer"
			>
				Imprint
			</a>
		</nav>
	</footer>
</div>

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={resolve(localizeHref(page.url.pathname, { locale }).slice(1) as Path)}>{locale}</a>
	{/each}
</div>
