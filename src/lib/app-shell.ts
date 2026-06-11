import { createContext } from 'svelte';

export type AppRouteId = 'workspace' | 'history' | 'settings' | 'admin';
export type AppUserRole = 'admin' | 'demo' | 'user' | string;

export type AppNavItem = {
	id: AppRouteId;
	label: string;
	href: string;
	adminOnly?: boolean;
};

export type NewGenerationIntent = 'reset-workspace' | 'navigate-workspace';

const APP_NAV_ITEMS: AppNavItem[] = [
	{ id: 'workspace', label: 'Workspace', href: '/' },
	{ id: 'history', label: 'History', href: '/history' },
	{ id: 'settings', label: 'API Keys', href: '/settings' },
	{ id: 'admin', label: 'Admin', href: '/admin', adminOnly: true }
];

export function getAppNavItems(role: AppUserRole): AppNavItem[] {
	return APP_NAV_ITEMS.filter((item) => !item.adminOnly || role === 'admin');
}

export function isActiveNavigation(pathname: string, href: string): boolean {
	if (href === '/') return pathname === '/';
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function getNewGenerationIntent(pathname: string): NewGenerationIntent {
	return pathname === '/' ? 'reset-workspace' : 'navigate-workspace';
}

export class AppShellState {
	#workspaceReset: (() => void) | undefined;

	registerWorkspaceReset(handler: () => void) {
		this.#workspaceReset = handler;
		return () => {
			if (this.#workspaceReset === handler) this.#workspaceReset = undefined;
		};
	}

	resetWorkspace() {
		this.#workspaceReset?.();
	}
}

const [getAppShell, setAppShell] = createContext<AppShellState>();

export function setAppShellContext() {
	return setAppShell(new AppShellState());
}

export function getAppShellContext() {
	return getAppShell();
}
