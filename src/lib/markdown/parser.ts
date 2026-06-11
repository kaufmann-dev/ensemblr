import type { Nodes, Parent, Root } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import type {
	MarkdownChild,
	MarkdownCode,
	MarkdownHeading,
	MarkdownLink,
	MarkdownList,
	MarkdownNode,
	MarkdownParent,
	MarkdownRoot,
	MarkdownText
} from './types';

const parser = unified().use(remarkParse).use(remarkGfm);

function safeLink(url: string): { url: string; external: boolean } | null {
	if (url.startsWith('#')) return { url, external: false };
	if (url.startsWith('/') && !url.startsWith('//')) return { url, external: false };

	try {
		const parsed = new URL(url);
		if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
			return { url, external: true };
		}
		if (parsed.protocol === 'mailto:') return { url, external: false };
	} catch {
		return null;
	}

	return null;
}

function isFencedCode(node: Nodes, source: string) {
	const offset = node.position?.start.offset;
	if (offset === undefined) return false;
	return /^(?: {0,3})(?:`{3,}|~{3,})/.test(source.slice(offset));
}

function supportedPlainText(node: Nodes): string {
	switch (node.type) {
		case 'text':
		case 'inlineCode':
			return node.value;
		case 'emphasis':
		case 'strong':
		case 'delete':
			return node.children.map(supportedPlainText).join('');
		default:
			return '';
	}
}

function childrenOf(node: Parent, source: string, nextKey: () => string): MarkdownChild[] {
	return node.children.flatMap((child) => {
		const sanitized = sanitizeNode(child, source, nextKey);
		return sanitized && sanitized.type !== 'root' ? [sanitized] : [];
	});
}

function sanitizeNode(node: Nodes, source: string, nextKey: () => string): MarkdownNode | null {
	const key = nextKey();

	switch (node.type) {
		case 'root':
			return {
				type: 'root',
				key,
				children: childrenOf(node, source, nextKey)
			} satisfies MarkdownRoot;
		case 'text':
		case 'inlineCode':
			return { type: node.type, key, value: node.value } satisfies MarkdownText;
		case 'paragraph':
		case 'emphasis':
		case 'strong':
		case 'delete':
		case 'blockquote':
		case 'listItem':
		case 'table':
		case 'tableRow':
		case 'tableCell':
			return {
				type: node.type,
				key,
				children: childrenOf(node, source, nextKey)
			} satisfies MarkdownParent;
		case 'heading':
			return {
				type: 'heading',
				key,
				depth: node.depth,
				children: childrenOf(node, source, nextKey)
			} satisfies MarkdownHeading;
		case 'list':
			return {
				type: 'list',
				key,
				ordered: node.ordered === true,
				start: node.ordered === true && typeof node.start === 'number' ? node.start : null,
				children: childrenOf(node, source, nextKey)
			} satisfies MarkdownList;
		case 'code':
			if (!isFencedCode(node, source)) return null;
			return {
				type: 'code',
				key,
				value: node.value,
				lang: node.lang ?? null
			} satisfies MarkdownCode;
		case 'thematicBreak':
			return { type: 'thematicBreak', key, children: [] } satisfies MarkdownParent;
		case 'link': {
			const link = safeLink(node.url);
			if (!link) {
				return {
					type: 'text',
					key,
					value: node.children.map(supportedPlainText).join('')
				} satisfies MarkdownText;
			}
			return {
				type: 'link',
				key,
				url: link.url,
				external: link.external,
				children: childrenOf(node, source, nextKey)
			} satisfies MarkdownLink;
		}
		default:
			return null;
	}
}

export function parseMarkdown(source: string): MarkdownRoot {
	const tree = parser.parse(source) as Root;
	return sanitizeMarkdownTree(tree, source);
}

export function sanitizeMarkdownTree(tree: Root, source: string): MarkdownRoot {
	let key = 0;
	const sanitized = sanitizeNode(tree, source, () => String(key++));
	if (!sanitized || sanitized.type !== 'root')
		throw new Error('Markdown parser did not return a root');
	return sanitized;
}
