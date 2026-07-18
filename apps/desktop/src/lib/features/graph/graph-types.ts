import type { KnowledgeEdge, KnowledgeNode } from './graph-engine';

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
  arrows: boolean;
  linkThickness: number;
  textFadeThreshold: number;
  degreeById: Map<string, number>;
  nodeById: Map<string, LayoutNode>;
}
