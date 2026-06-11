<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import GenerationStatus from '$lib/components/GenerationStatus.svelte';
	import { getHistoryContext } from '$lib/history/history.svelte';
	import { setMode, userPrefersMode } from 'mode-watcher';
	import {
		ChevronsUpDown,
		History,
		Key,
		Loader2,
		LogOut,
		Monitor,
		Moon,
		Shield,
		SquarePen,
		Sun
	} from '@lucide/svelte';

	let {
		user
	}: {
		user: { name: string; email: string; role: string };
	} = $props();

	const history = getHistoryContext();
	const sidebar = Sidebar.useSidebar();

	let logoutForm = $state<HTMLFormElement | null>(null);

	let navItems = $derived([
		{ href: resolve('/history'), label: 'History', icon: History },
		{ href: resolve('/settings'), label: 'API keys', icon: Key },
		...(user.role === 'admin' ? [{ href: resolve('/admin'), label: 'Admin', icon: Shield }] : [])
	]);

	function closeMobile() {
		if (sidebar.isMobile) sidebar.setOpenMobile(false);
	}

	function newGeneration() {
		closeMobile();
		if (page.url.pathname === resolve('/')) {
			history.requestNewGeneration();
		} else {
			void goto(resolve('/'));
		}
	}

	function onHistoryScroll(event: Event) {
		const element = event.currentTarget as HTMLElement;
		if (element.scrollHeight - element.scrollTop - element.clientHeight < 200) {
			void history.loadMore();
		}
	}

	// Keep sidebar statuses live for running generations, even after
	// leaving the workspace, by subscribing to their event streams.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const sources = new Map<string, EventSource>();

	function finish(id: string, status: 'completed' | 'failed') {
		history.setStatus(id, status);
		sources.get(id)?.close();
		sources.delete(id);
	}

	$effect(() => {
		const ids = new Set(history.runningIds);
		for (const [id, source] of sources) {
			if (!ids.has(id)) {
				source.close();
				sources.delete(id);
			}
		}
		for (const id of ids) {
			if (sources.has(id)) continue;
			const source = new EventSource(resolve(`/api/generations/${id}/events`));
			sources.set(id, source);
			source.onmessage = (message) => {
				const event = JSON.parse(message.data);
				if (event.type === 'final') {
					finish(id, 'completed');
				} else if (event.type === 'error' && !event.outputId) {
					finish(id, 'failed');
				} else if (event.type === 'snapshot' && event.generation.status !== 'running') {
					finish(id, event.generation.status);
				}
			};
		}
	});

	$effect(() => {
		return () => {
			for (const source of sources.values()) source.close();
			sources.clear();
		};
	});
</script>

<Sidebar.Root collapsible="icon">
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg" class="pointer-events-none">
					{#snippet child({ props })}
						<div {...props}>
							<div
								class="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
							>
								<span class="text-sm font-bold">e</span>
							</div>
							<div class="grid leading-tight">
								<span class="font-semibold">ensemblr</span>
								<span class="text-xs text-muted-foreground">Mixture of agents</span>
							</div>
						</div>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton
					onclick={newGeneration}
					tooltipContent="New generation"
					class="bg-primary text-primary-foreground hover:bg-primary/85 hover:text-primary-foreground active:bg-primary/85 active:text-primary-foreground"
				>
					<SquarePen />
					<span>New generation</span>
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>

	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each navItems as item (item.href)}
						{@const Icon = item.icon}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								isActive={page.url.pathname === item.href}
								tooltipContent={item.label}
							>
								{#snippet child({ props })}
									<a href={item.href} onclick={closeMobile} {...props}>
										<Icon />
										<span>{item.label}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>

		<Sidebar.Group class="min-h-0 flex-1 group-data-[collapsible=icon]:hidden">
			<Sidebar.GroupLabel>Generations</Sidebar.GroupLabel>
			<Sidebar.GroupContent class="min-h-0 flex-1 overflow-y-auto" onscroll={onHistoryScroll}>
				<Sidebar.Menu>
					{#each history.entries as entry (entry.id)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								isActive={page.url.pathname === resolve(`/history/${entry.id}`)}
								class="h-auto"
							>
								{#snippet child({ props })}
									<a href={resolve(`/history/${entry.id}`)} onclick={closeMobile} {...props}>
										<span class="min-w-0 flex-1 truncate" title={entry.prompt}>{entry.prompt}</span>
										{#if entry.status !== 'completed'}
											<GenerationStatus status={entry.status} compact class="shrink-0" />
										{/if}
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{:else}
						<div class="px-2 py-4 text-xs text-muted-foreground">No generations yet.</div>
					{/each}
					{#if history.loadingMore}
						<div class="flex items-center justify-center py-2 text-muted-foreground">
							<Loader2 class="size-4 animate-spin" />
							<span class="sr-only">Loading more generations</span>
						</div>
					{/if}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>

	<Sidebar.Footer>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton
								size="lg"
								class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								{...props}
							>
								<div
									class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground uppercase"
								>
									{user.name.slice(0, 1)}
								</div>
								<div class="grid min-w-0 leading-tight">
									<span class="truncate font-medium">{user.name}</span>
									<span class="truncate text-xs text-muted-foreground">{user.email}</span>
								</div>
								<ChevronsUpDown class="ml-auto size-4" />
							</Sidebar.MenuButton>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content
						side={sidebar.isMobile ? 'bottom' : 'right'}
						align="end"
						class="w-(--bits-dropdown-menu-anchor-width) min-w-56"
					>
						<DropdownMenu.Label class="font-normal">
							<div class="grid leading-tight">
								<span class="truncate font-medium">{user.name}</span>
								<span class="truncate text-xs text-muted-foreground">{user.email}</span>
							</div>
						</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.RadioGroup
							value={userPrefersMode.current}
							onValueChange={(value) => setMode(value as 'light' | 'dark' | 'system')}
						>
							<DropdownMenu.GroupHeading class="text-xs text-muted-foreground">
								Theme
							</DropdownMenu.GroupHeading>
							<DropdownMenu.RadioItem value="light" closeOnSelect={false}>
								<Sun class="mr-1 size-4" /> Light
							</DropdownMenu.RadioItem>
							<DropdownMenu.RadioItem value="dark" closeOnSelect={false}>
								<Moon class="mr-1 size-4" /> Dark
							</DropdownMenu.RadioItem>
							<DropdownMenu.RadioItem value="system" closeOnSelect={false}>
								<Monitor class="mr-1 size-4" /> System
							</DropdownMenu.RadioItem>
						</DropdownMenu.RadioGroup>
						<DropdownMenu.Separator />
						<DropdownMenu.Group>
							<DropdownMenu.Item>
								{#snippet child({ props })}
									<a
										href="https://legal.kaufmann.dev/privacy?site=ensemblr.kaufmann.dev"
										rel="noreferrer"
										{...props}
									>
										Privacy
									</a>
								{/snippet}
							</DropdownMenu.Item>
							<DropdownMenu.Item>
								{#snippet child({ props })}
									<a
										href="https://legal.kaufmann.dev/imprint?site=ensemblr.kaufmann.dev"
										rel="noreferrer"
										{...props}
									>
										Imprint
									</a>
								{/snippet}
							</DropdownMenu.Item>
						</DropdownMenu.Group>
						<DropdownMenu.Separator />
						<DropdownMenu.Item onSelect={() => logoutForm?.requestSubmit()}>
							<LogOut class="size-4" /> Sign out
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
				<form method="POST" action={resolve('/logout')} bind:this={logoutForm} class="hidden">
					<button type="submit">Sign out</button>
				</form>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>

	<Sidebar.Rail />
</Sidebar.Root>
