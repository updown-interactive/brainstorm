import { getVaultIndex, type IndexedFile } from '../../files/data/vault-index';
import type { KnowledgeNode, KnowledgeEdge, KnowledgeGraph } from '../types';
import { normalizeTagColor, normalizeTagName, readPropertyConfig } from '../../markdown/data/tag-registry';
import { todayString } from '../../markdown/engine/frontmatter';

export async function buildGraphData(rootPath: string): Promise<KnowledgeGraph> {
	const index = await getVaultIndex(rootPath);
	
	const propertyConfig = await readPropertyConfig(rootPath);
	const colorByTag = new Map(
		(propertyConfig.tags ?? []).map((tag) => [
			normalizeTagName(tag.name).toLocaleLowerCase(),
			normalizeTagColor(tag.color)
		])
	);

	const nodes: KnowledgeNode[] = [];
	const edges: KnowledgeEdge[] = [];
	const tagSet = new Set<string>();
	const aliasIndex = new Map<string, string>();
	const pathIndex = new Map<string, string>();
	const basenameIndex = new Map<string, string[]>();

	for (const file of index.files) {
		const frontmatter = file.frontmatter ?? {};
		const tags = uniqueStrings((file.tags ?? []).map(normalizeTag).filter(Boolean));
		const aliases = (file.aliases ?? []).filter(Boolean);
		const references = (file.links ?? []).map((link) => ({
			target: link.target,
			type: normalizeEdgeType(link.link_type)
		}));

		const node: KnowledgeNode = {
			id: `file:${file.relative_path}`,
			kind: 'file',
			path: file.path,
			relativePath: file.relative_path,
			name: file.name,
			displayName: `${frontmatter.name || frontmatter.title || file.name.replace(/\.mdx?$/i, '')}`,
			created: `${frontmatter.created || ''}`,
			updated: `${frontmatter.updated || ''}`,
			tags,
			type: `${frontmatter.type || ''}`,
			domain: `${frontmatter.domain || ''}`,
			status: `${frontmatter.status || ''}`,
			color: '',
			icon: '',
			unresolved: false,
			incoming: [],
			outgoing: [],
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			pinned: false
		};

		for (const tag of tags) {
			const normalizedTag = normalizeTagName(tag).toLocaleLowerCase();
			if (colorByTag.has(normalizedTag)) {
				node.color = colorByTag.get(normalizedTag) ?? '';
			}
		}

		nodes.push(node);
		pathIndex.set(normalizeReference(node.relativePath), node.id);
		pathIndex.set(normalizeReference(withoutMarkdownExtension(node.relativePath)), node.id);
		appendIndex(basenameIndex, normalizeReference(node.displayName), node.id);
		appendIndex(basenameIndex, normalizeReference(node.name.replace(/\.mdx?$/i, '')), node.id);

		for (const alias of aliases) {
			aliasIndex.set(normalizeReference(alias), node.id);
		}
	}

	for (const node of nodes) {
		const file = index.files.find((f) => f.relative_path === node.relativePath);
		if (!file) continue;

		const references = (file.links ?? []).map((link) => ({
			target: link.target,
			type: normalizeEdgeType(link.link_type)
		}));

		for (const reference of references) {
			const targetId = resolveReference(reference.target, pathIndex, aliasIndex, basenameIndex);
			const normalizedTarget = normalizeReference(reference.target);
			const resolvedTargetId = targetId ?? `unresolved:${normalizedTarget}`;

			if (!targetId && !nodes.some((n) => n.id === resolvedTargetId)) {
				nodes.push(createUnresolvedNode(reference.target));
			}

			addEdge(edges, node.id, resolvedTargetId, reference.type);
		}
	}

	hydrateBacklinks(nodes, edges);

	return {
		nodes,
		edges,
		tags: [...tagSet].sort((left, right) => left.localeCompare(right)),
		aliases: [...aliasIndex.entries()].map(([alias, target]) => ({ alias, target }))
	};
}

function normalizeEdgeType(value: string): 'wiki' | 'embed' | 'markdown' | 'frontmatter' | 'tag' {
	if (value === 'embed' || value === 'markdown' || value === 'frontmatter' || value === 'tag') return value;
	return 'wiki';
}

function addEdge(edges: KnowledgeEdge[], source: string, target: string, type: 'wiki' | 'embed' | 'markdown' | 'frontmatter' | 'tag'): void {
	if (!source || !target || source === target) return;
	const id = `${source}->${target}:${type}`;
	if (edges.some((e) => e.id === id)) return;
	edges.push({ id, source, target, type });
}

function resolveReference(
	reference: string,
	pathIndex: Map<string, string>,
	aliasIndex: Map<string, string>,
	basenameIndex: Map<string, string[]>
): string | null {
	const normalized = normalizeReference(reference);
	if (!normalized) return null;
	const exact = pathIndex.get(normalized) ?? pathIndex.get(withoutMarkdownExtension(normalized));
	if (exact) return exact;
	const alias = aliasIndex.get(normalized);
	if (alias) return alias;
	const basenameMatches = basenameIndex.get(normalized) ?? [];
	return basenameMatches.length === 1 ? basenameMatches[0] : null;
}

function hydrateBacklinks(nodes: KnowledgeNode[], edges: KnowledgeEdge[]): void {
	const byId = new Map(nodes.map((node) => [node.id, node]));

	for (const node of nodes) {
		node.incoming = [];
		node.outgoing = [];
	}

	for (const edge of edges) {
		byId.get(edge.source)?.outgoing.push(edge.target);
		byId.get(edge.target)?.incoming.push(edge.source);
	}
}

function createUnresolvedNode(target: string): KnowledgeNode {
	const normalized = normalizeReference(target);
	return {
		id: `unresolved:${normalized}`,
		kind: 'unresolved',
		path: null,
		relativePath: target,
		name: target,
		displayName: target.replace(/\.mdx?$/i, ''),
		created: '',
		updated: '',
		tags: [],
		type: '',
		domain: '',
		status: '',
		color: '',
		icon: '',
		unresolved: true,
		incoming: [],
		outgoing: [],
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		pinned: false
	};
}

function normalizeReference(value: string): string {
	return withoutMarkdownExtension(value)
		.replace(/\\/g, '/')
		.replace(/^\.?\//, '')
		.replace(/#.*$/, '')
		.trim()
		.toLocaleLowerCase();
}

function normalizeTag(value: string): string {
	const tag = value.trim().replace(/^#+/, '');
	return tag ? `#${tag}` : '';
}

function withoutMarkdownExtension(value: string): string {
	return value.replace(/\.mdx?$/i, '');
}

function appendIndex(index: Map<string, string[]>, key: string, value: string): void {
	if (!key) return;
	const values = index.get(key) ?? [];
	if (!values.includes(value)) values.push(value);
	index.set(key, values);
}

function uniqueStrings(values: string[]): string[] {
	return [...new Set(values)];
}
