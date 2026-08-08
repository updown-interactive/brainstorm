import { writable, derived } from 'svelte/store';
import type { KnowledgeNode, KnowledgeEdge, LayoutNode, RenderEdge, GraphConfig, GraphPhysicsState, GraphTheme } from '../types';
import { defaultGraphConfig } from '../config/constants';

interface GraphState {
	nodes: LayoutNode[];
	edges: KnowledgeEdge[];
	renderEdges: RenderEdge[];
	visibleNodes: LayoutNode[];
	visibleIds: Set<string>;
	visibleRenderNodes: LayoutNode[];
	visibleRenderEdges: RenderEdge[];
	nodeById: Map<string, LayoutNode>;
	degreeById: Map<string, number>;
	childDegreeById: Map<string, number>;
	searchQuery: string;
	isLoading: boolean;
	error: string;
	config: GraphConfig;
	physics: GraphPhysicsState;
	theme: GraphTheme;
	spatialIndex: Map<string, LayoutNode[]>;
}

function createGraphStore() {
	const { subscribe, set, update } = writable<GraphState>({
		nodes: [],
		edges: [],
		renderEdges: [],
		visibleNodes: [],
		visibleIds: new Set(),
		visibleRenderNodes: [],
		visibleRenderEdges: [],
		nodeById: new Map(),
		degreeById: new Map(),
		childDegreeById: new Map(),
		searchQuery: '',
		isLoading: false,
		error: '',
		config: defaultGraphConfig,
		physics: { ticks: 0, alpha: 0, active: false },
		theme: {
			background: '',
			border: '',
			primary: '',
			surface: '',
			text: '',
			textMuted: ''
		},
		spatialIndex: new Map()
	});

	return {
		subscribe,
		
		setGraph: (fileNodes: KnowledgeNode[], fileEdges: KnowledgeEdge[], nodeSize: number, minNodeSize = 8, maxNodeSize = 40) =>
			update(state => {
				const previousNodes = state.nodeById;
				state.edges = fileEdges;
				state.degreeById = buildDegreeMap(fileNodes, fileEdges);
				state.childDegreeById = buildChildDegreeMap(fileNodes, fileEdges);
				state.nodes = seedGraphNodes(fileNodes, previousNodes);
				state.nodeById = new Map(state.nodes.map(node => [node.id, node]));
				applyNodeSize(state, nodeSize, minNodeSize, maxNodeSize);
				state.renderEdges = resolveRenderEdges(state.edges, state.nodeById);
				updateSearchInternal(state, state.searchQuery);
				return state;
			}),

		clear: () =>
			update(state => {
				state.nodes = [];
				state.edges = [];
				state.renderEdges = [];
				state.visibleNodes = [];
				state.visibleIds = new Set();
				state.visibleRenderNodes = [];
				state.visibleRenderEdges = [];
				state.nodeById = new Map();
				state.degreeById = new Map();
				state.childDegreeById = new Map();
				state.spatialIndex = new Map();
				return state;
			}),

		updateSearch: (query: string) =>
			update(state => {
				updateSearchInternal(state, query);
				return state;
			}),

		applyNodeSize: (nodeSize: number, minNodeSize = 8, maxNodeSize = 40) =>
			update(state => {
				applyNodeSize(state, nodeSize, minNodeSize, maxNodeSize);
				return state;
			}),

		rebuildVisible: (bounds: { left: number; top: number; right: number; bottom: number }) =>
			update(state => {
				const viewportCullMargin = 72;
				state.visibleRenderNodes = state.visibleNodes.filter(node => 
					node.x >= bounds.left - viewportCullMargin &&
					node.x <= bounds.right + viewportCullMargin &&
					node.y >= bounds.top - viewportCullMargin &&
					node.y <= bounds.bottom + viewportCullMargin
				);
				state.visibleRenderEdges = state.renderEdges.filter(edge =>
					state.visibleIds.has(edge.source) &&
					state.visibleIds.has(edge.target) &&
					!(edge.sourceNode.x < bounds.left - viewportCullMargin && edge.targetNode.x < bounds.left - viewportCullMargin) &&
					!(edge.sourceNode.x > bounds.right + viewportCullMargin && edge.targetNode.x > bounds.right + viewportCullMargin) &&
					!(edge.sourceNode.y < bounds.top - viewportCullMargin && edge.targetNode.y < bounds.top - viewportCullMargin) &&
					!(edge.sourceNode.y > bounds.bottom + viewportCullMargin && edge.targetNode.y > bounds.bottom + viewportCullMargin)
				);
				rebuildSpatialIndex(state);
				return state;
			}),

		hitTest: (point: { x: number; y: number }, zoom: number) => {
			return null;
		},

		setConfig: (config: GraphConfig) =>
			update(state => { state.config = config; return state; }),

		setLoading: (isLoading: boolean) =>
			update(state => { state.isLoading = isLoading; return state; }),

		setError: (error: string) =>
			update(state => { state.error = error; return state; }),

		setTheme: (theme: GraphTheme) =>
			update(state => { state.theme = theme; return state; }),

		setPhysics: (physics: GraphPhysicsState) =>
			update(state => { state.physics = physics; return state; })
	};
}

export const graphState = createGraphStore();

function buildDegreeMap(fileNodes: KnowledgeNode[], fileEdges: KnowledgeEdge[]): Map<string, number> {
	const degrees = new Map(fileNodes.map(node => [node.id, 0]));
	for (const edge of fileEdges) {
		degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
		degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
	}
	return degrees;
}

function buildChildDegreeMap(fileNodes: KnowledgeNode[], fileEdges: KnowledgeEdge[]): Map<string, number> {
	const childDegrees = new Map(fileNodes.map(node => [node.id, 0]));
	for (const edge of fileEdges) {
		const current = childDegrees.get(edge.source) ?? 0;
		childDegrees.set(edge.source, current + 1);
	}
	return childDegrees;
}

function updateSearchInternal(state: GraphState, query: string): void {
	state.searchQuery = query;
	const normalizedQuery = query.trim().toLocaleLowerCase();
	state.visibleNodes = normalizedQuery
		? state.nodes.filter(node => node.searchText.includes(normalizedQuery))
		: state.nodes;
	state.visibleIds = new Set(state.visibleNodes.map(node => node.id));
}

function seedGraphNodes(fileNodes: KnowledgeNode[], previousNodes: Map<string, LayoutNode>): LayoutNode[] {
	const count = fileNodes.length;
	const radius = Math.max(120, Math.sqrt(count) * 95);
	return fileNodes.map((node, index) => {
		const existing = previousNodes.get(node.id);
		if (existing) {
			return {
				...node,
				folder: folderFromPath(node.relativePath),
				searchText: searchableText(node, folderFromPath(node.relativePath)),
				x: existing.x,
				y: existing.y,
				vx: existing.vx,
				vy: existing.vy,
				pinned: existing.pinned,
				radius: existing.radius,
				radiusSquared: existing.radiusSquared,
				labelCanvas: existing.labelCanvas,
				labelWidth: existing.labelWidth,
				labelHeight: existing.labelHeight
			};
		}

		const angle = stableAngle(node.id, index, count);
		const ring = count <= 1 ? 0 : radius * (0.7 + (stableHash(node.id) % 100) / 300);
		const folder = folderFromPath(node.relativePath);
		return {
			...node,
			folder,
			searchText: searchableText(node, folder),
			x: Math.cos(angle) * ring,
			y: Math.sin(angle) * ring,
			vx: 0,
			vy: 0,
			pinned: false,
			radius: 8,
			radiusSquared: 64,
			labelWidth: 0,
			labelHeight: 0
		};
	});
}

function resolveRenderEdges(sourceEdges: KnowledgeEdge[], nodeById: Map<string, LayoutNode>): RenderEdge[] {
	const resolved: RenderEdge[] = [];
	for (const edge of sourceEdges) {
		const sourceNode = nodeById.get(edge.source);
		const targetNode = nodeById.get(edge.target);
		if (!sourceNode || !targetNode) continue;
		resolved.push({ ...edge, sourceNode, targetNode });
	}
	return resolved;
}

function applyNodeSize(
	state: { nodes: LayoutNode[]; degreeById: Map<string, number>; childDegreeById?: Map<string, number> },
	nodeSize: number,
	minNodeSize = 8,
	maxNodeSize = 40
): void {
	const minRadius = Math.min(minNodeSize, maxNodeSize);
	const maxRadius = Math.max(minNodeSize, maxNodeSize);
	const radiusRange = maxRadius - minRadius;

	for (const node of state.nodes) {
		const childConnections = state.childDegreeById?.get(node.id) ?? node.outgoing?.length ?? 0;
		const totalConnections = state.degreeById.get(node.id) ?? 0;
		const connectionScore = childConnections * 1.5 + (totalConnections - childConnections) * 0.5;
		const t = Math.min(1, Math.sqrt(connectionScore) / 4.5);
		const radius = (minRadius + radiusRange * t) * nodeSize;
		node.radius = radius;
		node.radiusSquared = radius * radius;
	}
}

function searchableText(node: KnowledgeNode, folder: string): string {
	return `${node.displayName} ${node.relativePath} ${folder}`.toLocaleLowerCase();
}

function folderFromPath(relativePath: string): string {
	const parts = relativePath.split('/').filter(Boolean);
	parts.pop();
	return parts.length > 0 ? parts.join('/') : 'Root';
}

function rebuildSpatialIndex(state: { visibleRenderNodes: LayoutNode[]; spatialIndex: Map<string, LayoutNode[]> }): void {
	const hitCellSize = 96;
	const nextIndex = new Map<string, LayoutNode[]>();
	for (const node of state.visibleRenderNodes) {
		const cellX = Math.floor(node.x / hitCellSize);
		const cellY = Math.floor(node.y / hitCellSize);
		const key = `${cellX}:${cellY}`;
		const bucket = nextIndex.get(key);
		if (bucket) {
			bucket.push(node);
		} else {
			nextIndex.set(key, [node]);
		}
	}
	state.spatialIndex = nextIndex;
}

function stableAngle(id: string, index: number, count: number): number {
	if (count <= 1) return 0;
	const goldenAngle = Math.PI * (3 - Math.sqrt(5));
	return index * goldenAngle + (stableHash(id) % 628) / 100;
}

function stableHash(value: string): number {
	let hash = 0;
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
	}
	return hash;
}
