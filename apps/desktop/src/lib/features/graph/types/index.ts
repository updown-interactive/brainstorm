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

export interface LayoutNode extends KnowledgeNode {
	folder: string;
	radius: number;
	radiusSquared: number;
	labelCanvas?: HTMLCanvasElement;
	labelWidth: number;
	labelHeight: number;
	searchText: string;
}

export interface RenderEdge extends KnowledgeEdge {
	sourceNode: LayoutNode;
	targetNode: LayoutNode;
}

export interface GraphTheme {
	background: string;
	border: string;
	primary: string;
	surface: string;
	text: string;
	textMuted: string;
}

export interface GraphBounds {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export interface GraphPoint {
	x: number;
	y: number;
}

export interface GraphRenderFrame {
	width: number;
	height: number;
	dpr: number;
	panX: number;
	panY: number;
	zoom: number;
	theme: GraphTheme;
	visibleNodes: LayoutNode[];
	visibleEdges: RenderEdge[];
	selectedNodeId: string;
	hoveredNodeId: string;
	activeNodeId: string;
	highlightOpacity: number;
	highlightedNodeIds: Set<string>;
	highlightedEdgeIds: Set<string>;
	animationTime: number;
	arrows: boolean;
	linkThickness: number;
	textFadeThreshold: number;
	degreeById: Map<string, number>;
	childDegreeById?: Map<string, number>;
	nodeById: Map<string, LayoutNode>;
}

export interface GraphConfig {
	forceModelVersion: 2;
	display: {
		arrows: boolean;
		textFadeThreshold: number;
		nodeSize: number;
		minNodeSize: number;
		maxNodeSize: number;
		linkThickness: number;
	};
	forces: {
		center: number;
		repel: number;
		link: number;
		linkDistance: number;
	};
	panel: {
		open: boolean;
		displayOpen: boolean;
		forcesOpen: boolean;
	};
}

export interface GraphPhysicsState {
	ticks: number;
	alpha: number;
	active: boolean;
}

export type DisplayRangeKey = 'textFadeThreshold' | 'nodeSize' | 'minNodeSize' | 'maxNodeSize' | 'linkThickness';
export type ForceRangeKey = 'center' | 'repel' | 'link' | 'linkDistance';
