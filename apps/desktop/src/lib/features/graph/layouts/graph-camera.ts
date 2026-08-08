import type { GraphBounds, GraphPoint, LayoutNode } from '../types';

export const minZoom = 0.02;
export const maxZoom = 8;

export class GraphCamera {
	panX = 0;
	panY = 0;
	zoom = 1;

	get bounds() {
		return { panX: this.panX, panY: this.panY, zoom: this.zoom };
	}

	setPan(panX: number, panY: number): void {
		this.panX = panX;
		this.panY = panY;
	}

	fit(nodes: LayoutNode[], width: number, height: number): void {
		if (nodes.length === 0) return;

		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;
		let validNodeCount = 0;

		for (const node of nodes) {
			if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;
			validNodeCount += 1;
			const radius = Number.isFinite(node.radius) && node.radius > 0 ? node.radius : 12;
			minX = Math.min(minX, node.x - radius);
			maxX = Math.max(maxX, node.x + radius);
			minY = Math.min(minY, node.y - radius);
			maxY = Math.max(maxY, node.y + radius);
		}

		if (validNodeCount === 0) {
			this.zoom = 1;
			this.panX = width / 2;
			this.panY = height / 2;
			return;
		}

		const margin = 48;
		const boundsWidth = Math.max(maxX - minX + margin * 2, 1);
		const boundsHeight = Math.max(maxY - minY + margin * 2, 1);
		const fitZoom = Math.min(Math.max(width, 1) / boundsWidth, Math.max(height, 1) / boundsHeight) * 0.90;
		this.zoom = clampZoom(fitZoom);
		const centerX = minX + (maxX - minX) / 2;
		const centerY = minY + (maxY - minY) / 2;
		this.panX = width / 2 - centerX * this.zoom;
		this.panY = height / 2 - centerY * this.zoom;
	}

	focus(node: LayoutNode, width: number, height: number, zoom = 1.4): void {
		this.zoom = clampZoom(zoom);
		this.panX = width / 2 - node.x * this.zoom;
		this.panY = height / 2 - node.y * this.zoom;
	}

	zoomStep(factor: number, width: number, height: number): void {
		const nextZoom = clampZoom(this.zoom * factor);
		const centerX = width / 2;
		const centerY = height / 2;
		const graphX = (centerX - this.panX) / this.zoom;
		const graphY = (centerY - this.panY) / this.zoom;
		this.panX = centerX - graphX * nextZoom;
		this.panY = centerY - graphY * nextZoom;
		this.zoom = nextZoom;
	}

	zoomAt(point: GraphPoint, deltaY: number): void {
		const nextZoom = clampZoom(this.zoom * (deltaY < 0 ? 1.1 : 0.9));
		this.panX -= point.x * (nextZoom - this.zoom);
		this.panY -= point.y * (nextZoom - this.zoom);
		this.zoom = nextZoom;
	}

	screenToGraph(clientX: number, clientY: number, rect: DOMRect): GraphPoint {
		const screenX = clientX - rect.left;
		const screenY = clientY - rect.top;
		return {
			x: (screenX - this.panX) / this.zoom,
			y: (screenY - this.panY) / this.zoom
		};
	}

	visibleBounds(width: number, height: number): GraphBounds {
		return {
			left: -this.panX / this.zoom,
			top: -this.panY / this.zoom,
			right: (-this.panX + width) / this.zoom,
			bottom: (-this.panY + height) / this.zoom
		};
	}
}

export function clampZoom(value: number): number {
	return Math.min(maxZoom, Math.max(minZoom, value));
}