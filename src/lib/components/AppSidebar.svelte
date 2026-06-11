<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Pathname } from '$app/types';
	import {
		getAppNavItems,
		getAppShellContext,
		getNewGenerationIntent,
		isActiveNavigation,
		type AppRouteId
	} from '$lib/app-shell';
	import SidebarHistory from '$lib/components/SidebarHistory.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { cn } from '$lib/utils';
	import {
		History,
		Key,
		LogOut,
		Moon,
		Plus,
		Settings,
		Shield,
		Sparkles,
		Sun
	} from '@lucide/svelte';
	import { toggleMode } from 'mode-watcher';

	type SidebarUser = {
		role: string;
	};

	let { user }: { user: SidebarUser } = $props();

	const appShell = getAppShellContext();
	const sidebar = Sidebar.useSidebar();
	const navIcons = {
		workspace: Settings,
		history: History,
		settings: Key,
		admin: Shield
	};

	let navItems = $derived(
		getAppNavItems(user.role).map((item) => ({
			...item,
			icon: navIcons[item.id as AppRouteId]
		}))
	);

	function closeMobileSidebar() {
		if (sidebar.isMobile) sidebar.setOpenMobile(false);
	}

	async function handleNewGeneration() {
		closeMobileSidebar();
		if (getNewGenerationIntent(page.url.pathname) === 'reset-workspace') {
			appShell.resetWorkspace();
			return;
		}

		await goto(resolve('/'));
	}
</script>

<Sidebar.Root collapsible="icon" class="border-sidebar-border bg-sidebar">
	<Sidebar.Header class="border-b border-sidebar-border">
		<a
			href={resolve('/')}
			class="flex h-10 items-center gap-2 rounded px-2 text-sidebar-foreground transition-colors group-data-[collapsible=icon]:justify-center hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
			onclick={closeMobileSidebar}
			aria-label="Open workspace"
		>
			<Sparkles class="size-4 shrink-0" />
			<span class="min-w-0 group-data-[collapsible=icon]:hidden">
				<span class="block truncate font-mono text-[16px] font-bold tracking-tighter">ensemblr</span
				>
				<span
					class="mt-0.5 inline-flex items-center rounded border border-sidebar-border bg-sidebar-accent/60 px-1.5 py-0.5 font-mono text-[9px] font-medium tracking-wider text-muted-foreground uppercase"
				>
					mixture-of-agents
				</span>
			</span>
		</a>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton
					size="lg"
					tooltipContent="New generation"
					class="border border-sidebar-border bg-foreground text-background hover:bg-foreground/90 hover:text-background active:bg-foreground/90 active:text-background"
				>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							onclick={handleNewGeneration}
							aria-label="New generation"
						>
							<Plus class="size-4" />
							<span>New generation</span>
						</button>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>

	<Sidebar.Content class="gap-0 overflow-hidden">
		<Sidebar.Group>
			<Sidebar.GroupLabel class="px-2">Navigation</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each navItems as item (item.href)}
						{@const Icon = item.icon}
						{@const resolvedHref = resolve(item.href as Pathname)}
						{@const active = isActiveNavigation(page.url.pathname, resolvedHref)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={active} tooltipContent={item.label}>
								{#snippet child({ props })}
									<a
										{...props}
										href={resolve(item.href as Pathname)}
										aria-current={active ? 'page' : undefined}
										onclick={closeMobileSidebar}
									>
										<Icon class="size-4" />
										<span>{item.label}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>

		<Sidebar.Separator class="mx-2 w-auto bg-sidebar-border" />
		<SidebarHistory />
	</Sidebar.Content>

	<Sidebar.Footer class="border-t border-sidebar-border bg-sidebar">
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton tooltipContent="Toggle dark mode">
					{#snippet child({ props })}
						<button {...props} type="button" onclick={toggleMode} aria-label="Toggle dark mode">
							<Moon class="size-4 transition-all dark:hidden" />
							<Sun class="hidden size-4 transition-all dark:block" />
							<span>Theme</span>
						</button>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
			<Sidebar.MenuItem>
				<form
					class="w-full"
					method="POST"
					action={resolve('/logout')}
					onsubmit={closeMobileSidebar}
				>
					<Sidebar.MenuButton
						tooltipContent="Sign out"
						class={cn(
							'text-muted-foreground hover:bg-destructive/5 hover:text-destructive',
							'active:bg-destructive/5 active:text-destructive'
						)}
					>
						{#snippet child({ props })}
							<button {...props} type="submit" aria-label="Sign out">
								<LogOut class="size-4" />
								<span>Sign out</span>
							</button>
						{/snippet}
					</Sidebar.MenuButton>
				</form>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
