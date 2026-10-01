import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { account, user } from '#lib/server/db/schema.js';
import { OIDC_PROVIDER_ID } from '#lib/oidc-policy.js';

const FIRST_ADMIN_LOCK = 'ensemblr:first-oidc-admin';

/** Attach the first OIDC identity to the single pre-existing administrator, if there is one. */
export async function bindFirstOidcAdmin(subject: string) {
	await db.transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${FIRST_ADMIN_LOCK}))`);

		const [existingIdentity] = await tx
			.select({ id: account.id })
			.from(account)
			.where(and(eq(account.providerId, OIDC_PROVIDER_ID), eq(account.accountId, subject)))
			.limit(1);
		if (existingIdentity) return;

		const [existingOidcAccount] = await tx
			.select({ id: account.id })
			.from(account)
			.where(eq(account.providerId, OIDC_PROVIDER_ID))
			.limit(1);
		if (existingOidcAccount) return;

		const admins = await tx
			.select({ id: user.id })
			.from(user)
			.where(eq(user.role, 'admin'))
			.limit(2);
		if (admins.length !== 1) return;

		const now = new Date();
		await tx.insert(account).values({
			id: randomUUID(),
			accountId: subject,
			providerId: OIDC_PROVIDER_ID,
			userId: admins[0].id,
			createdAt: now,
			updatedAt: now
		});
	});
}
