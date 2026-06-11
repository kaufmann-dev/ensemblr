import { describe, expect, it } from 'vitest';
import type { Link, List, Paragraph, Root, Table } from 'mdast';
import { isSafeUrl, parseMarkdown } from './parse';

function types(tree: Root | undefined) {
	return tree?.children.map((node) => node.type) ?? [];
}

function collectTypes(node: { type: string; children?: unknown[] }): string[] {
	const children = (node.children ?? []) as { type: string; children?: unknown[] }[];
	return [node.type, ...children.flatMap(collectTypes)];
}

describe('parseMarkdown', () => {
	it('keeps allowlisted block and inline nodes', () => {
		const tree = parseMarkdown(
			[
				'# Heading',
				'',
				'Some *emphasis*, **strong**, ~~deleted~~, `code` and a [link](https://example.com).',
				'',
				'> quote',
				'',
				'- item one',
				'- item two',
				'',
				'1. first',
				'',
				'```js',
				'const x = 1;',
				'```',
				'',
				'---',
				'',
				'| a | b |',
				'| - | - |',
				'| 1 | 2 |'
			].join('\n')
		);

		expect(types(tree)).toEqual([
			'heading',
			'paragraph',
			'blockquote',
			'list',
			'list',
			'code',
			'thematicBreak',
			'table'
		]);

		const paragraph = tree?.children[1] as Paragraph;
		const inlineTypes = paragraph.children.map((node) => node.type);
		expect(inlineTypes).toContain('emphasis');
		expect(inlineTypes).toContain('strong');
		expect(inlineTypes).toContain('delete');
		expect(inlineTypes).toContain('inlineCode');
		expect(inlineTypes).toContain('link');
	});

	it('parses GFM tables with rows and cells', () => {
		const tree = parseMarkdown('| a | b |\n| - | - |\n| 1 | 2 |');
		const table = tree?.children[0] as Table;
		expect(table.type).toBe('table');
		expect(table.children).toHaveLength(2);
		expect(table.children[0].children).toHaveLength(2);
	});

	it('drops raw HTML blocks and inline HTML', () => {
		const tree = parseMarkdown('<scr' + 'ipt>alert(1)</scr' + 'ipt>\n\nbefore <b>bold</b> after');
		const flat = (tree?.children ?? []).flatMap((node) => collectTypes(node));
		expect(flat).not.toContain('html');
	});

	it('drops images and embedded content', () => {
		const tree = parseMarkdown('![alt](https://example.com/x.png)\n\n<iframe src="x"></iframe>');
		const flat = (tree?.children ?? []).flatMap((node) => collectTypes(node));
		expect(flat).not.toContain('image');
		expect(flat).not.toContain('html');
	});

	it('removes links with unsafe protocols but keeps their text', () => {
		const tree = parseMarkdown('[click](javascript:alert(1)) and [ok](https://example.com)');
		const paragraph = tree?.children[0] as Paragraph;
		const links = paragraph.children.filter((node) => node.type === 'link') as Link[];
		expect(links).toHaveLength(1);
		expect(links[0].url).toBe('https://example.com');
		const text = paragraph.children
			.filter((node) => node.type === 'text')
			.map((node) => node.value)
			.join('');
		expect(text).toContain('click');
	});

	it('sanitizes links nested inside lists and blockquotes', () => {
		const tree = parseMarkdown('- [bad](data:text/html,x)\n\n> [vb](vbscript:x)');
		const flat = (tree?.children ?? []).flatMap((node) => collectTypes(node));
		expect(flat).not.toContain('link');
	});

	it('renders partial Markdown without throwing', () => {
		const tree = parseMarkdown('# Head\n\nSome **unclosed strong and a [half link](htt');
		expect(tree).toBeDefined();
		expect(types(tree)).toContain('heading');
	});

	it('handles malformed syntax gracefully', () => {
		const tree = parseMarkdown('|||\n|--\n> > > ```\n***___');
		expect(tree).toBeDefined();
	});

	it('preserves ordered list start numbers', () => {
		const tree = parseMarkdown('3. third\n4. fourth');
		const list = tree?.children[0] as List;
		expect(list.ordered).toBe(true);
		expect(list.start).toBe(3);
	});
});

describe('isSafeUrl', () => {
	it('allows http, https, mailto, root-relative, and fragment links', () => {
		expect(isSafeUrl('http://example.com')).toBe(true);
		expect(isSafeUrl('https://example.com/a?b=c')).toBe(true);
		expect(isSafeUrl('mailto:user@example.com')).toBe(true);
		expect(isSafeUrl('/history')).toBe(true);
		expect(isSafeUrl('#section')).toBe(true);
	});

	it('rejects unsafe and ambiguous URLs', () => {
		expect(isSafeUrl('javascript:alert(1)')).toBe(false);
		expect(isSafeUrl('JAVASCRIPT:alert(1)')).toBe(false);
		expect(isSafeUrl('data:text/html,<script>x</script>')).toBe(false);
		expect(isSafeUrl('vbscript:x')).toBe(false);
		expect(isSafeUrl('file:///etc/passwd')).toBe(false);
		expect(isSafeUrl('//evil.com')).toBe(false);
		expect(isSafeUrl('relative/path')).toBe(false);
		expect(isSafeUrl('')).toBe(false);
		expect(isSafeUrl('  javascript:alert(1)  ')).toBe(false);
	});
});
