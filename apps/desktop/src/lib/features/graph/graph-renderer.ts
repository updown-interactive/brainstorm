import type { GraphRenderFrame, GraphTheme, LayoutNode } from './graph-types';

const midZoomLabelLimit = 100;

export class GraphRenderer {
  private ctx: CanvasRenderingContext2D | null = null;
  private dpr = 1;

  attach(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
    return this.ctx;
  }

  setDpr(dpr: number) {
    this.dpr = dpr;
  }

  render(frame: GraphRenderFrame) {
    const ctx = this.ctx;
    if (!ctx) return 0;
    const start = performance.now();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, frame.width * frame.dpr, frame.height * frame.dpr);
    ctx.scale(frame.dpr, frame.dpr);
    ctx.fillStyle = frame.theme.background;
    ctx.fillRect(0, 0, frame.width, frame.height);
    ctx.translate(frame.panX, frame.panY);
    ctx.scale(frame.zoom, frame.zoom);

    this.drawEdges(frame);
    this.drawNodes(frame);
    this.drawLabels(frame);

    ctx.restore();
    return performance.now() - start;
  }

  rebuildLabelCache(nodes: LayoutNode[], theme: GraphTheme) {
    for (const node of nodes) {
      this.buildLabelCanvas(node, theme);
    }
  }

  buildLabelCanvas(node: LayoutNode, theme: GraphTheme) {
    if (typeof document === 'undefined') return;
    const labelCanvas = document.createElement('canvas');
    const labelCtx = labelCanvas.getContext('2d');
    if (!labelCtx) return;

    const font = '700 12px Inter, sans-serif';
    labelCtx.font = font;
    const width = Math.ceil(labelCtx.measureText(node.displayName).width) + 10;
    const height = 19;
    labelCanvas.width = Math.max(1, Math.ceil(width * this.dpr));
    labelCanvas.height = Math.max(1, Math.ceil(height * this.dpr));
    labelCanvas.style.width = `${width}px`;
    labelCanvas.style.height = `${height}px`;

    labelCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    labelCtx.font = font;
    labelCtx.textAlign = 'center';
    labelCtx.textBaseline = 'top';
    labelCtx.lineWidth = 4;
    labelCtx.strokeStyle = theme.background;
    labelCtx.fillStyle = theme.text;
    labelCtx.strokeText(node.displayName, width / 2, 1);
    labelCtx.fillText(node.displayName, width / 2, 1);

    node.labelCanvas = labelCanvas;
    node.labelWidth = width;
    node.labelHeight = height;
  }

  private drawEdges(frame: GraphRenderFrame) {
    const ctx = this.ctx;
    if (!ctx || frame.visibleEdges.length === 0) return;

    ctx.beginPath();
    for (const edge of frame.visibleEdges) {
      const source = edge.sourceNode;
      const target = edge.targetNode;
      if (!isRenderableNode(source) || !isRenderableNode(target)) continue;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const sourceOffsetX = (dx / distance) * source.radius;
      const sourceOffsetY = (dy / distance) * source.radius;
      const targetOffsetX = (dx / distance) * target.radius;
      const targetOffsetY = (dy / distance) * target.radius;
      ctx.moveTo(source.x + sourceOffsetX, source.y + sourceOffsetY);
      ctx.lineTo(target.x - targetOffsetX, target.y - targetOffsetY);
    }
    ctx.lineWidth = Math.max((0.75 * frame.linkThickness) / frame.zoom, 0.35);
    ctx.strokeStyle = frame.theme.border;
    ctx.globalAlpha = 0.72;
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (frame.arrows) {
      this.drawArrows(frame);
    }
  }

  private drawArrows(frame: GraphRenderFrame) {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.beginPath();
    for (const edge of frame.visibleEdges) {
      const source = edge.sourceNode;
      const target = edge.targetNode;
      if (!isRenderableNode(source) || !isRenderableNode(target)) continue;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const tipX = target.x - (dx / distance) * (target.radius + 2 / frame.zoom);
      const tipY = target.y - (dy / distance) * (target.radius + 2 / frame.zoom);
      const angle = Math.atan2(dy, dx);
      const size = 7 / frame.zoom;
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - Math.cos(angle - Math.PI / 6) * size, tipY - Math.sin(angle - Math.PI / 6) * size);
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - Math.cos(angle + Math.PI / 6) * size, tipY - Math.sin(angle + Math.PI / 6) * size);
    }
    ctx.lineWidth = Math.max((0.75 * frame.linkThickness) / frame.zoom, 0.35);
    ctx.strokeStyle = frame.theme.border;
    ctx.globalAlpha = 0.85;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private drawNodes(frame: GraphRenderFrame) {
    const ctx = this.ctx;
    if (!ctx || frame.visibleNodes.length === 0) return;

    const nodesByColor = new Map<string, LayoutNode[]>();
    for (const node of frame.visibleNodes) {
      if (!isRenderableNode(node)) continue;
      const color = normalizedNodeColor(node, frame.theme.primary);
      const nodes = nodesByColor.get(color);
      if (nodes) {
        nodes.push(node);
      } else {
        nodesByColor.set(color, [node]);
      }
    }

    for (const [color, colorNodes] of nodesByColor) {
      ctx.beginPath();
      for (const node of colorNodes) {
        ctx.moveTo(node.x + node.radius, node.y);
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      }
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.92;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.4 / frame.zoom;
    ctx.strokeStyle = frame.theme.background;
    ctx.stroke();

    this.drawNodeHighlight(frame.hoveredNodeId, 2.3, frame);
    this.drawNodeHighlight(frame.selectedNodeId, 3, frame);
  }

  private drawNodeHighlight(nodeId: string, lineWidth: number, frame: GraphRenderFrame) {
    const ctx = this.ctx;
    if (!ctx || !nodeId) return;
    const node = frame.nodeById.get(nodeId);
    if (!node || !frame.visibleNodes.includes(node) || !isRenderableNode(node)) return;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius + 2 / frame.zoom, 0, Math.PI * 2);
    ctx.lineWidth = lineWidth / frame.zoom;
    ctx.strokeStyle = normalizedNodeColor(node, frame.theme.primary);
    ctx.globalAlpha = 1;
    ctx.stroke();
  }

  private drawLabels(frame: GraphRenderFrame) {
    const ctx = this.ctx;
    if (!ctx) return;
    const labelNodes = labelRenderNodes(frame);
    if (labelNodes.length === 0) return;

    for (const node of labelNodes) {
      if (!isRenderableNode(node)) continue;
      if (!node.labelCanvas) this.buildLabelCanvas(node, frame.theme);
      if (!node.labelCanvas) continue;
      const width = node.labelWidth / frame.zoom;
      const height = node.labelHeight / frame.zoom;
      const x = node.x - width / 2;
      const y = node.y + node.radius + 8 / frame.zoom;
      ctx.drawImage(node.labelCanvas, x, y, width, height);
    }
  }
}

function isRenderableNode(node: LayoutNode) {
  return Number.isFinite(node.x)
    && Number.isFinite(node.y)
    && Number.isFinite(node.radius)
    && node.radius > 0;
}

function normalizedNodeColor(node: LayoutNode, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(node.color) ? node.color : fallback;
}

function labelRenderNodes(frame: GraphRenderFrame) {
  const required = new Map<string, LayoutNode>();
  for (const nodeId of [frame.selectedNodeId, frame.hoveredNodeId]) {
    const node = frame.nodeById.get(nodeId);
    if (node) required.set(node.id, node);
  }

  const threshold = frame.textFadeThreshold;
  if (frame.zoom < threshold) return Array.from(required.values());
  if (frame.zoom < threshold + 0.3) return Array.from(required.values());
  if (frame.zoom >= threshold + 0.7) {
    for (const node of frame.visibleNodes) required.set(node.id, node);
    return Array.from(required.values());
  }

  const ranked = [...frame.visibleNodes]
    .sort((left, right) => (frame.degreeById.get(right.id) ?? 0) - (frame.degreeById.get(left.id) ?? 0))
    .slice(0, midZoomLabelLimit);
  for (const node of ranked) required.set(node.id, node);
  return Array.from(required.values());
}
