import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { visibleGenerationsFor } from './generation-access';

const dialect = new PgDialect();

function render(condition: ReturnType<typeof visibleGenerationsFor>) {
	if (!condition) throw new Error('expected a SQL condition');
	return dialect.sqlToQuery(condition);
}

describe('visibleGenerationsFor', () => {
	it('scopes demo users to their own generations within the current session', () => {
		const query = render(visibleGenerationsFor({ id: 'demo-user', role: 'demo' }, 'session-1'));
		expect(query.sql).toContain('"user_id"');
		expect(query.sql).toContain('"demo_session_id"');
		expect(query.params).toEqual(['demo-user', 'session-1']);
	});

	it('scopes regular users to all of their own generations regardless of session', () => {
		const query = render(visibleGenerationsFor({ id: 'user-1', role: 'user' }, 'session-1'));
		expect(query.sql).toContain('"user_id"');
		expect(query.sql).not.toContain('"demo_session_id"');
		expect(query.params).toEqual(['user-1']);
	});
});
