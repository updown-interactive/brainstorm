import type { GraphConfig } from '../types';
import type { LayoutNode, RenderEdge } from '../types';

const collisionPadding = 20;
const settledVelocityDamping = 0.82;
const boostedVelocityDamping = 0.88;
const settledAlphaDecay = 0.985;
const boostedAlphaDecay = 0.992;
const maxVelocity = 260;
const maxCoordinate = 100000;

interface PerceptualForceSettings {
	centerStrength: number;
	centerRadiusPressure: number;
	repelStrength: number;
	repelRadius: number;
	linkStrength: number;
	linkDistance: number;
	degreeBonus: number;
}

export interface GraphPhysicsState {
	ticks: number;
	alpha: number;
	active: boolean;
}

export class GraphPhysicsEngine {
	private frame = 0;
	private alpha = 0;
	private ticks = 0;
	private boostFrames = 0;

	constructor(
		private readonly getNodes: () => LayoutNode[],
		private readonly getEdges: () => RenderEdge[],
		private readonly getDegreeById: () => Map<string, number>,
		private readonly getConfig: () => GraphConfig,
		private readonly onFrame: (duration: number, iterations: number) => void,
		private readonly onSettled: () => void
	) {}

	get state(): GraphPhysicsState {
		return {
			ticks: this.ticks,
			alpha: this.alpha,
			active: Boolean(this.frame)
		};
	}

	start(alpha = 0.55, boostFrames = 0): void {
		this.alpha = Math.max(this.alpha, alpha);
		this.boostFrames = Math.max(this.boostFrames, boostFrames);
		this.ticks = 0;
		if (this.frame) return;
		this.frame = requestAnimationFrame(() => this.runFrame());
	}

	stop(): void {
		if (!this.frame) return;
		cancelAnimationFrame(this.frame);
		this.frame = 0;
	}

	private runFrame(): void {
		this.frame = 0;
		const nodes = this.getNodes();
		const iterations = nodes.length > 160 ? 1 : 2;
		const start = performance.now();

		for (let index = 0; index < iterations; index += 1) {
			this.tick();
		}

		this.onFrame(performance.now() - start, iterations);
		this.ticks += iterations;
		this.alpha *= this.boostFrames > 0 ? boostedAlphaDecay : settledAlphaDecay;
		this.boostFrames = Math.max(0, this.boostFrames - 1);

		if (this.alpha > 0.018 && this.ticks < 1100) {
			this.frame = requestAnimationFrame(() => this.runFrame());
		} else {
			this.alpha = 0;
			this.onSettled();
		}
	}

	private tick(): void {
		const nodes = this.getNodes();
		if (nodes.length === 0) return;

		const settings = perceptualForceSettings(this.getConfig());
		this.applyChargeForce(nodes, settings);
		this.applyLinkForce(settings);
		this.applyCenterForce(nodes, settings);
		this.applyCollisionForce(nodes);

		for (const node of nodes) {
			if (node.pinned) {
				node.vx = 0;
				node.vy = 0;
				continue;
			}

			const damping = this.boostFrames > 0 ? boostedVelocityDamping : settledVelocityDamping;
			node.vx *= damping;
			node.vy *= damping;
			limitNodeVelocity(node);
			node.x += node.vx * this.alpha;
			node.y += node.vy * this.alpha;
			sanitizeNodePosition(node);
		}
	}

	private applyChargeForce(nodes: LayoutNode[], settings: PerceptualForceSettings): void {
		if (nodes.length <= 220) {
			for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
				for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
					this.repelPair(nodes[leftIndex], nodes[rightIndex], settings);
				}
			}
			return;
		}

		const cellSize = Math.max(140, settings.repelRadius / 2);
		const grid = new Map<string, LayoutNode[]>();
		for (const node of nodes) {
			const key = `${Math.floor(node.x / cellSize)}:${Math.floor(node.y / cellSize)}`;
			const bucket = grid.get(key);
			if (bucket) {
				bucket.push(node);
			} else {
				grid.set(key, [node]);
			}
		}

		for (const node of nodes) {
			const cellX = Math.floor(node.x / cellSize);
			const cellY = Math.floor(node.y / cellSize);
			const reach = Math.max(1, Math.ceil(settings.repelRadius / cellSize));
			for (let x = cellX - reach; x <= cellX + reach; x += 1) {
				for (let y = cellY - reach; y <= cellY + reach; y += 1) {
					for (const other of grid.get(`${x}:${y}`) ?? []) {
						if (node.id >= other.id) continue;
						this.repelPair(node, other, settings);
					}
				}
			}
		}
	}

	private repelPair(left: LayoutNode, right: LayoutNode, settings: PerceptualForceSettings): void {
		const dx = right.x - left.x || seededJitter(left.id, right.id);
		const dy = right.y - left.y || seededJitter(right.id, left.id);
		const distance = Math.max(1, Math.hypot(dx, dy));
		const falloff = 1 - clamp(distance / settings.repelRadius, 0, 1);
		if (falloff <= 0) return;
		const force = (settings.repelStrength * falloff * falloff) / (distance + 40);
		const fx = (dx / distance) * force;
		const fy = (dy / distance) * force;

		if (!left.pinned) {
			left.vx -= fx;
			left.vy -= fy;
		}
		if (!right.pinned) {
			right.vx += fx;
			right.vy += fy;
		}
	}

	private applyLinkForce(settings: PerceptualForceSettings): void {
		const degreeById = this.getDegreeById();
		for (const edge of this.getEdges()) {
			const source = edge.sourceNode;
			const target = edge.targetNode;
			const dx = target.x - source.x || 0.01;
			const dy = target.y - source.y || 0.01;
			const distance = Math.max(1, Math.hypot(dx, dy));
			const sourceDegree = degreeById.get(source.id) ?? 1;
			const targetDegree = degreeById.get(target.id) ?? 1;
			const degreeBonus = Math.min(settings.degreeBonus, Math.sqrt(sourceDegree + targetDegree) * 14);
			const desired = settings.linkDistance + degreeBonus;
			const force = (distance - desired) * settings.linkStrength;
			const fx = (dx / distance) * force;
			const fy = (dy / distance) * force;

			if (!source.pinned) {
				source.vx += fx;
				source.vy += fy;
			}
			if (!target.pinned) {
				target.vx -= fx;
				target.vy -= fy;
			}
		}
	}

	private applyCenterForce(nodes: LayoutNode[], settings: PerceptualForceSettings): void {
		const centroid = graphCentroid(nodes);
		for (const node of nodes) {
			if (node.pinned) continue;
			const dx = node.x - centroid.x;
			const dy = node.y - centroid.y;
			node.vx += -dx * settings.centerStrength;
			node.vy += -dy * settings.centerStrength;
			if (settings.centerRadiusPressure > 0) {
				node.vx -= node.vx * settings.centerRadiusPressure * 0.015;
				node.vy -= node.vy * settings.centerRadiusPressure * 0.015;
			}
		}
	}

	private applyCollisionForce(nodes: LayoutNode[]): void {
		if (nodes.length > 220) {
			this.applyGridCollisionForce(nodes);
			return;
		}

		for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
			for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
				collidePair(nodes[leftIndex], nodes[rightIndex]);
			}
		}
	}

	private applyGridCollisionForce(nodes: LayoutNode[]): void {
		const cellSize = 110;
		const grid = new Map<string, LayoutNode[]>();

		for (const node of nodes) {
			const key = `${Math.floor(node.x / cellSize)}:${Math.floor(node.y / cellSize)}`;
			const bucket = grid.get(key);
			if (bucket) {
				bucket.push(node);
			} else {
				grid.set(key, [node]);
			}
		}

		for (const node of nodes) {
			const cellX = Math.floor(node.x / cellSize);
			const cellY = Math.floor(node.y / cellSize);
			for (let x = cellX - 1; x <= cellX + 1; x += 1) {
				for (let y = cellY - 1; y <= cellY + 1; y += 1) {
					for (const other of grid.get(`${x}:${y}`) ?? []) {
						if (node.id >= other.id) continue;
						collidePair(node, other);
					}
				}
			}
		}
	}
}

export function centerNodes(nodes: LayoutNode[]): void {
	if (nodes.length === 0) return;
	const centerX = nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length;
	const centerY = nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length;
	for (const node of nodes) {
		node.x -= centerX;
		node.y -= centerY;
	}
}

function collidePair(left: LayoutNode, right: LayoutNode): void {
	const dx = right.x - left.x || 0.01;
	const dy = right.y - left.y || 0.01;
	const distance = Math.max(1, Math.hypot(dx, dy));
	const minimum = left.radius + right.radius + collisionPadding;
	if (distance >= minimum) return;

	const force = ((minimum - distance) / distance) * 0.08;
	const fx = dx * force;
	const fy = dy * force;
	if (!left.pinned) {
		left.vx -= fx;
		left.vy -= fy;
	}
	if (!right.pinned) {
		right.vx += fx;
		right.vy += fy;
	}
}

function limitNodeVelocity(node: LayoutNode): void {
	if (!Number.isFinite(node.vx)) node.vx = 0;
	if (!Number.isFinite(node.vy)) node.vy = 0;

	const speed = Math.hypot(node.vx, node.vy);
	if (speed <= maxVelocity) return;

	const scale = maxVelocity / speed;
	node.vx *= scale;
	node.vy *= scale;
}

function sanitizeNodePosition(node: LayoutNode): void {
	if (!Number.isFinite(node.x)) node.x = seededCoordinate(node.id, 'x');
	if (!Number.isFinite(node.y)) node.y = seededCoordinate(node.id, 'y');
	node.x = clamp(node.x, -maxCoordinate, maxCoordinate);
	node.y = clamp(node.y, -maxCoordinate, maxCoordinate);
}

function seededJitter(left: string, right: string): number {
	return ((stableHash(`${left}:${right}`) % 200) - 100) / 1000 || 0.01;
}

function seededCoordinate(id: string, axis: string): number {
	return ((stableHash(`${id}:${axis}`) % 2000) - 1000) / 10;
}

function perceptualForceSettings(config: GraphConfig): PerceptualForceSettings {
	const uCenter = clamp(config.forces.center / 50, -1, 1);
	const uRepel = clamp(config.forces.repel / 50, -1, 1);
	const uLink = clamp(config.forces.link / 50, -1, 1);
	const uLinkDistance = clamp(config.forces.linkDistance / 50, -1, 1);

	const centerFactor = Math.max(0, 1 + uCenter);
	const centerStrength = uCenter <= 0
		? lerp(0.0005, 0.018, expCurve(centerFactor, 3.2))
		: 0.018 * (1 + uCenter * 0.8);
	const centerRadiusPressure = uCenter <= 0
		? lerp(0, 0.9, expCurve(centerFactor, 2.4))
		: 0.9 + uCenter * 0.3;

	const repelFactor = Math.max(0, 1 + uRepel);
	const repelStrength = uRepel <= 0
		? lerp(120, 9000, expCurve(repelFactor, 3))
		: lerp(9000, 18000, uRepel);
	const repelRadius = uRepel <= 0
		? lerp(120, 900, expCurve(repelFactor, 2.2))
		: lerp(900, 1400, uRepel);

	const linkStrength = uLink <= 0
		? 0.005
		: lerp(0.005, 0.25, expCurve(uLink, 2.5));

	const linkDistFactor = Math.max(0, 1 + uLinkDistance);
	const linkDistance = uLinkDistance <= 0
		? lerp(35, 520, expCurve(linkDistFactor, 2.4))
		: lerp(520, 950, uLinkDistance);
	const degreeBonus = uLinkDistance <= 0
		? lerp(0, 120, linkDistFactor)
		: lerp(120, 200, uLinkDistance);

	return {
		centerStrength,
		centerRadiusPressure,
		repelStrength,
		repelRadius,
		linkStrength,
		linkDistance,
		degreeBonus
	};
}

function graphCentroid(nodes: LayoutNode[]): { x: number; y: number } {
	if (nodes.length === 0) return { x: 0, y: 0 };
	let x = 0;
	let y = 0;
	for (const node of nodes) {
		x += node.x;
		y += node.y;
	}
	return { x: x / nodes.length, y: y / nodes.length };
}

function percent(value: number): number {
	return clamp(value / 100, 0, 1);
}

function expCurve(value: number, curve: number): number {
	return (Math.exp(curve * value) - 1) / (Math.exp(curve) - 1);
}

function lerp(min: number, max: number, value: number): number {
	return min + (max - min) * value;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function stableHash(value: string): number {
	let hash = 0;
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
	}
	return hash;
}