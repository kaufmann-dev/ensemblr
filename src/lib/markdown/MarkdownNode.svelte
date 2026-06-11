<script lang="ts">
	import type { RootContent } from 'mdast';
	import MarkdownNode from './MarkdownNode.svelte';

	let { node }: { node: RootContent } = $props();
</script>

{#if node.type === 'text'}
	{node.value}
{:else if node.type === 'paragraph'}
	<p>
		{#each node.children as child, index (index)}
			<MarkdownNode node={child} />
		{/each}
	</p>
{:else if node.type === 'heading'}
	<svelte:element this={`h${node.depth}`}>
		{#each node.children as child, index (index)}
			<MarkdownNode node={child} />
		{/each}
	</svelte:element>
{:else if node.type === 'emphasis'}
	<em>
		{#each node.children as child, index (index)}
			<MarkdownNode node={child} />
		{/each}
	</em>
{:else if node.type === 'strong'}
	<strong>
		{#each node.children as child, index (index)}
			<MarkdownNode node={child} />
		{/each}
	</strong>
{:else if node.type === 'delete'}
	<del>
		{#each node.children as child, index (index)}
			<MarkdownNode node={child} />
		{/each}
	</del>
{:else if node.type === 'inlineCode'}
	<code>{node.value}</code>
{:else if node.type === 'break'}
	<br />
{:else if node.type === 'link'}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- sanitized external Markdown link -->
	<a href={node.url} rel="noreferrer nofollow">
		{#each node.children as child, index (index)}
			<MarkdownNode node={child} />
		{/each}
	</a>
{:else if node.type === 'blockquote'}
	<blockquote>
		{#each node.children as child, index (index)}
			<MarkdownNode node={child} />
		{/each}
	</blockquote>
{:else if node.type === 'list'}
	{#if node.ordered}
		<ol start={node.start ?? 1}>
			{#each node.children as item, index (index)}
				<li>
					{#each item.children as child, childIndex (childIndex)}
						<MarkdownNode node={child} />
					{/each}
				</li>
			{/each}
		</ol>
	{:else}
		<ul>
			{#each node.children as item, index (index)}
				<li>
					{#each item.children as child, childIndex (childIndex)}
						<MarkdownNode node={child} />
					{/each}
				</li>
			{/each}
		</ul>
	{/if}
{:else if node.type === 'code'}
	<pre><code>{node.value}</code></pre>
{:else if node.type === 'thematicBreak'}
	<hr />
{:else if node.type === 'table'}
	{@const [head, ...rows] = node.children}
	<div class="table-wrapper">
		<table>
			{#if head}
				<thead>
					<tr>
						{#each head.children as cell, cellIndex (cellIndex)}
							<th style:text-align={node.align?.[cellIndex] ?? undefined}>
								{#each cell.children as child, index (index)}
									<MarkdownNode node={child} />
								{/each}
							</th>
						{/each}
					</tr>
				</thead>
			{/if}
			<tbody>
				{#each rows as row, rowIndex (rowIndex)}
					<tr>
						{#each row.children as cell, cellIndex (cellIndex)}
							<td style:text-align={node.align?.[cellIndex] ?? undefined}>
								{#each cell.children as child, index (index)}
									<MarkdownNode node={child} />
								{/each}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
