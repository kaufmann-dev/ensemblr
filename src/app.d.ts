import type { Session } from 'better-auth';

type Role = 'admin' | 'demo' | 'user';
type User = {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	image?: string | null;
	role: Role;
	createdAt: Date;
	updatedAt: Date;
};

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user?: User;
			session?: Session;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
