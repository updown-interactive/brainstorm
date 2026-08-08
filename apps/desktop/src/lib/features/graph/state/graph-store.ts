import type { KnowledgeEdge, KnowledgeNode } from '../types';
import type { GraphBounds, GraphPoint, LayoutNode, RenderEdge } from '../types';

const baseNodeRadius = 8;
const hitCellSize = 96;
const viewportCullMargin = 72;

export class GraphRuntimeStore {
	nodes: LayoutNode[] = [];
	edges: KnowledgeEdge[] = [];
	renderEdges: RenderEdge[] = [];
	visibleNodes: LayoutNode[] = [];
	visibleIds = new Set<string>();
	visibleRenderNodes: LayoutNode[] = [];
	visibleRenderEdges: RenderEdge[] = [];
	nodeById = new Map<string, LayoutNode>();
	degreeById = new Map<string, number>();
	childDegreeById = new Map<string, number>();

	private spatialIndex = new Map<string, LayoutNode[]>();
	private searchQuery = '';

	setGraph(fileNodes: KnowledgeNode[], fileEdges: KnowledgeEdge[], nodeSize: number, minNodeSize = 8, maxNodeSize = 40): void {
		const previousNodes = this.nodeById;
		this.edges = fileEdges;
		this.degreeById = buildDegreeMap(fileNodes, fileEdges);
		this.childDegreeById = buildChildDegreeMap(fileNodes, fileEdges);
		this.nodes = seedGraphNodes(fileNodes, previousNodes);
		this.nodeById = new Map(this.nodes.map((node) => [node.id, node]));
		this.applyNodeSize(nodeSize, minNodeSize, maxNodeSize);
		this.renderEdges = resolveRenderEdges(this.edges, this.nodeById);
		this.updateSearch(this.searchQuery);
	}

	clear(): void {
		this.nodes = [];
		this.edges = [];
		this.renderEdges = [];
		this.visibleNodes = [];
		this.visibleIds = new Set();
		this.visibleRenderNodes = [];
		this.visibleRenderEdges = [];
		this.nodeById = new Map();
		this.degreeById = new Map();
		this.childDegreeById = new Map();
		this.spatialIndex = new Map();
	}

	updateSearch(query: string): void {
		this.searchQuery = query;
		const normalizedQuery = query.trim().toLocaleLowerCase();
		this.visibleNodes = normalizedQuery
			? this.nodes.filter((node) => node.searchText.includes(normalizedQuery))
			: this.nodes;
		this.visibleIds = new Set(this.visibleNodes.map((node) => node.id));
	}

	applyNodeSize(nodeSize: number, minNodeSize = 8, maxNodeSize = 40): void {
		const minRadius = Math.min(minNodeSize, maxNodeSize);
		const maxRadius = Math.max(minNodeSize, maxNodeSize);
		const radiusRange = maxRadius - minRadius;

		for (const node of this.nodes) {
			const childConnections = this.childDegreeById.get(node.id) ?? node.outgoing?.length ?? 0;
			const totalConnections = this.degreeById.get(node.id) ?? 0;
			const connectionScore = childConnections * 1.5 + (totalConnections - childConnections) * 0.5;
			const t = Math.min(1, Math.sqrt(connectionScore) / 4.5);
			const radius = (minRadius + radiusRange * t) * nodeSize;
			node.radius = radius;
			node.radiusSquared = radius * radius;
		}
	}

	rebuildVisible(bounds: GraphBounds): void {
		this.visibleRenderNodes = this.visibleNodes.filter((node) => !isNodeOutsideView(node, bounds, viewportCullMargin));
		this.visibleRenderEdges = this.renderEdges.filter((edge) =>
			this.visibleIds.has(edge.source)
			&& this.visibleIds.has(edge.target)
			&& !isEdgeOutsideView(edge.sourceNode, edge.targetNode, bounds, viewportCullMargin)
		);
		this.rebuildSpatialIndex();
	}

	rebuildSpatialIndex(): void {
		const nextIndex = new Map<string, LayoutNode[]>();
		for (const node of this.visibleRenderNodes) {
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
		this.spatialIndex = nextIndex;
	}

	hitTest(point: GraphPoint, zoom: number): LayoutNode | null {
		if (this.spatialIndex.size === 0) {
			this.rebuildSpatialIndex();
		}

		const cellX = Math.floor(point.x / hitCellSize);
		const cellY = Math.floor(point.y / hitCellSize);
		let bestNode: LayoutNode | null = null;
		let bestDistance = Infinity;

		for (let x = cellX - 1; x <= cellX + 1; x += 1) {
			for (let y = cellY - 1; y <= cellY + 1; y += 1) {
				for (const node of this.spatialIndex.get(`${x}:${y}`) ?? []) {
					const radius = node.radius + 3 / zoom;
					const dx = node.x - point.x;
					const dy = node.y - point.y;
					const distanceSquared = dx * dx + dy * dy;
					if (distanceSquared > radius * radius || distanceSquared >= bestDistance) continue;
					bestNode = node;
					bestDistance = distanceSquared;
				}
			}
		}

		return bestNode;
	}
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
			radius: baseNodeRadius,
			radiusSquared: baseNodeRadius * baseNodeRadius,
			labelWidth: 0,
			labelHeight: 0
		};
	});
}

function buildDegreeMap(fileNodes: KnowledgeNode[], fileEdges: KnowledgeEdge[]): Map<string, number> {
	const degrees = new Map(fileNodes.map((node) => [node.id, 0]));
	for (const edge of fileEdges) {
		degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
		degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
	}
	return degrees;
}

function buildChildDegreeMap(fileNodes: KnowledgeNode[], fileEdges: KnowledgeEdge[]): Map<string, number> {
	const childDegrees = new Map(fileNodes.map((node) => [node.id, 0]));
	for (const edge of fileEdges) {
		const current = childDegrees.get(edge.source) ?? 0;
		childDegrees.set(edge.source, current + 1);
	}
	return childDegrees;
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

function searchableText(node: KnowledgeNode, folder: string): string {
	return `${node.displayName} ${node.relativePath} ${folder}`.toLocaleLowerCase();
}

function folderFromPath(relativePath: string): string {
	const parts = relativePath.split('/').filter(Boolean);
	parts.pop();
	return parts.length > 0 ? parts.join('/') : 'Root';
}

function isNodeOutsideView(node: LayoutNode, bounds: GraphBounds, margin: number): boolean {
	return node.x < bounds.left - margin
		|| node.x > bounds.right + margin
		|| node.y < bounds.top - margin
		|| node.y > bounds.bottom + margin;
}

function isEdgeOutsideView(source: LayoutNode, target: LayoutNode, bounds: GraphBounds, margin: number): boolean {
	if (source.x < bounds.left - margin && target.x < bounds.left - margin) return true;
	if (source.x > bounds.right + margin && target.x > bounds.right + margin) return true;
	if (source.y < bounds.top - margin && target.y < bounds.top - margin) return true;
	if (source.y > bounds.bottom + margin && target.y > bounds.bottom + margin) return true;
	return false;
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