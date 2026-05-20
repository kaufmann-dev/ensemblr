<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { ModeWatcher, toggleMode } from 'mode-watcher';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Sheet from '$lib/components/ui/sheet';
	import { cn } from '$lib/utils';
	import { History, Key, LogOut, Menu, Moon, Settings, Shield, Sun } from '@lucide/svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { data, children } = $props();
	let mobileMenuOpen = $state(false);

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
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta
		name="description"
		content="Ensemblr runs mixture-of-agents generations across multiple AI models and saves generation history."
	/>
</svelte:head>

<ModeWatcher />

<div class="min-h-screen bg-background text-foreground">
	{#if data.user}
		<header class="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
			<div class="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
				<a href={resolve('/')} class="shrink-0 text-sm font-semibold tracking-normal">Ensemblr</a>

				<nav class="hidden items-center gap-1 md:flex">
					{#each navItems as item (item.href)}
						<a
							class={cn(
								'rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground',
								isActive(item.href) && 'bg-muted text-foreground'
							)}
							aria-current={isActive(item.href) ? 'page' : undefined}
							href={item.href}>{item.label}</a
						>
					{/each}
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onclick={toggleMode}
						aria-label="Toggle dark mode"
					>
						<Sun class="size-4 text-muted-foreground dark:hidden" />
						<Moon class="hidden size-4 text-muted-foreground dark:block" />
					</Button>
					<form method="POST" action={resolve('/logout')}>
						<Button type="submit" variant="outline" size="sm">Sign out</Button>
					</form>
				</nav>

				<div class="flex items-center gap-1 md:hidden">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onclick={toggleMode}
						aria-label="Toggle dark mode"
					>
						<Sun class="size-4 text-muted-foreground dark:hidden" />
						<Moon class="hidden size-4 text-muted-foreground dark:block" />
					</Button>
					<Sheet.Root bind:open={mobileMenuOpen}>
						<Sheet.Trigger
							class={buttonVariants({ variant: 'outline', size: 'icon' })}
							aria-label="Open navigation"
						>
							<Menu class="size-4" />
						</Sheet.Trigger>
						<Sheet.Content class="w-[19rem] max-w-[calc(100vw-2rem)]" side="right">
							<Sheet.Header class="border-b px-5 py-4">
								<Sheet.Title>Ensemblr</Sheet.Title>
							</Sheet.Header>
							<nav class="grid gap-1 p-3">
								{#each navItems as item (item.href)}
									{@const Icon = item.icon}
									<a
										class={cn(
											'flex items-center gap-3 rounded-md px-3 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground',
											isActive(item.href) && 'bg-muted text-foreground'
										)}
										aria-current={isActive(item.href) ? 'page' : undefined}
										href={item.href}
										onclick={() => (mobileMenuOpen = false)}
									>
										<Icon class="size-4" />
										<span>{item.label}</span>
									</a>
								{/each}
							</nav>
							<div class="mt-auto border-t p-3">
								<form method="POST" action={resolve('/logout')}>
									<Button class="w-full justify-start gap-3" type="submit" variant="ghost">
										<LogOut class="size-4" />
										Sign out
									</Button>
								</form>
							</div>
						</Sheet.Content>
					</Sheet.Root>
				</div>
			</div>
		</header>
	{/if}

	{@render children()}
</div>

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}>{locale}</a>
	{/each}
</div>
