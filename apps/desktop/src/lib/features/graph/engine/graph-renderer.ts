import type { GraphRenderFrame, GraphTheme, LayoutNode, RenderEdge } from '../types';

const midZoomLabelLimit = 100;
const dimmedAlpha = 0.16;
const highlightedEdgeAlpha = 0.96;
const unselectedEdgeAlpha = 0.12;
const highlightedNodeAlpha = 1;
const unselectedNodeAlpha = 0.2;

export class GraphRenderer {
	private ctx: CanvasRenderingContext2D | null = null;
	private dpr = 1;

	attach(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
		this.ctx = canvas.getContext('2d');
		return this.ctx;
	}

	setDpr(dpr: number): void {
		this.dpr = dpr;
	}

	render(frame: GraphRenderFrame): number {
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

	rebuildLabelCache(nodes: LayoutNode[], theme: GraphTheme): void {
		for (const node of nodes) {
			this.buildLabelCanvas(node, theme);
		}
	}

	buildLabelCanvas(node: LayoutNode, theme: GraphTheme): void {
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

	private drawEdges(frame: GraphRenderFrame): void {
		const ctx = this.ctx;
		if (!ctx || frame.visibleEdges.length === 0) return;

		const highlightOpacity = clampUnit(frame.highlightOpacity);
		const hasActiveHighlight = frame.activeNodeId.length > 0 && highlightOpacity > 0;
		if (hasActiveHighlight) {
			this.drawEdgeSet(frame, (edge) => !frame.highlightedEdgeIds.has(edge.id), frame.theme.border, mix(0.72, unselectedEdgeAlpha, highlightOpacity), 0.7);
			this.drawEdgeSet(frame, (edge) => frame.highlightedEdgeIds.has(edge.id), frame.theme.primary, mix(0.72, highlightedEdgeAlpha, highlightOpacity), 0.95);
			this.drawEnergyFlow(frame, highlightOpacity);
			if (frame.arrows) {
				this.drawArrows(frame);
			}
			return;
		}

		this.drawEdgeSet(frame, () => true, frame.theme.border, 0.72, 1);

		if (frame.arrows) {
			this.drawArrows(frame);
		}
	}

	private drawEdgeSet(
		frame: GraphRenderFrame,
		includeEdge: (edge: RenderEdge) => boolean,
		color: string,
		alpha: number,
		widthScale: number,
		glow = false
	): void {
		const ctx = this.ctx;
		if (!ctx) return;

		ctx.beginPath();
		for (const edge of frame.visibleEdges) {
			if (!includeEdge(edge)) continue;
			const source = edge.sourceNode;
			const target = edge.targetNode;
			if (!isRenderableNode(source) || !isRenderableNode(target)) continue;
			const line = edgeLineEndpoints(source, target, 0);
			ctx.moveTo(line.x1, line.y1);
			ctx.lineTo(line.x2, line.y2);
		}
		ctx.lineWidth = Math.max((0.75 * frame.linkThickness * widthScale) / frame.zoom, 0.35);
		ctx.strokeStyle = color;
		ctx.globalAlpha = alpha;
		if (glow) {
			ctx.shadowColor = color;
			ctx.shadowBlur = 12 / frame.zoom;
		}
		ctx.stroke();
		ctx.globalAlpha = 1;
		ctx.shadowBlur = 0;
	}

	private drawEnergyFlow(frame: GraphRenderFrame, highlightOpacity: number): void {
		const ctx = this.ctx;
		if (!ctx || frame.highlightedEdgeIds.size === 0 || highlightOpacity <= 0) return;
		const pulseDurationMs = 2400;

		ctx.save();
		ctx.lineCap = 'round';
		ctx.lineWidth = Math.max((2.2 * frame.linkThickness) / frame.zoom, 1.15);
		ctx.shadowColor = frame.theme.primary;
		ctx.shadowBlur = (14 * highlightOpacity) / frame.zoom;

		for (const edge of frame.visibleEdges) {
			if (!frame.highlightedEdgeIds.has(edge.id)) continue;
			const source = edge.sourceNode;
			const target = edge.targetNode;
			if (!isRenderableNode(source) || !isRenderableNode(target)) continue;
			const line = edgeLineEndpoints(source, target, 2 / frame.zoom);
			const dx = line.x2 - line.x1;
			const dy = line.y2 - line.y1;
			const distance = Math.max(1, Math.hypot(dx, dy));
			const progress = (frame.animationTime / pulseDurationMs + stableHash(edge.id) / 0xffffffff) % 1;
			const easedProgress = easeInOutSine(progress);
			const halfPulse = Math.min(0.16, Math.max(18 / frame.zoom, 8) / distance);
			const startProgress = Math.max(0, easedProgress - halfPulse);
			const endProgress = Math.min(1, easedProgress + halfPulse);
			const peakAlpha = (0.42 + Math.sin(progress * Math.PI) * 0.42) * highlightOpacity;
			const x1 = line.x1 + dx * startProgress;
			const y1 = line.y1 + dy * startProgress;
			const x2 = line.x1 + dx * endProgress;
			const y2 = line.y1 + dy * endProgress;
			const gradient = ctx.createLinearGradient(x1, y1, x2, y2);

			gradient.addColorStop(0, transparentColor(frame.theme.primary));
			gradient.addColorStop(0.5, frame.theme.primary);
			gradient.addColorStop(1, transparentColor(frame.theme.primary));

			ctx.beginPath();
			ctx.strokeStyle = gradient;
			ctx.globalAlpha = peakAlpha;
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();
		}
		ctx.restore();
	}

	private drawArrows(frame: GraphRenderFrame): void {
		const ctx = this.ctx;
		if (!ctx) return;
		const highlightOpacity = clampUnit(frame.highlightOpacity);
		const hasActiveHighlight = frame.activeNodeId.length > 0 && highlightOpacity > 0;
		if (hasActiveHighlight) {
			this.drawArrowSet(frame, (edge) => !frame.highlightedEdgeIds.has(edge.id), frame.theme.border, mix(0.85, unselectedEdgeAlpha, highlightOpacity));
			this.drawArrowSet(frame, (edge) => frame.highlightedEdgeIds.has(edge.id), frame.theme.primary, mix(0.85, highlightedEdgeAlpha, highlightOpacity));
			return;
		}
		this.drawArrowSet(frame, () => true, frame.theme.border, 0.85);
	}

	private drawArrowSet(
		frame: GraphRenderFrame,
		includeEdge: (edge: RenderEdge) => boolean,
		color: string,
		alpha: number
	): void {
		const ctx = this.ctx;
		if (!ctx) return;
		ctx.beginPath();
		for (const edge of frame.visibleEdges) {
			if (!includeEdge(edge)) continue;
			const source = edge.sourceNode;
			const target = edge.targetNode;
			if (!isRenderableNode(source) || !isRenderableNode(target)) continue;
			const arrow = arrowLine(source, target, frame.zoom);
			ctx.moveTo(arrow.tipX, arrow.tipY);
			ctx.lineTo(
				arrow.tipX - Math.cos(arrow.angle - Math.PI / 6) * arrow.size,
				arrow.tipY - Math.sin(arrow.angle - Math.PI / 6) * arrow.size
			);
			ctx.moveTo(arrow.tipX, arrow.tipY);
			ctx.lineTo(
				arrow.tipX - Math.cos(arrow.angle + Math.PI / 6) * arrow.size,
				arrow.tipY - Math.sin(arrow.angle + Math.PI / 6) * arrow.size
			);
		}
		ctx.lineWidth = Math.max((0.75 * frame.linkThickness) / frame.zoom, 0.35);
		ctx.strokeStyle = color;
		ctx.globalAlpha = alpha;
		ctx.stroke();
		ctx.globalAlpha = 1;
	}

	private drawNodes(frame: GraphRenderFrame): void {
		const ctx = this.ctx;
		if (!ctx || frame.visibleNodes.length === 0) return;

		const highlightOpacity = clampUnit(frame.highlightOpacity);
		const hasActiveHighlight = frame.activeNodeId.length > 0 && highlightOpacity > 0;
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
				if (hasActiveHighlight && frame.highlightedNodeIds.has(node.id)) continue;
				ctx.moveTo(node.x + node.radius, node.y);
				ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
			}
			ctx.fillStyle = color;
			ctx.globalAlpha = hasActiveHighlight ? mix(0.92, unselectedNodeAlpha, highlightOpacity) : 0.92;
			ctx.fill();
		}

		ctx.globalAlpha = 1;
		ctx.lineWidth = 1.4 / frame.zoom;
		ctx.strokeStyle = frame.theme.background;
		ctx.stroke();

		if (hasActiveHighlight) {
			this.drawHighlightedNodes(frame, highlightOpacity);
		}

		this.drawNodeHighlight(frame.hoveredNodeId, 2.3, frame);
		this.drawNodeHighlight(frame.selectedNodeId, 3, frame);
	}

	private drawHighlightedNodes(frame: GraphRenderFrame, highlightOpacity: number): void {
		const ctx = this.ctx;
		if (!ctx) return;
		for (const node of frame.visibleNodes) {
			if (!frame.highlightedNodeIds.has(node.id) || !isRenderableNode(node)) continue;
			const color = normalizedNodeColor(node, frame.theme.primary);
			ctx.beginPath();
			ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
			ctx.fillStyle = color;
			ctx.globalAlpha = mix(0.92, highlightedNodeAlpha, highlightOpacity);
			ctx.shadowColor = color;
			ctx.shadowBlur = ((node.id === frame.activeNodeId ? 14 : 7) * highlightOpacity) / frame.zoom;
			ctx.fill();
			ctx.shadowBlur = 0;
			ctx.lineWidth = 1.6 / frame.zoom;
			ctx.strokeStyle = frame.theme.background;
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}

	private drawNodeHighlight(nodeId: string, lineWidth: number, frame: GraphRenderFrame): void {
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

	private drawLabels(frame: GraphRenderFrame): void {
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
			const highlightOpacity = clampUnit(frame.highlightOpacity);
			ctx.globalAlpha = frame.activeNodeId && !frame.highlightedNodeIds.has(node.id)
				? mix(1, dimmedAlpha, highlightOpacity)
				: 1;
			ctx.drawImage(node.labelCanvas, x, y, width, height);
		}
		ctx.globalAlpha = 1;
	}
}

function isRenderableNode(node: LayoutNode): boolean {
	return Number.isFinite(node.x)
		&& Number.isFinite(node.y)
		&& Number.isFinite(node.radius)
		&& node.radius > 0;
}

function normalizedNodeColor(node: LayoutNode, fallback: string): string {
	return /^#[0-9a-f]{6}$/i.test(node.color) ? node.color : fallback;
}

function mix(from: number, to: number, progress: number): number {
	return from + (to - from) * clampUnit(progress);
}

function clampUnit(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.min(1, Math.max(0, value));
}

function edgeLineEndpoints(source: LayoutNode, target: LayoutNode, extraPadding: number): { x1: number; y1: number; x2: number; y2: number } {
	const dx = target.x - source.x;
	const dy = target.y - source.y;
	const distance = Math.max(1, Math.hypot(dx, dy));
	const sourceOffsetX = (dx / distance) * (source.radius + extraPadding);
	const sourceOffsetY = (dy / distance) * (source.radius + extraPadding);
	const targetOffsetX = (dx / distance) * (target.radius + extraPadding);
	const targetOffsetY = (dy / distance) * (target.radius + extraPadding);
	return {
		x1: source.x + sourceOffsetX,
		y1: source.y + sourceOffsetY,
		x2: target.x - targetOffsetX,
		y2: target.y - targetOffsetY
	};
}

function arrowLine(source: LayoutNode, target: LayoutNode, zoom: number): { tipX: number; tipY: number; angle: number; size: number } {
	const dx = target.x - source.x;
	const dy = target.y - source.y;
	const distance = Math.max(1, Math.hypot(dx, dy));
	return {
		tipX: target.x - (dx / distance) * (target.radius + 2 / zoom),
		tipY: target.y - (dy / distance) * (target.radius + 2 / zoom),
		angle: Math.atan2(dy, dx),
		size: 7 / zoom
	};
}

function easeInOutSine(value: number): number {
	return -(Math.cos(Math.PI * value) - 1) / 2;
}

function transparentColor(color: string): string {
	const hex = color.match(/^#([0-9a-f]{6})$/i);
	if (hex) {
		const value = hex[1];
		const red = Number.parseInt(value.slice(0, 2), 16);
		const green = Number.parseInt(value.slice(2, 4), 16);
		const blue = Number.parseInt(value.slice(4, 6), 16);
		return `rgba(${red}, ${green}, ${blue}, 0)`;
	}

	const rgb = color.match(/^rgb\(([^)]+)\)$/i);
	if (rgb) return `rgba(${rgb[1]}, 0)`;

	return color;
}

function stableHash(value: string): number {
	let hash = 0;
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
	}
	return hash;
}

function labelRenderNodes(frame: GraphRenderFrame): LayoutNode[] {
	const required = new Map<string, LayoutNode>();
	for (const nodeId of [frame.selectedNodeId, frame.hoveredNodeId]) {
		const node = frame.nodeById.get(nodeId);
		if (node) required.set(node.id, node);
	}
	if (frame.activeNodeId) {
		return Array.from(required.values());
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
