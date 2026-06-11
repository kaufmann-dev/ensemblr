export type MarkdownNode =
	| MarkdownRoot
	| MarkdownText
	| MarkdownParent
	| MarkdownHeading
	| MarkdownList
	| MarkdownCode
	| MarkdownLink;

export type MarkdownChild = Exclude<MarkdownNode, MarkdownRoot>;

export interface MarkdownRoot {
	type: 'root';
	key: string;
	children: MarkdownChild[];
}

export interface MarkdownText {
	type: 'text' | 'inlineCode';
	key: string;
	value: string;
}

export interface MarkdownParent {
	type:
		| 'paragraph'
		| 'emphasis'
		| 'strong'
		| 'delete'
		| 'blockquote'
		| 'listItem'
		| 'thematicBreak'
		| 'table'
		| 'tableRow'
		| 'tableCell';
	key: string;
	children: MarkdownChild[];
}

export interface MarkdownHeading {
	type: 'heading';
	key: string;
	depth: 1 | 2 | 3 | 4 | 5 | 6;
	children: MarkdownChild[];
}

export interface MarkdownList {
	type: 'list';
	key: string;
	ordered: boolean;
	start: number | null;
	children: MarkdownChild[];
}

export interface MarkdownCode {
	type: 'code';
	key: string;
	value: string;
	lang: string | null;
}

export interface MarkdownLink {
	type: 'link';
	key: string;
	url: string;
	external: boolean;
	children: MarkdownChild[];
}
