import assert from 'node:assert/strict';
import test from 'node:test';
import type { Root } from 'mdast';
import { parseMarkdown, sanitizeMarkdownTree } from './parser.ts';
import type { MarkdownNode } from './types.ts';

function nodesOfType(root: MarkdownNode, type: MarkdownNode['type']): MarkdownNode[] {
	const matches = root.type === type ? [root] : [];
	if ('children' in root) {
		for (const child of root.children) matches.push(...nodesOfType(child, type));
	}
	return matches;
}

test('keeps the supported Markdown node set', () => {
	const tree = parseMarkdown(`# Heading

Paragraph with *emphasis*, **strong**, ~~deleted~~, \`inline\`, and [link](https://example.com).

> quote

1. ordered
2. list

- unordered

\`\`\`ts
const value = true;
\`\`\`

---`);

	for (const type of [
		'heading',
		'paragraph',
		'emphasis',
		'strong',
		'delete',
		'inlineCode',
		'link',
		'blockquote',
		'list',
		'listItem',
		'code',
		'thematicBreak'
	] as const) {
		assert.ok(nodesOfType(tree, type).length > 0, `expected ${type}`);
	}
});

test('keeps GFM tables', () => {
	const tree = parseMarkdown('| A | B |\n| - | - |\n| 1 | 2 |');
	assert.equal(nodesOfType(tree, 'table').length, 1);
	assert.equal(nodesOfType(tree, 'tableRow').length, 2);
	assert.equal(nodesOfType(tree, 'tableCell').length, 4);
});

test('allows only approved link forms and flattens rejected links to text', () => {
	const tree = parseMarkdown(
		'[http](http://example.com) [https](https://example.com) [mail](mailto:test@example.com) [root](/safe) [fragment](#safe) [protocol-relative](//example.com) [relative](relative/path) [data](data:text/html,x) [script](javascript:alert(1)) [unsafe html](javascript:<b>hidden</b>)'
	);
	const links = nodesOfType(tree, 'link');
	assert.deepEqual(
		links.map((node) => (node.type === 'link' ? [node.url, node.external] : null)),
		[
			['http://example.com', true],
			['https://example.com', true],
			['mailto:test@example.com', false],
			['/safe', false],
			['#safe', false]
		]
	);
	assert.match(JSON.stringify(tree), /protocol-relative/);
	assert.match(JSON.stringify(tree), /relative/);
	assert.match(JSON.stringify(tree), /data/);
	assert.match(JSON.stringify(tree), /script/);
	assert.doesNotMatch(JSON.stringify(tree), /javascript:/);
	assert.doesNotMatch(JSON.stringify(tree), /hidden|<b>/);
});

test('discards unsupported nodes and their children', () => {
	const tree = parseMarkdown(
		'<script>alert("raw")</script>\n\n<iframe>embedded</iframe>\n\n![image alt](https://example.com/image.png)\n\n[^note]\n\n[^note]: hidden'
	);
	const serialized = JSON.stringify(tree);
	assert.doesNotMatch(serialized, /raw|embedded|image alt|hidden|https:\/\/example.com\/image.png/);
});

test('discards unknown nodes and their children', () => {
	const tree = sanitizeMarkdownTree(
		{
			type: 'root',
			children: [
				{ type: 'paragraph', children: [{ type: 'text', value: 'kept' }] },
				{
					type: 'unknown',
					children: [{ type: 'text', value: 'discarded' }]
				}
			]
		} as Root,
		''
	);
	const serialized = JSON.stringify(tree);
	assert.match(serialized, /kept/);
	assert.doesNotMatch(serialized, /discarded|unknown/);
});

test('discards indented code but keeps partial fenced Markdown as text', () => {
	const tree = parseMarkdown('    indented code\n\n```ts\npartial');
	assert.equal(nodesOfType(tree, 'code').length, 1);
	assert.match(JSON.stringify(tree), /partial/);
	assert.doesNotMatch(JSON.stringify(tree), /indented code/);
});

test('parses malformed and partially streamed Markdown without throwing', () => {
	assert.doesNotThrow(() => parseMarkdown('**unfinished [link](https://example.com'));
	assert.doesNotThrow(() => parseMarkdown('| partial | table |\n| ---'));
});
