import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { writable, type Unsubscriber } from 'svelte/store';
import { editorState } from '../../files/state/editor';
import { fileTreeController } from '../../files/controller/file-tree-controller';
import { shellState } from '../../shell/state';
import { defaultGraphConfig } from '../config/constants';
import { buildGraphData } from '../data/graph-data';
import { GraphCamera } from '../layouts/graph-camera';
import { readGraphConfig, writeGraphConfig } from '../config/graph-config';
import { centerNodes, GraphPhysicsEngine } from '../engine/graph-physics';
import { GraphRenderer } from '../engine/graph-renderer';
import { GraphRenderScheduler, GraphDirtyFlag } from '../engine/graph-scheduler';
import { GraphRuntimeStore } from '../state/graph-store';
import type { GraphConfig, GraphTheme, KnowledgeNode, LayoutNode } from '../types';

export interface GraphViewState {
	graphConfig: GraphConfig;
	isLoading: boolean;
	error: string;
	searchQuery: string;
	showControls: boolean;
	nodes: LayoutNode[];
	visibleNodes: LayoutNode[];
}

const initialGraphTheme: GraphTheme = {
	background: '',
	border: '',
	primary: '',
	surface: '',
	text: '',
	textMuted: ''
};
const hoverHighlightDelayMs = 280;
const highlightFadeInMs = 180;
const highlightFadeOutMs = 240;

class GraphController {
	private readonly state = writable<GraphViewState>({
		graphConfig: defaultGraphConfig,
		isLoading: false,
		error: '',
		searchQuery: '',
		showControls: false,
		nodes: [],
		visibleNodes: []
	});

	readonly subscribe = this.state.subscribe;

	private readonly store = new GraphRuntimeStore();
	private readonly camera = new GraphCamera();
	private readonly renderer = new GraphRenderer();
	private readonly scheduler = new GraphRenderScheduler(() => this.renderFrame());
	private readonly physics = new GraphPhysicsEngine(
		() => this.store.nodes,
		() => this.store.renderEdges,
		() => this.store.degreeById,
		() => this.graphConfig,
		(duration, iterations) => {
			this.recordTickPerformance(duration, iterations);
			this.perfFrameCount += 1;
			this.scheduler.request(GraphDirtyFlag.Layout);
			this.maybeLogPerformance();
		},
		() => {
			if (this.shouldAutoFit) {
				centerNodes(this.store.nodes);
				this.fitGraph();
			}
		}
	);

	private canvas: HTMLCanvasElement | null = null;
	private dpr = 1;
	private shouldAutoFit = true;
	private unlistenFsChange: UnlistenFn | null = null;
	private unsubscribeShell: Unsubscriber | null = null;
	private rebuildTimeout: ReturnType<typeof setTimeout> | null = null;
	private graphConfigSaveTimeout: ReturnType<typeof setTimeout> | null = null;
	private hoverHighlightTimeout: ReturnType<typeof setTimeout> | null = null;
	private draggingNodeId = '';
	private isPanning = false;
	private panStart = { x: 0, y: 0 };
	private pointerDownPos = { x: 0, y: 0 };
	private activeRootPath = '';
	private graphConfig: GraphConfig = defaultGraphConfig;
	private graphTheme: GraphTheme = initialGraphTheme;
	private resizeObserver: ResizeObserver | null = null;
	private themeObserver: MutationObserver | null = null;
	private perfLastLogAt = 0;
	private perfDrawCount = 0;
	private perfDrawTotal = 0;
	private perfTickCount = 0;
	private perfTickTotal = 0;
	private perfFrameCount = 0;

	mount(canvas: HTMLCanvasElement): void {
		this.canvas = canvas;
		this.renderer.attach(canvas);
		this.dpr = window.devicePixelRatio || 1;
		this.renderer.setDpr(this.dpr);
		this.refreshTheme();
		this.setupResizeObserver();
		this.setupThemeObserver();
		this.unsubscribeShell = shellState.subscribe((state) => {
			const rootPath = state.currentProject?.path ?? '';
			if (rootPath && rootPath !== this.activeRootPath) {
				this.activeRootPath = rootPath;
				void this.initializeGraphRoot();
			} else if (rootPath) {
				this.syncSnapshots();
				this.scheduler.request(GraphDirtyFlag.Graph);
			}
		});
	}

	destroy(): void {
		this.physics.stop();
		this.scheduler.cancel();
		void this.unlistenFsChange?.();
		this.unlistenFsChange = null;
		this.unsubscribeShell?.();
		this.unsubscribeShell = null;
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.themeObserver?.disconnect();
		this.themeObserver = null;
		if (this.rebuildTimeout) clearTimeout(this.rebuildTimeout);
		if (this.graphConfigSaveTimeout) clearTimeout(this.graphConfigSaveTimeout);
		this.clearHoverHighlight();
		this.canvas = null;
	}

	setSearchQuery = (searchQuery: string): void => {
		this.patchState({ searchQuery });
		this.store.updateSearch(searchQuery);
		this.syncSnapshots();
		this.scheduler.request(GraphDirtyFlag.Graph);
	};

	showControlCenter = (): void => {
		this.updatePanelConfig({ open: true });
	};

	updatePanelConfig = (panel: Partial<GraphConfig['panel']>): void => {
		const nextConfig = { ...this.graphConfig, panel: { ...this.graphConfig.panel, ...panel } };
		this.patchState({ showControls: panel.open ?? this.snapshot().showControls });
		this.updateGraphConfig(nextConfig);
	};

	updateDisplayConfig = (display: Partial<GraphConfig['display']>, restart = false): void => {
		this.updateGraphConfig(
			{ ...this.graphConfig, display: { ...this.graphConfig.display, ...display } },
			{ restart, renderMetadata: 'nodeSize' in display || 'minNodeSize' in display || 'maxNodeSize' in display }
		);
	};

	updateForceConfig = (forces: Partial<GraphConfig['forces']>): void => {
		this.updateGraphConfig({ ...this.graphConfig, forces: { ...this.graphConfig.forces, ...forces } }, { restart: true });
	};

	startSimulation = (alpha = 0.55): void => {
		this.physics.start(alpha);
	};

	fitGraph = (targetNodes: LayoutNode[] = this.store.nodes): void => {
		this.shouldAutoFit = true;
		if (!this.canvas || targetNodes.length === 0) {
			this.scheduler.request(GraphDirtyFlag.Camera);
			return;
		}
		this.camera.fit(targetNodes, this.canvas.clientWidth, this.canvas.clientHeight);
		this.scheduler.request(GraphDirtyFlag.Camera);
	};

	zoomIn = (): void => {
		const canvas = this.canvas;
		if (!canvas) return;
		this.shouldAutoFit = false;
		this.camera.zoomStep(1.3, canvas.clientWidth, canvas.clientHeight);
		this.scheduler.request(GraphDirtyFlag.Camera);
	};

	zoomOut = (): void => {
		const canvas = this.canvas;
		if (!canvas) return;
		this.shouldAutoFit = false;
		this.camera.zoomStep(0.75, canvas.clientWidth, canvas.clientHeight);
		this.scheduler.request(GraphDirtyFlag.Camera);
	};

	handleSearchKeydown = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter') return;
		const firstMatch = this.store.visibleNodes[0];
		if (firstMatch) this.focusNode(firstMatch);
	};

	handlePointerDown = (event: PointerEvent): void => {
		const canvas = this.canvas;
		if (!canvas) return;
		this.pointerDownPos = { x: event.clientX, y: event.clientY };
		const point = this.screenToGraph(event);
		const node = this.hitTestNode(point);

		if (node) {
			event.preventDefault();
			this.draggingNodeId = node.id;
			this.pressedNodeId = node.id;
			this.hoverSuppressedNodeId = '';
			this.clearHoverHighlight();
			node.pinned = true;
			this.shouldAutoFit = false;
			canvas.setPointerCapture(event.pointerId);
			this.physics.start(0.35);
			this.scheduler.request(GraphDirtyFlag.Selection);
			return;
		}

		this.pressedNodeId = '';
		this.clearHoverHighlight();
		this.isPanning = true;
		this.shouldAutoFit = false;
		this.panStart = { x: event.clientX - this.camera.panX, y: event.clientY - this.camera.panY };
		canvas.setPointerCapture(event.pointerId);
		canvas.style.cursor = 'grabbing';
	};

	handlePointerMove = (event: PointerEvent): void => {
		const canvas = this.canvas;
		if (!canvas) return;

		if (this.draggingNodeId) {
			const node = this.store.nodeById.get(this.draggingNodeId);
			const point = this.screenToGraph(event);
			if (!node) return;
			node.x = point.x;
			node.y = point.y;
			node.vx = 0;
			node.vy = 0;
			this.store.rebuildSpatialIndex();
			this.scheduler.request(GraphDirtyFlag.Layout);
			return;
		}

		if (this.isPanning) {
			this.camera.setPan(event.clientX - this.panStart.x, event.clientY - this.panStart.y);
			this.scheduler.request(GraphDirtyFlag.Camera);
			return;
		}

		const node = this.hitTestNode(this.screenToGraph(event));
		const nextHoverId = node?.id ?? '';
		canvas.style.cursor = node ? 'pointer' : 'grab';
		if (nextHoverId !== this.hoveredNodeId) {
			this.hoveredNodeId = nextHoverId;
			if (nextHoverId !== this.hoverSuppressedNodeId) {
				this.hoverSuppressedNodeId = '';
				this.scheduleHoverHighlight(nextHoverId);
			} else {
				this.clearHoverHighlight();
			}
			this.scheduler.request(GraphDirtyFlag.Hover);
		}
	};

	handlePointerUp = (event: PointerEvent): void => {
		const canvas = this.canvas;
		if (!canvas) return;

		const releasedNodeId = this.draggingNodeId;
		if (releasedNodeId) {
			const releasedNode = this.store.nodeById.get(releasedNodeId);
			if (releasedNode) releasedNode.pinned = false;
			this.draggingNodeId = '';
			this.pressedNodeId = '';
			this.hoverSuppressedNodeId = releasedNodeId;
			this.clearHoverHighlight();
			this.physics.start(0.24);
		}

		this.isPanning = false;
		if (canvas.hasPointerCapture(event.pointerId)) {
			canvas.releasePointerCapture(event.pointerId);
		}

		const node = this.hitTestNode(this.screenToGraph(event));
		canvas.style.cursor = node ? 'pointer' : 'grab';
		this.hoveredNodeId = node?.id ?? '';
		if (this.hoveredNodeId !== this.hoverSuppressedNodeId) {
			this.hoverSuppressedNodeId = '';
			this.scheduleHoverHighlight(this.hoveredNodeId);
		}
		this.scheduler.request(GraphDirtyFlag.Selection);
	};

	handlePointerLeave = (): void => {
		this.hoveredNodeId = '';
		this.hoverSuppressedNodeId = '';
		this.clearHoverHighlight();
		this.scheduler.request(GraphDirtyFlag.Hover);
	};

	handleWheel = (event: WheelEvent): void => {
		event.preventDefault();
		this.camera.zoomAt(this.screenToGraph(event), event.deltaY);
		this.shouldAutoFit = false;
		this.scheduler.request(GraphDirtyFlag.Camera);
	};

	handleDblClick = (event: MouseEvent): void => {
		const node = this.hitTestNode(this.screenToGraph(event));
		if (node) this.openNode(node);
	};

	private selectedNodeId = '';
	private hoveredNodeId = '';
	private pressedNodeId = '';
	private hoverHighlightNodeId = '';
	private hoverSuppressedNodeId = '';
	private renderedHighlightNodeId = '';
	private highlightTargetNodeId = '';
	private highlightTransitionFrom = 0;
	private highlightTransitionTo = 0;
	private highlightTransitionStartedAt = 0;
	private highlightTransitionDurationMs = highlightFadeInMs;

	private async initializeGraphRoot(): Promise<void> {
		await this.loadGraphConfig();
		await this.setupWatcher();
		await this.rebuildGraph();
	}

	private async loadGraphConfig(): Promise<void> {
		this.graphConfig = await readGraphConfig(this.activeRootPath);
		this.setSearchQuery('');
		this.store.applyNodeSize(
			this.graphConfig.display.nodeSize,
			this.graphConfig.display.minNodeSize,
			this.graphConfig.display.maxNodeSize
		);
		this.renderer.rebuildLabelCache(this.store.nodes, this.graphTheme);
		this.patchState({ graphConfig: this.graphConfig, showControls: this.graphConfig.panel.open });
		this.syncSnapshots();
		this.scheduler.request(GraphDirtyFlag.Settings);
	}

	private updateGraphConfig(
		config: GraphConfig,
		options: { restart?: boolean; renderMetadata?: boolean; relabel?: boolean } = {}
	): void {
		this.graphConfig = config;
		if (options.renderMetadata) {
			this.store.applyNodeSize(
				this.graphConfig.display.nodeSize,
				this.graphConfig.display.minNodeSize,
				this.graphConfig.display.maxNodeSize
			);
		}
		if (options.relabel) {
			this.renderer.rebuildLabelCache(this.store.nodes, this.graphTheme);
		}
		if (options.restart) {
			this.physics.start(0.95, 45);
		}
		this.patchState({ graphConfig: this.graphConfig });
		this.scheduleGraphConfigSave();
		this.scheduler.request(GraphDirtyFlag.Settings);
	}

	private scheduleGraphConfigSave(): void {
		if (this.graphConfigSaveTimeout) clearTimeout(this.graphConfigSaveTimeout);
		this.graphConfigSaveTimeout = setTimeout(() => {
			this.graphConfigSaveTimeout = null;
			void writeGraphConfig(this.activeRootPath, this.graphConfig);
		}, 250);
	}

	private async setupWatcher(): Promise<void> {
		await this.unlistenFsChange?.();
		this.unlistenFsChange = null;

		try {
			this.unlistenFsChange = await listen('fs-change', (event: any) => {
				const changedPath = `${event.payload?.path ?? ''}`.toLocaleLowerCase();
				if (
					!changedPath.endsWith('.md')
					&& !changedPath.endsWith('.mdx')
					&& !changedPath.endsWith('/.brainstorm/configuration/property-config.json')
					&& !changedPath.endsWith('/.brainstorm/property-config.json')
				) return;
				this.scheduleRebuild();
			});
		} catch (watchError) {
			console.error('Failed to watch graph workspace', watchError);
		}
	}

	private scheduleRebuild(): void {
		if (this.rebuildTimeout) clearTimeout(this.rebuildTimeout);
		this.rebuildTimeout = setTimeout(() => {
			this.rebuildTimeout = null;
			void this.rebuildGraph();
		}, 250);
	}

	private async rebuildGraph(): Promise<void> {
		if (!this.activeRootPath) return;
		this.patchState({ isLoading: true, error: '' });

		try {
			const graph = await buildGraphData(this.activeRootPath);
			const graphNodes = graph.nodes
				.filter((node) => node.kind === 'file')
				.filter((node) => !isBrainstormConfigFile(node))
				.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
			const graphIds = new Set(graphNodes.map((node) => node.id));
			const graphEdges = graph.edges
				.filter((edge) => graphIds.has(edge.source) && graphIds.has(edge.target))
				.sort((left, right) => left.id.localeCompare(right.id));

			this.store.setGraph(
				graphNodes,
				graphEdges,
				this.graphConfig.display.nodeSize,
				this.graphConfig.display.minNodeSize,
				this.graphConfig.display.maxNodeSize
			);
			this.renderer.rebuildLabelCache(this.store.nodes, this.graphTheme);
			this.selectedNodeId = this.selectedNodeId && this.store.nodeById.has(this.selectedNodeId) ? this.selectedNodeId : '';
			this.hoverHighlightNodeId = this.hoverHighlightNodeId && this.store.nodeById.has(this.hoverHighlightNodeId) ? this.hoverHighlightNodeId : '';
			this.pressedNodeId = this.pressedNodeId && this.store.nodeById.has(this.pressedNodeId) ? this.pressedNodeId : '';
			this.syncSnapshots();
			this.fitGraph();
			this.physics.start(0.95);
		} catch (graphError) {
			this.physics.stop();
			this.store.clear();
			this.syncSnapshots();
			this.selectedNodeId = '';
			this.pressedNodeId = '';
			this.clearHoverHighlight();
			this.patchState({
				error: graphError instanceof Error ? graphError.message : 'Failed to build graph.'
			});
			this.scheduler.request(GraphDirtyFlag.Graph);
		} finally {
			this.patchState({ isLoading: false });
		}
	}

	private renderFrame(): void {
		const canvas = this.canvas;
		if (!canvas) return;
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		if (width <= 0 || height <= 0) return;

		this.store.rebuildVisible(this.camera.visibleBounds(width, height));
		this.syncSnapshots();
		const now = performance.now();
		this.updateHighlightTransition(this.activeHighlightNodeId(), now);
		const activeNodeId = this.renderedHighlightNodeId;
		const highlightOpacity = this.currentHighlightOpacity(now);
		const selectionHighlights = this.buildSelectionHighlights(activeNodeId);
		const drawDuration = this.renderer.render({
			width,
			height,
			dpr: this.dpr,
			panX: this.camera.panX,
			panY: this.camera.panY,
			zoom: this.camera.zoom,
			theme: this.graphTheme,
			visibleNodes: this.store.visibleRenderNodes,
			visibleEdges: this.store.visibleRenderEdges,
			selectedNodeId: this.selectedNodeId,
			hoveredNodeId: this.hoveredNodeId,
			activeNodeId,
			highlightOpacity,
			highlightedNodeIds: selectionHighlights.nodeIds,
			highlightedEdgeIds: selectionHighlights.edgeIds,
			animationTime: now,
			arrows: this.graphConfig.display.arrows,
			linkThickness: this.graphConfig.display.linkThickness,
			textFadeThreshold: this.graphConfig.display.textFadeThreshold,
			degreeById: this.store.degreeById,
			nodeById: this.store.nodeById
		});
		this.recordDrawPerformance(drawDuration);
		this.maybeLogPerformance();
		if (activeNodeId || highlightOpacity > 0) {
			this.scheduler.request(GraphDirtyFlag.Selection);
		}
	}

	private focusNode(node: LayoutNode): void {
		const canvas = this.canvas;
		if (!canvas) return;
		this.shouldAutoFit = false;
		this.selectedNodeId = node.id;
		this.camera.focus(node, canvas.clientWidth, canvas.clientHeight);
		this.scheduler.request(GraphDirtyFlag.Camera | GraphDirtyFlag.Selection);
	}

	private scheduleHoverHighlight(nodeId: string): void {
		if (this.hoverHighlightTimeout) {
			clearTimeout(this.hoverHighlightTimeout);
			this.hoverHighlightTimeout = null;
		}
		this.hoverHighlightNodeId = '';
		if (!nodeId || this.pressedNodeId) {
			return;
		}
		this.hoverHighlightTimeout = setTimeout(() => {
			this.hoverHighlightTimeout = null;
			if (this.hoveredNodeId !== nodeId || this.pressedNodeId) return;
			this.hoverHighlightNodeId = nodeId;
			this.scheduler.request(GraphDirtyFlag.Selection);
		}, hoverHighlightDelayMs);
	}

	private clearHoverHighlight(): void {
		if (this.hoverHighlightTimeout) {
			clearTimeout(this.hoverHighlightTimeout);
			this.hoverHighlightTimeout = null;
		}
		this.hoverHighlightNodeId = '';
	}

	private activeHighlightNodeId(): string {
		return this.pressedNodeId || this.hoverHighlightNodeId;
	}

	private updateHighlightTransition(nextNodeId: string, now: number): void {
		if (nextNodeId === this.highlightTargetNodeId) return;

		const currentOpacity = this.currentHighlightOpacity(now);
		this.highlightTargetNodeId = nextNodeId;
		this.highlightTransitionStartedAt = now;
		this.highlightTransitionTo = nextNodeId ? 1 : 0;
		this.highlightTransitionDurationMs = nextNodeId ? highlightFadeInMs : highlightFadeOutMs;

		if (nextNodeId) {
			this.renderedHighlightNodeId = nextNodeId;
			this.highlightTransitionFrom = nextNodeId === this.renderedHighlightNodeId ? currentOpacity : 0;
		} else {
			this.highlightTransitionFrom = currentOpacity;
		}
	}

	private currentHighlightOpacity(now: number): number {
		const elapsed = now - this.highlightTransitionStartedAt;
		const progress = this.highlightTransitionDurationMs > 0
			? Math.min(1, Math.max(0, elapsed / this.highlightTransitionDurationMs))
			: 1;
		const easedProgress = easeInOutSine(progress);
		const opacity = this.highlightTransitionFrom + (this.highlightTransitionTo - this.highlightTransitionFrom) * easedProgress;
		if (opacity <= 0.001 && this.highlightTransitionTo === 0) {
			this.renderedHighlightNodeId = '';
			return 0;
		}
		return opacity;
	}

	private buildSelectionHighlights(activeNodeId: string): { nodeIds: Set<string>; edgeIds: Set<string> } {
		const nodeIds = new Set<string>();
		const edgeIds = new Set<string>();
		if (!activeNodeId) return { nodeIds, edgeIds };

		nodeIds.add(activeNodeId);
		for (const edge of this.store.renderEdges) {
			if (edge.source !== activeNodeId && edge.target !== activeNodeId) continue;
			edgeIds.add(edge.id);
			nodeIds.add(edge.source);
			nodeIds.add(edge.target);
		}

		return { nodeIds, edgeIds };
	}

	private openNode(node: LayoutNode | null): void {
		if (!node?.path) return;
		fileTreeController.setFocusedPath(node.path);
		editorState.openFile(node.path, node.name, true);
		shellState.update((state) => ({ ...state, activeTab: 'files' }));
	}

	private screenToGraph(event: PointerEvent | WheelEvent | MouseEvent): { x: number; y: number } {
		if (!this.canvas) return { x: 0, y: 0 };
		return this.camera.screenToGraph(event.clientX, event.clientY, this.canvas.getBoundingClientRect());
	}

	private hitTestNode(point: { x: number; y: number }): LayoutNode | null {
		if (this.canvas) {
			this.store.rebuildVisible(this.camera.visibleBounds(this.canvas.clientWidth, this.canvas.clientHeight));
		}
		return this.store.hitTest(point, this.camera.zoom);
	}

	private setupResizeObserver(): void {
		const canvas = this.canvas;
		if (!canvas?.parentElement) return;
		this.resizeObserver?.disconnect();
		this.resizeObserver = new ResizeObserver(([entry]) => {
			const { width, height } = entry.contentRect;
			canvas.width = Math.max(1, Math.floor(width * this.dpr));
			canvas.height = Math.max(1, Math.floor(height * this.dpr));
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;
			if (this.store.nodes.length > 0) {
				this.fitGraph(this.store.visibleNodes.length > 0 ? this.store.visibleNodes : this.store.nodes);
			} else {
				this.scheduler.request(GraphDirtyFlag.Camera);
			}
		});
		this.resizeObserver.observe(canvas.parentElement);
	}

	private setupThemeObserver(): void {
		this.themeObserver?.disconnect();
		this.themeObserver = new MutationObserver(() => {
			this.refreshTheme();
			this.renderer.rebuildLabelCache(this.store.nodes, this.graphTheme);
			this.scheduler.request(GraphDirtyFlag.Labels);
		});
		this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
	}

	private refreshTheme(): void {
		if (!this.canvas) return;
		const style = getComputedStyle(this.canvas);
		this.graphTheme = {
			background: readThemeColor(style, '--colors-background', style.backgroundColor),
			border: readThemeColor(style, '--colors-border', style.color),
			primary: readThemeColor(style, '--colors-primary', style.color),
			surface: readThemeColor(style, '--colors-surface', style.backgroundColor),
			text: readThemeColor(style, '--colors-text', style.color),
			textMuted: readThemeColor(style, '--colors-text-muted', style.color)
		};
	}

	private syncSnapshots(): void {
		this.patchState({
			nodes: this.store.nodes,
			visibleNodes: this.store.visibleNodes
		});
	}

	private recordDrawPerformance(duration: number): void {
		this.perfDrawCount += 1;
		this.perfDrawTotal += duration;
	}

	private recordTickPerformance(duration: number, iterations: number): void {
		this.perfTickCount += iterations;
		this.perfTickTotal += duration;
	}

	private maybeLogPerformance(): void {
		const now = performance.now();
		if (now - this.perfLastLogAt < 1000) return;

		const elapsedSeconds = this.perfLastLogAt > 0 ? (now - this.perfLastLogAt) / 1000 : 1;
		const avgDraw = this.perfDrawCount > 0 ? this.perfDrawTotal / this.perfDrawCount : 0;
		const avgTick = this.perfTickCount > 0 ? this.perfTickTotal / this.perfTickCount : 0;
		const fps = this.perfFrameCount / elapsedSeconds;
		const drawsPerSecond = this.perfDrawCount / elapsedSeconds;

		console.info(
			`[GraphPerf] nodes=${this.store.nodes.length} edges=${this.store.edges.length} avgDraw=${avgDraw.toFixed(2)}ms avgTick=${avgTick.toFixed(2)}ms fps=${fps.toFixed(1)} draws/s=${drawsPerSecond.toFixed(1)} zoom=${this.camera.zoom.toFixed(2)}`
		);
		void invoke('log_graph_perf', {
			nodes: this.store.nodes.length,
			edges: this.store.edges.length,
			avgDrawMs: avgDraw,
			avgTickMs: avgTick,
			fps,
			drawsPerSecond,
			zoom: this.camera.zoom
		});

		this.perfLastLogAt = now;
		this.perfDrawCount = 0;
		this.perfDrawTotal = 0;
		this.perfTickCount = 0;
		this.perfTickTotal = 0;
		this.perfFrameCount = 0;
	}

	private patchState(patch: Partial<GraphViewState>): void {
		this.state.update((state) => ({ ...state, ...patch }));
	}

	private snapshot(): GraphViewState {
		let value!: GraphViewState;
		const unsubscribe = this.state.subscribe((state) => {
			value = state;
		});
		unsubscribe();
		return value;
	}
}

function isBrainstormConfigFile(node: KnowledgeNode): boolean {
	const relativePath = node.relativePath.toLocaleLowerCase();
	return relativePath.startsWith('.brainstorm/') || relativePath.includes('/.brainstorm/');
}

function readThemeColor(style: CSSStyleDeclaration, name: string, fallback: string): string {
	return style.getPropertyValue(name).trim() || fallback;
}

function easeInOutSine(value: number): number {
	return -(Math.cos(Math.PI * value) - 1) / 2;
}

export const graphController = new GraphController();
