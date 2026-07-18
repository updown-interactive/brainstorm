import { nameFromPath } from '../markdown/frontmatter';
import { getVaultIndex, type IndexedFile } from '../files/vault-index';

export type KnowledgeNodeKind = 'file' | 'tag' | 'unresolved';
export type KnowledgeEdgeType = 'wiki' | 'embed' | 'markdown' | 'frontmatter' | 'tag';

export interface KnowledgeNode {
  id: string;
  kind: KnowledgeNodeKind;
  path: string | null;
  relativePath: string;
  name: string;
  displayName: string;
  created: string;
  updated: string;
  tags: string[];
  type: string;
  domain: string;
  status: string;
  color: string;
  icon: string;
  unresolved: boolean;
  incoming: string[];
  outgoing: string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned: boolean;
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  type: KnowledgeEdgeType;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  tags: string[];
  aliases: Array<{ alias: string; target: string }>;
}

interface ParsedDocument {
  node: KnowledgeNode;
  aliases: string[];
  references: Array<{ target: string; type: KnowledgeEdgeType }>;
}

export async function buildKnowledgeGraph(rootPath: string, includeTagNodes: boolean): Promise<KnowledgeGraph> {
  const index = await getVaultIndex(rootPath);
  const documents = index.files.map((file) => indexedFileToDocument(file));
  const nodes = new Map<string, KnowledgeNode>();
  const edges = new Map<string, KnowledgeEdge>();
  const aliasIndex = new Map<string, string>();
  const pathIndex = new Map<string, string>();
  const basenameIndex = new Map<string, string[]>();
  const tagSet = new Set<string>();

  for (const document of documents) {
    nodes.set(document.node.id, document.node);
    pathIndex.set(normalizeReference(document.node.relativePath), document.node.id);
    pathIndex.set(normalizeReference(withoutMarkdownExtension(document.node.relativePath)), document.node.id);
    appendIndex(basenameIndex, normalizeReference(document.node.displayName), document.node.id);
    appendIndex(basenameIndex, normalizeReference(nameFromPath(document.node.relativePath)), document.node.id);

    for (const alias of document.aliases) {
      aliasIndex.set(normalizeReference(alias), document.node.id);
    }
  }

  for (const document of documents) {
    for (const reference of document.references) {
      const targetId = resolveReference(reference.target, pathIndex, aliasIndex, basenameIndex);
      const normalizedTarget = normalizeReference(reference.target);
      const resolvedTargetId = targetId ?? `unresolved:${normalizedTarget}`;

      if (!targetId && !nodes.has(resolvedTargetId)) {
        nodes.set(resolvedTargetId, createUnresolvedNode(reference.target));
      }

      addEdge(edges, document.node.id, resolvedTargetId, reference.type);
    }

    if (includeTagNodes) {
      for (const tag of document.node.tags) {
        const normalizedTag = normalizeTag(tag);
        if (!normalizedTag) continue;
        const tagId = `tag:${normalizedTag.toLocaleLowerCase()}`;
        tagSet.add(normalizedTag);
        if (!nodes.has(tagId)) nodes.set(tagId, createTagNode(normalizedTag));
        addEdge(edges, document.node.id, tagId, 'tag');
      }
    }
  }

  const graphNodes = [...nodes.values()];
  const graphEdges = [...edges.values()];
  hydrateBacklinks(graphNodes, graphEdges);

  return {
    nodes: graphNodes,
    edges: graphEdges,
    tags: [...tagSet].sort((left, right) => left.localeCompare(right)),
    aliases: [...aliasIndex.entries()].map(([alias, target]) => ({ alias, target }))
  };
}

function indexedFileToDocument(file: IndexedFile): ParsedDocument {
  const frontmatterData = file.frontmatter ?? {};
  const tags = uniqueStrings((file.tags ?? []).map(normalizeTag).filter(Boolean));
  const aliases = (file.aliases ?? []).filter(Boolean);
  const references = (file.links ?? []).map((link) => ({
    target: link.target,
    type: normalizeEdgeType(link.link_type)
  }));

  return {
    node: {
      id: `file:${file.relative_path}`,
      kind: 'file',
      path: file.path,
      relativePath: file.relative_path,
      name: file.name,
      displayName: `${frontmatterData.name || frontmatterData.title || nameFromPath(file.name)}`,
      created: `${frontmatterData.created || ''}`,
      updated: `${frontmatterData.updated || ''}`,
      tags,
      type: `${frontmatterData.type || ''}`,
      domain: `${frontmatterData.domain || ''}`,
      status: `${frontmatterData.status || ''}`,
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
    },
    aliases,
    references
  };
}

function normalizeEdgeType(value: string): KnowledgeEdgeType {
  if (value === 'embed' || value === 'markdown' || value === 'frontmatter' || value === 'tag') return value;
  return 'wiki';
}

function addEdge(edges: Map<string, KnowledgeEdge>, source: string, target: string, type: KnowledgeEdgeType) {
  if (!source || !target || source === target) return;
  const id = `${source}->${target}:${type}`;
  if (edges.has(id)) return;
  edges.set(id, { id, source, target, type });
}

function resolveReference(
  reference: string,
  pathIndex: Map<string, string>,
  aliasIndex: Map<string, string>,
  basenameIndex: Map<string, string[]>
) {
  const normalized = normalizeReference(reference);
  if (!normalized) return null;
  const exact = pathIndex.get(normalized) ?? pathIndex.get(withoutMarkdownExtension(normalized));
  if (exact) return exact;
  const alias = aliasIndex.get(normalized);
  if (alias) return alias;
  const basenameMatches = basenameIndex.get(normalized) ?? [];
  return basenameMatches.length === 1 ? basenameMatches[0] : null;
}

function hydrateBacklinks(nodes: KnowledgeNode[], edges: KnowledgeEdge[]) {
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
    displayName: nameFromPath(target),
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

function createTagNode(tag: string): KnowledgeNode {
  return {
    id: `tag:${tag.toLocaleLowerCase()}`,
    kind: 'tag',
    path: null,
    relativePath: tag,
    name: tag,
    displayName: tag,
    created: '',
    updated: '',
    tags: [],
    type: 'tag',
    domain: '',
    status: '',
    color: '',
    icon: '#',
    unresolved: false,
    incoming: [],
    outgoing: [],
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    pinned: false
  };
}

function normalizeReference(value: string) {
  return withoutMarkdownExtension(value)
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/#.*$/, '')
    .trim()
    .toLocaleLowerCase();
}

function normalizeTag(value: string) {
  const tag = value.trim().replace(/^#+/, '');
  return tag ? `#${tag}` : '';
}

function withoutMarkdownExtension(value: string) {
  return value.replace(/\.mdx?$/i, '');
}

function appendIndex(index: Map<string, string[]>, key: string, value: string) {
  if (!key) return;
  const values = index.get(key) ?? [];
  if (!values.includes(value)) values.push(value);
  index.set(key, values);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}
