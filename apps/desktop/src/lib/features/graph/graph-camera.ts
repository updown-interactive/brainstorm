import type { GraphBounds, GraphPoint, LayoutNode } from './graph-types';

const minZoom = 0.05;
const maxZoom = 8;

export class GraphCamera {
  panX = 0;
  panY = 0;
  zoom = 1;

  get bounds() {
    return { panX: this.panX, panY: this.panY, zoom: this.zoom };
  }

  setPan(panX: number, panY: number) {
    this.panX = panX;
    this.panY = panY;
  }

  fit(nodes: LayoutNode[], width: number, height: number) {
    if (nodes.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let validNodeCount = 0;
    for (const node of nodes) {
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;
      validNodeCount += 1;
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    }
    if (validNodeCount === 0) {
      this.zoom = 1;
      this.panX = width / 2;
      this.panY = height / 2;
      return;
    }

    const boundsWidth = Math.max(maxX - minX, 1);
    const boundsHeight = Math.max(maxY - minY, 1);
    this.zoom = clampZoom(Math.min(Math.max(width, 1) / boundsWidth, Math.max(height, 1) / boundsHeight) * 0.78);
    this.panX = width / 2 - (minX + boundsWidth / 2) * this.zoom;
    this.panY = height / 2 - (minY + boundsHeight / 2) * this.zoom;
  }

  focus(node: LayoutNode, width: number, height: number, zoom = 1.4) {
    this.zoom = clampZoom(zoom);
    this.panX = width / 2 - node.x * this.zoom;
    this.panY = height / 2 - node.y * this.zoom;
  }

  zoomAt(point: GraphPoint, deltaY: number) {
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

export function clampZoom(value: number) {
  return Math.min(maxZoom, Math.max(minZoom, value));
}
