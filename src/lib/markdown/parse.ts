import type {
	BlockContent,
	Blockquote,
	Break,
	Code,
	Delete,
	Emphasis,
	Heading,
	InlineCode,
	Link,
	List,
	ListItem,
	Paragraph,
	PhrasingContent,
	Root,
	RootContent,
	Strong,
	Table,
	TableCell,
	TableRow,
	Text,
	ThematicBreak
} from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

/**
 * Markdown nodes the renderer knows how to display. Everything else —
 * raw HTML, images, footnotes, embedded content — is discarded during
 * sanitization so the renderer never has to handle unsafe input.
 */
export type SafeNode =
	| Blockquote
	| Break
	| Code
	| Delete
	| Emphasis
	| Heading
	| InlineCode
	| Link
	| List
	| ListItem
	| Paragraph
	| Strong
	| Table
	| TableCell
	| TableRow
	| Text
	| ThematicBreak;

const processor = unified().use(remarkParse).use(remarkGfm);

const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:'];

export function isSafeUrl(url: string): boolean {
	const trimmed = url.trim();
	if (trimmed === '') return false;
	// Root-relative paths and same-page fragments are always safe.
	if (/^(\/(?!\/)|#)/.test(trimmed)) return true;
	try {
		const parsed = new URL(trimmed);
		return SAFE_PROTOCOLS.includes(parsed.protocol.toLowerCase());
	} catch {
		// Relative URLs other than root-relative (e.g. "foo/bar") and
		// malformed values are rejected.
		return false;
	}
}

function sanitizePhrasing(nodes: PhrasingContent[]): PhrasingContent[] {
	const result: PhrasingContent[] = [];
	for (const node of nodes) {
		switch (node.type) {
			case 'text':
			case 'inlineCode':
			case 'break':
				result.push(node);
				break;
			case 'emphasis':
			case 'strong':
			case 'delete':
				result.push({ ...node, children: sanitizePhrasing(node.children) });
				break;
			case 'link':
				if (isSafeUrl(node.url)) {
					result.push({ ...node, children: sanitizePhrasing(node.children) });
				} else {
					// Keep the link text so no content is silently lost.
					result.push(...sanitizePhrasing(node.children));
				}
				break;
			default:
				// html, images, footnotes, link/image references, etc. are dropped.
				break;
		}
	}
	return result;
}

function sanitizeBlocks(nodes: RootContent[]): RootContent[] {
	const result: RootContent[] = [];
	for (const node of nodes) {
		switch (node.type) {
			case 'paragraph':
			case 'heading':
				result.push({ ...node, children: sanitizePhrasing(node.children) });
				break;
			case 'blockquote':
				result.push({
					...node,
					children: sanitizeBlocks(node.children) as Blockquote['children']
				});
				break;
			case 'list':
				result.push({
					...node,
					children: node.children.map((item) => ({
						...item,
						children: sanitizeBlocks(item.children) as BlockContent[]
					}))
				});
				break;
			case 'table':
				result.push({
					...node,
					children: node.children.map((row) => ({
						...row,
						children: row.children.map((cell) => ({
							...cell,
							children: sanitizePhrasing(cell.children)
						}))
					}))
				});
				break;
			case 'code':
			case 'thematicBreak':
				result.push(node);
				break;
			default:
				// html and other unsupported block nodes are dropped.
				break;
		}
	}
	return result;
}

/**
 * Parse Markdown into a sanitized mdast tree containing only allowlisted
 * nodes with safe link protocols. Returns undefined if parsing fails, so
 * callers can fall back to plain-text rendering.
 */
export function parseMarkdown(markdown: string): Root | undefined {
	try {
		const tree = processor.parse(markdown) as Root;
		return { ...tree, children: sanitizeBlocks(tree.children) };
	} catch {
		return undefined;
	}
}
