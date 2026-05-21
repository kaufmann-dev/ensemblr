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

<div class="min-h-screen bg-background text-foreground flex flex-col antialiased">
	{#if data.user}
		<header class="sticky top-0 z-40 w-full border-b border-border/25 bg-card/65 backdrop-blur-xl transition-all duration-300">
			<div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
				<!-- Brand Logo -->
				<a 
					href={resolve('/')} 
					class="shrink-0 flex items-center gap-2 group focus-visible:outline-none"
				>
					<span class="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-cyan-400 transition-all group-hover:opacity-90">
						Ensemblr
					</span>
					<span class="hidden sm:inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20">
						mixture-of-agents
					</span>
				</a>

				<!-- Desktop Navigation -->
				<nav class="hidden items-center gap-2 md:flex">
					{#each navItems as item (item.href)}
						<a
							class={cn(
								'rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none',
								isActive(item.href) 
									? 'bg-primary/10 text-primary border border-primary/25 shadow-sm shadow-primary/5' 
									: 'text-muted-foreground/80 hover:bg-muted hover:text-foreground border border-transparent'
							)}
							aria-current={isActive(item.href) ? 'page' : undefined}
							href={item.href}
						>
							{item.label}
						</a>
					{/each}
					
					<div class="h-4 w-px bg-border/40 mx-2"></div>

					<!-- Dark Mode Toggle -->
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onclick={toggleMode}
						aria-label="Toggle dark mode"
						class="rounded-xl size-9 text-muted-foreground hover:text-foreground active:scale-95 transition-all duration-200"
					>
						<Sun class="size-[1.1rem] transition-all dark:hidden" />
						<Moon class="hidden size-[1.1rem] transition-all dark:block" />
					</Button>

					<!-- Sign Out -->
					<form method="POST" action={resolve('/logout')} class="ml-1">
						<Button 
							type="submit" 
							variant="outline" 
							size="sm"
							class="rounded-xl font-medium border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 active:scale-95 transition-all"
						>
							Sign out
						</Button>
					</form>
				</nav>

				<!-- Mobile Navigation Trigger -->
				<div class="flex items-center gap-1 md:hidden">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onclick={toggleMode}
						aria-label="Toggle dark mode"
						class="rounded-xl size-9 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
					>
						<Sun class="size-[1.1rem] transition-all dark:hidden" />
						<Moon class="hidden size-[1.1rem] transition-all dark:block" />
					</Button>
					
					<Sheet.Root bind:open={mobileMenuOpen}>
						<Sheet.Trigger
							class={cn(
								buttonVariants({ variant: 'outline', size: 'icon' }),
								'rounded-xl border-border/50 active:scale-95 transition-all'
							)}
							aria-label="Open navigation"
						>
							<Menu class="size-4" />
						</Sheet.Trigger>
						<Sheet.Content class="w-[20rem] max-w-[calc(100vw-2rem)] border-l border-border/25 bg-card/95 backdrop-blur-2xl p-0 flex flex-col" side="right">
							<Sheet.Header class="border-b border-border/20 px-6 py-5">
								<Sheet.Title class="text-left font-black text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-cyan-400">
									Ensemblr
								</Sheet.Title>
							</Sheet.Header>
							<nav class="grid gap-1 px-4 py-6">
								{#each navItems as item (item.href)}
									{@const Icon = item.icon}
									<a
										class={cn(
											'flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-200',
											isActive(item.href)
												? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
												: 'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
										)}
										aria-current={isActive(item.href) ? 'page' : undefined}
										href={item.href}
										onclick={() => (mobileMenuOpen = false)}
									>
										<Icon class="size-4 shrink-0" />
										<span>{item.label}</span>
									</a>
								{/each}
							</nav>
							<div class="mt-auto border-t border-border/25 p-4 bg-muted/30">
								<form method="POST" action={resolve('/logout')}>
									<Button 
										class="w-full justify-center gap-2 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/15 transition-all" 
										type="submit" 
										variant="ghost"
									>
										<LogOut class="size-4" />
										<span>Sign out</span>
									</Button>
								</form>
							</div>
						</Sheet.Content>
					</Sheet.Root>
				</div>
			</div>
		</header>
	{/if}

	<div class="flex-1 flex flex-col min-h-0 w-full">
		{@render children()}
	</div>
</div>

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}>{locale}</a>
	{/each}
</div>
