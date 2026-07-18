<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { listen, type UnlistenFn } from '@tauri-apps/api/event';
  import { invoke } from '@tauri-apps/api/core';
  import { ChevronDown, ChevronRight, Play, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-svelte';
  import { shellState } from '../shell/state';
  import { editorState } from '../files/stores/editor';
  import { buildKnowledgeGraph, type KnowledgeNode } from './graph-engine';
  import { defaultGraphConfig, readGraphConfig, writeGraphConfig, type GraphConfig } from './graph-config';
  import { GraphCamera } from './graph-camera';
  import { centerNodes, GraphPhysicsEngine } from './graph-physics';
  import { GraphRenderer } from './graph-renderer';
  import { GraphRenderScheduler, GraphDirtyFlag } from './graph-scheduler';
  import { GraphRuntimeStore } from './graph-store';
  import type { GraphTheme, LayoutNode } from './graph-types';
  import { normalizeTagColor, normalizeTagName, readPropertyConfig } from '../markdown/tag-registry';

  type DisplayRangeKey = 'textFadeThreshold' | 'nodeSize' | 'linkThickness';
  type ForceRangeKey = 'center' | 'repel' | 'link' | 'linkDistance';

  const store = new GraphRuntimeStore();
  const camera = new GraphCamera();
  const renderer = new GraphRenderer();
  const scheduler = new GraphRenderScheduler(renderFrame);
  const physics = new GraphPhysicsEngine(
    () => store.nodes,
    () => store.renderEdges,
    () => store.degreeById,
    () => graphConfig,
    (duration, iterations) => {
      recordTickPerformance(duration, iterations);
      perfFrameCount += 1;
      scheduler.request(GraphDirtyFlag.Layout);
      maybeLogPerformance();
    },
    () => {
      if (shouldAutoFit) {
        centerNodes(store.nodes);
        fitGraph();
      }
    }
  );

  let nodes: LayoutNode[] = [];
  let visibleNodes: LayoutNode[] = [];
  let selectedNodeId = '';
  let hoveredNodeId = '';
  let searchQuery = '';
  let graphConfig: GraphConfig = defaultGraphConfig;
  let graphConfigSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  let isLoading = false;
  let error = '';
  let canvas: HTMLCanvasElement;
  let dpr = 1;
  let shouldAutoFit = true;
  let unlistenFsChange: UnlistenFn | null = null;
  let rebuildTimeout: ReturnType<typeof setTimeout> | null = null;
  let draggingNodeId = '';
  let isPanning = false;
  let panStart = { x: 0, y: 0 };
  let pointerDownPos = { x: 0, y: 0 };
  let activeRootPath = '';
  let perfLastLogAt = 0;
  let perfDrawCount = 0;
  let perfDrawTotal = 0;
  let perfTickCount = 0;
  let perfTickTotal = 0;
  let perfFrameCount = 0;
  let graphTheme: GraphTheme = {
    background: '',
    border: '',
    primary: '',
    surface: '',
    text: '',
    textMuted: ''
  };

  $: rootPath = $shellState.currentProject?.path ?? '';
  $: {
    searchQuery;
    store.updateSearch(searchQuery);
    syncSnapshots();
    scheduler.request(GraphDirtyFlag.Graph);
  }

  $: if (rootPath && rootPath !== activeRootPath) {
    activeRootPath = rootPath;
    void initializeGraphRoot();
  }

  onMount(() => {
    renderer.attach(canvas);
    dpr = window.devicePixelRatio || 1;
    renderer.setDpr(dpr);
    refreshTheme();

    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      if (store.nodes.length > 0) {
        fitGraph(store.visibleNodes.length > 0 ? store.visibleNodes : store.nodes);
      } else {
        scheduler.request(GraphDirtyFlag.Camera);
      }
    });

    const themeObserver = new MutationObserver(() => {
      refreshTheme();
      renderer.rebuildLabelCache(store.nodes, graphTheme);
      scheduler.request(GraphDirtyFlag.Labels);
    });

    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });

    return () => {
      resizeObserver.disconnect();
      themeObserver.disconnect();
    };
  });

  onDestroy(() => {
    physics.stop();
    scheduler.cancel();
    void unlistenFsChange?.();
    if (rebuildTimeout) clearTimeout(rebuildTimeout);
    if (graphConfigSaveTimeout) clearTimeout(graphConfigSaveTimeout);
  });

  async function initializeGraphRoot() {
    await loadGraphConfig();
    await setupWatcher();
    await rebuildGraph();
  }

  async function loadGraphConfig() {
    graphConfig = await readGraphConfig(rootPath);
    searchQuery = '';
    store.applyNodeSize(graphConfig.display.nodeSize);
    renderer.rebuildLabelCache(store.nodes, graphTheme);
    syncSnapshots();
    scheduler.request(GraphDirtyFlag.Settings);
  }

  function updateGraphConfig(config: GraphConfig, options: { restart?: boolean; renderMetadata?: boolean; relabel?: boolean } = {}) {
    graphConfig = config;
    if (options.renderMetadata) {
      store.applyNodeSize(graphConfig.display.nodeSize);
    }
    if (options.relabel) {
      renderer.rebuildLabelCache(store.nodes, graphTheme);
    }
    if (options.restart) {
      physics.start(0.95, 45);
    }
    scheduleGraphConfigSave();
    scheduler.request(GraphDirtyFlag.Settings);
  }

  function scheduleGraphConfigSave() {
    if (graphConfigSaveTimeout) clearTimeout(graphConfigSaveTimeout);
    graphConfigSaveTimeout = setTimeout(() => {
      graphConfigSaveTimeout = null;
      void writeGraphConfig(rootPath, graphConfig);
    }, 250);
  }

  function updatePanelConfig(panel: Partial<GraphConfig['panel']>) {
    updateGraphConfig({ ...graphConfig, panel: { ...graphConfig.panel, ...panel } });
  }

  function updateDisplayConfig(display: Partial<GraphConfig['display']>, restart = false) {
    updateGraphConfig(
      { ...graphConfig, display: { ...graphConfig.display, ...display } },
      { restart, renderMetadata: 'nodeSize' in display }
    );
  }

  function updateForceConfig(forces: Partial<GraphConfig['forces']>) {
    updateGraphConfig({ ...graphConfig, forces: { ...graphConfig.forces, ...forces } }, { restart: true });
  }

  function startSimulation(alpha = 0.55) {
    physics.start(alpha);
  }

  function handleDisplayRangeInput(key: DisplayRangeKey, event: Event) {
    updateDisplayConfig({ [key]: rangeInputValue(event) }, false);
  }

  function handleForceRangeInput(key: ForceRangeKey, event: Event) {
    updateForceConfig({ [key]: rangeInputValue(event) });
  }

  function handleDisplayRangePointerMove(key: DisplayRangeKey, event: PointerEvent) {
    if (event.buttons !== 1) return;
    handleDisplayRangeInput(key, event);
  }

  function handleForceRangePointerMove(key: ForceRangeKey, event: PointerEvent) {
    if (event.buttons !== 1) return;
    handleForceRangeInput(key, event);
  }

  function rangeInputValue(event: Event) {
    return Number((event.currentTarget as HTMLInputElement).value);
  }

  async function setupWatcher() {
    await unlistenFsChange?.();
    unlistenFsChange = null;

    try {
      unlistenFsChange = await listen('fs-change', (event: any) => {
        const changedPath = `${event.payload?.path ?? ''}`.toLocaleLowerCase();
        if (
          !changedPath.endsWith('.md')
          && !changedPath.endsWith('.mdx')
          && !changedPath.endsWith('/.brainstorm/property-config.json')
        ) return;
        scheduleRebuild();
      });
    } catch (watchError) {
      console.error('Failed to watch graph workspace', watchError);
    }
  }

  function scheduleRebuild() {
    if (rebuildTimeout) clearTimeout(rebuildTimeout);
    rebuildTimeout = setTimeout(() => {
      rebuildTimeout = null;
      void rebuildGraph();
    }, 250);
  }

  async function rebuildGraph() {
    if (!rootPath) return;
    isLoading = true;
    error = '';

    try {
      const graph = await buildKnowledgeGraph(rootPath, false);
      const graphNodes = graph.nodes
        .filter((node) => node.kind === 'file')
        .filter((node) => !isBrainstormConfigFile(node))
        .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
      await applyTagColors(graphNodes);
      const graphIds = new Set(graphNodes.map((node) => node.id));
      const graphEdges = graph.edges
        .filter((edge) => graphIds.has(edge.source) && graphIds.has(edge.target))
        .sort((left, right) => left.id.localeCompare(right.id));

      store.setGraph(graphNodes, graphEdges, graphConfig.display.nodeSize);
      renderer.rebuildLabelCache(store.nodes, graphTheme);
      selectedNodeId = selectedNodeId && store.nodeById.has(selectedNodeId) ? selectedNodeId : '';
      syncSnapshots();
      fitGraph();
      physics.start(0.95);
    } catch (graphError) {
      physics.stop();
      store.clear();
      syncSnapshots();
      selectedNodeId = '';
      error = graphError instanceof Error ? graphError.message : 'Failed to build graph.';
      scheduler.request(GraphDirtyFlag.Graph);
    } finally {
      isLoading = false;
    }
  }

  function renderFrame() {
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width <= 0 || height <= 0) return;

    store.rebuildVisible(camera.visibleBounds(width, height));
    syncSnapshots();
    const drawDuration = renderer.render({
      width,
      height,
      dpr,
      panX: camera.panX,
      panY: camera.panY,
      zoom: camera.zoom,
      theme: graphTheme,
      visibleNodes: store.visibleRenderNodes,
      visibleEdges: store.visibleRenderEdges,
      selectedNodeId,
      hoveredNodeId,
      arrows: graphConfig.display.arrows,
      linkThickness: graphConfig.display.linkThickness,
      textFadeThreshold: graphConfig.display.textFadeThreshold,
      degreeById: store.degreeById,
      nodeById: store.nodeById
    });
    recordDrawPerformance(drawDuration);
    maybeLogPerformance();
  }

  function fitGraph(targetNodes: LayoutNode[] = store.nodes) {
    shouldAutoFit = true;
    if (!canvas || targetNodes.length === 0) {
      scheduler.request(GraphDirtyFlag.Camera);
      return;
    }
    camera.fit(targetNodes, canvas.clientWidth, canvas.clientHeight);
    scheduler.request(GraphDirtyFlag.Camera);
  }

  function focusNode(node: LayoutNode) {
    if (!canvas) return;
    shouldAutoFit = false;
    selectedNodeId = node.id;
    camera.focus(node, canvas.clientWidth, canvas.clientHeight);
    scheduler.request(GraphDirtyFlag.Camera | GraphDirtyFlag.Selection);
  }

  function selectNode(node: LayoutNode) {
    selectedNodeId = node.id;
    scheduler.request(GraphDirtyFlag.Selection);
  }

  function openNode(node: LayoutNode | null) {
    if (!node?.path) return;
    editorState.openFile(node.path, node.name, true);
  }

  function handleSearchKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    const firstMatch = store.visibleNodes[0];
    if (firstMatch) focusNode(firstMatch);
  }

  function handlePointerDown(event: PointerEvent) {
    pointerDownPos = { x: event.clientX, y: event.clientY };
    const point = screenToGraph(event);
    const node = hitTestNode(point);

    if (node) {
      event.preventDefault();
      selectedNodeId = node.id;
      draggingNodeId = node.id;
      node.pinned = true;
      shouldAutoFit = false;
      canvas.setPointerCapture(event.pointerId);
      physics.start(0.35);
      scheduler.request(GraphDirtyFlag.Selection);
      return;
    }

    isPanning = true;
    shouldAutoFit = false;
    panStart = { x: event.clientX - camera.panX, y: event.clientY - camera.panY };
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
  }

  function handlePointerMove(event: PointerEvent) {
    if (draggingNodeId) {
      const node = store.nodeById.get(draggingNodeId);
      const point = screenToGraph(event);
      if (!node) return;
      node.x = point.x;
      node.y = point.y;
      node.vx = 0;
      node.vy = 0;
      store.rebuildSpatialIndex();
      scheduler.request(GraphDirtyFlag.Layout);
      return;
    }

    if (isPanning) {
      camera.setPan(event.clientX - panStart.x, event.clientY - panStart.y);
      scheduler.request(GraphDirtyFlag.Camera);
      return;
    }

    const node = hitTestNode(screenToGraph(event));
    const nextHoverId = node?.id ?? '';
    canvas.style.cursor = node ? 'pointer' : 'grab';
    if (nextHoverId !== hoveredNodeId) {
      hoveredNodeId = nextHoverId;
      scheduler.request(GraphDirtyFlag.Hover);
    }
  }

  function handlePointerUp(event: PointerEvent) {
    const wasPanning = isPanning;
    const moved = Math.hypot(event.clientX - pointerDownPos.x, event.clientY - pointerDownPos.y);

    if (draggingNodeId) {
      const node = store.nodeById.get(draggingNodeId);
      if (node) node.pinned = false;
      draggingNodeId = '';
      physics.start(0.24);
    }

    isPanning = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    if (moved < 4 && !wasPanning) {
      const node = hitTestNode(screenToGraph(event));
      if (node) selectNode(node);
    }

    canvas.style.cursor = hitTestNode(screenToGraph(event)) ? 'pointer' : 'grab';
    scheduler.request(GraphDirtyFlag.Selection);
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    const point = screenToGraph(event);
    camera.zoomAt(point, event.deltaY);
    shouldAutoFit = false;
    scheduler.request(GraphDirtyFlag.Camera);
  }

  function handleDblClick(event: MouseEvent) {
    const node = hitTestNode(screenToGraph(event));
    if (node) openNode(node);
  }

  function screenToGraph(event: PointerEvent | WheelEvent | MouseEvent) {
    return camera.screenToGraph(event.clientX, event.clientY, canvas.getBoundingClientRect());
  }

  function hitTestNode(point: { x: number; y: number }) {
    if (canvas) {
      store.rebuildVisible(camera.visibleBounds(canvas.clientWidth, canvas.clientHeight));
    }
    return store.hitTest(point, camera.zoom);
  }

  function syncSnapshots() {
    nodes = store.nodes;
    visibleNodes = store.visibleNodes;
  }

  function isBrainstormConfigFile(node: KnowledgeNode) {
    const relativePath = node.relativePath.toLocaleLowerCase();
    return relativePath.startsWith('.brainstorm/') || relativePath.includes('/.brainstorm/');
  }

  async function applyTagColors(graphNodes: KnowledgeNode[]) {
    const propertyConfig = await readPropertyConfig(rootPath);
    const colorByTag = new Map(
      (propertyConfig.tags ?? []).map((tag) => [
        normalizeTagName(tag.name).toLocaleLowerCase(),
        normalizeTagColor(tag.color)
      ])
    );

    for (const node of graphNodes) {
      const match = node.tags
        .map((tag) => normalizeTagName(tag).toLocaleLowerCase())
        .find((tag) => colorByTag.has(tag));
      node.color = match ? (colorByTag.get(match) ?? '') : '';
    }
  }

  function refreshTheme() {
    if (!canvas) return;
    const style = getComputedStyle(canvas);
    graphTheme = {
      background: readThemeColor(style, '--colors-background', style.backgroundColor),
      border: readThemeColor(style, '--colors-border', style.color),
      primary: readThemeColor(style, '--colors-primary', style.color),
      surface: readThemeColor(style, '--colors-surface', style.backgroundColor),
      text: readThemeColor(style, '--colors-text', style.color),
      textMuted: readThemeColor(style, '--colors-text-muted', style.color)
    };
  }

  function readThemeColor(style: CSSStyleDeclaration, name: string, fallback: string) {
    return style.getPropertyValue(name).trim() || fallback;
  }

  function recordDrawPerformance(duration: number) {
    perfDrawCount += 1;
    perfDrawTotal += duration;
  }

  function recordTickPerformance(duration: number, iterations: number) {
    perfTickCount += iterations;
    perfTickTotal += duration;
  }

  function maybeLogPerformance() {
    const now = performance.now();
    if (now - perfLastLogAt < 1000) return;

    const elapsedSeconds = perfLastLogAt > 0 ? (now - perfLastLogAt) / 1000 : 1;
    const avgDraw = perfDrawCount > 0 ? perfDrawTotal / perfDrawCount : 0;
    const avgTick = perfTickCount > 0 ? perfTickTotal / perfTickCount : 0;
    const fps = perfFrameCount / elapsedSeconds;
    const drawsPerSecond = perfDrawCount / elapsedSeconds;

    console.info(
      `[GraphPerf] nodes=${store.nodes.length} edges=${store.edges.length} avgDraw=${avgDraw.toFixed(2)}ms avgTick=${avgTick.toFixed(2)}ms fps=${fps.toFixed(1)} draws/s=${drawsPerSecond.toFixed(1)} zoom=${camera.zoom.toFixed(2)}`
    );
    void invoke('log_graph_perf', {
      nodes: store.nodes.length,
      edges: store.edges.length,
      avgDrawMs: avgDraw,
      avgTickMs: avgTick,
      fps,
      drawsPerSecond,
      zoom: camera.zoom
    });

    perfLastLogAt = now;
    perfDrawCount = 0;
    perfDrawTotal = 0;
    perfTickCount = 0;
    perfTickTotal = 0;
    perfFrameCount = 0;
  }
</script>

<div class="graph-view">
  {#if graphConfig.panel.open}
    <section class="graph-control-center" aria-label="Graph controls">
      <div class="control-header">
        <SlidersHorizontal size={18} />
        <strong>Graph</strong>
        <div class="control-header-actions">
          <button type="button" class="icon-only" title="Reset graph view" on:click={() => fitGraph(visibleNodes.length > 0 ? visibleNodes : nodes)}>
            <RotateCcw size={19} />
          </button>
          <button type="button" class="icon-only" title="Close controls" on:click={() => updatePanelConfig({ open: false })}>
            <X size={19} />
          </button>
        </div>
      </div>

      <div class="control-section-body standalone-search">
        <label class="control-search">
          <Search size={18} />
          <input
            type="search"
            bind:value={searchQuery}
            on:keydown={handleSearchKeydown}
            placeholder="Search files..."
          />
        </label>
      </div>

      <div class="control-section">
        <button
          type="button"
          class="control-section-heading"
          on:click={() => updatePanelConfig({ displayOpen: !graphConfig.panel.displayOpen })}
        >
          {#if graphConfig.panel.displayOpen}
            <ChevronDown size={18} />
          {:else}
            <ChevronRight size={18} />
          {/if}
          <strong>Display</strong>
        </button>
        {#if graphConfig.panel.displayOpen}
          <div class="control-section-body">
            <div class="control-row">
              <span>Arrows</span>
              <button
                type="button"
                class:active={graphConfig.display.arrows}
                class="control-switch"
                aria-label="Toggle link arrows"
                aria-pressed={graphConfig.display.arrows}
                on:click={() => updateDisplayConfig({ arrows: !graphConfig.display.arrows })}
              ></button>
            </div>
            <label class="control-slider">
              <span>Text fade threshold</span>
              <input
                type="range"
                min="0.2"
                max="1.2"
                step="0.05"
                value={graphConfig.display.textFadeThreshold}
                on:input={(event) => handleDisplayRangeInput('textFadeThreshold', event)}
                on:change={(event) => handleDisplayRangeInput('textFadeThreshold', event)}
                on:pointermove={(event) => handleDisplayRangePointerMove('textFadeThreshold', event)}
              />
            </label>
            <label class="control-slider">
              <span>Node size</span>
              <input
                type="range"
                min="0.6"
                max="2.2"
                step="0.05"
                value={graphConfig.display.nodeSize}
                on:input={(event) => handleDisplayRangeInput('nodeSize', event)}
                on:change={(event) => handleDisplayRangeInput('nodeSize', event)}
                on:pointermove={(event) => handleDisplayRangePointerMove('nodeSize', event)}
              />
            </label>
            <label class="control-slider">
              <span>Link thickness</span>
              <input
                type="range"
                min="0.4"
                max="3"
                step="0.05"
                value={graphConfig.display.linkThickness}
                on:input={(event) => handleDisplayRangeInput('linkThickness', event)}
                on:change={(event) => handleDisplayRangeInput('linkThickness', event)}
                on:pointermove={(event) => handleDisplayRangePointerMove('linkThickness', event)}
              />
            </label>
            <button type="button" class="animate-button" on:click={() => startSimulation(0.9)}>
              <Play size={16} />
              <span>Animate</span>
            </button>
          </div>
        {/if}
      </div>

      <div class="control-section">
        <button
          type="button"
          class="control-section-heading"
          on:click={() => updatePanelConfig({ forcesOpen: !graphConfig.panel.forcesOpen })}
        >
          {#if graphConfig.panel.forcesOpen}
            <ChevronDown size={18} />
          {:else}
            <ChevronRight size={18} />
          {/if}
          <strong>Forces</strong>
        </button>
        {#if graphConfig.panel.forcesOpen}
          <div class="control-section-body">
            <label class="control-slider">
              <span>Center force</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={graphConfig.forces.center}
                on:input={(event) => handleForceRangeInput('center', event)}
                on:change={(event) => handleForceRangeInput('center', event)}
                on:pointermove={(event) => handleForceRangePointerMove('center', event)}
              />
            </label>
            <label class="control-slider">
              <span>Repel force</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={graphConfig.forces.repel}
                on:input={(event) => handleForceRangeInput('repel', event)}
                on:change={(event) => handleForceRangeInput('repel', event)}
                on:pointermove={(event) => handleForceRangePointerMove('repel', event)}
              />
            </label>
            <label class="control-slider">
              <span>Link force</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={graphConfig.forces.link}
                on:input={(event) => handleForceRangeInput('link', event)}
                on:change={(event) => handleForceRangeInput('link', event)}
                on:pointermove={(event) => handleForceRangePointerMove('link', event)}
              />
            </label>
            <label class="control-slider">
              <span>Link distance</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={graphConfig.forces.linkDistance}
                on:input={(event) => handleForceRangeInput('linkDistance', event)}
                on:change={(event) => handleForceRangeInput('linkDistance', event)}
                on:pointermove={(event) => handleForceRangePointerMove('linkDistance', event)}
              />
            </label>
          </div>
        {/if}
      </div>
    </section>
  {:else}
    <button type="button" class="graph-controls-open" title="Open graph controls" on:click={() => updatePanelConfig({ open: true })}>
      <SlidersHorizontal size={18} />
    </button>
  {/if}

  <div class="graph-content">
    <main class="graph-canvas" aria-label="Markdown file graph">
      <canvas
        bind:this={canvas}
        on:pointerdown={handlePointerDown}
        on:pointermove={handlePointerMove}
        on:pointerup={handlePointerUp}
        on:pointercancel={handlePointerUp}
        on:wheel={handleWheel}
        on:dblclick={handleDblClick}
      ></canvas>

      {#if error}
        <div class="graph-empty">
          <strong>Graph failed to load</strong>
          <span>{error}</span>
        </div>
      {:else if isLoading && nodes.length === 0}
        <div class="graph-empty">
          <strong>Building graph</strong>
          <span>Reading markdown files from this project.</span>
        </div>
      {:else if nodes.length === 0}
        <div class="graph-empty">
          <strong>No markdown files</strong>
          <span>Create a markdown file in this project to show it here.</span>
        </div>
      {:else if visibleNodes.length === 0}
        <div class="graph-empty">
          <strong>No matching files</strong>
          <span>Try a different file name or folder.</span>
        </div>
      {/if}
    </main>

  </div>
</div>

<style>
  .graph-view {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    color: var(--colors-text);
    background: var(--colors-background);
  }

  .graph-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
    flex: 1;
  }

  .graph-canvas {
    position: relative;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: var(--colors-background);
  }

  .graph-canvas canvas {
    display: block;
    width: 100%;
    height: 100%;
    cursor: grab;
    touch-action: none;
  }

  .graph-control-center,
  .graph-controls-open {
    position: absolute;
    z-index: 5;
  }

  .graph-control-center {
    top: 12px;
    right: 12px;
    width: min(268px, calc(100% - 24px));
    max-height: calc(100% - 24px);
    border: 1px solid var(--colors-border);
    border-radius: 10px;
    background: color-mix(in srgb, var(--colors-surface) 92%, transparent);
    box-shadow: 0 8px 22px color-mix(in srgb, var(--colors-background) 68%, transparent);
    overflow: auto;
    backdrop-filter: blur(12px);
  }

  .control-header,
  .control-section-heading,
  .control-row,
  .control-search,
  .animate-button,
  .graph-controls-open {
    display: flex;
    align-items: center;
  }

  .control-header {
    gap: 7px;
    padding: 8px 10px 7px;
  }

  .control-header strong,
  .control-section-heading strong {
    font-size: 0.9rem;
  }

  .control-header-actions {
    display: flex;
    gap: 4px;
    margin-left: auto;
  }

  .icon-only,
  .control-section-heading,
  .control-switch,
  .graph-controls-open {
    border: 0;
    background: transparent;
    color: var(--colors-text-muted);
    cursor: pointer;
  }

  .icon-only {
    display: grid;
    width: 24px;
    height: 24px;
    place-items: center;
    padding: 0;
    border-radius: 7px;
  }

  .icon-only:hover,
  .control-section-heading:hover,
  .graph-controls-open:hover {
    color: var(--colors-text);
    background: var(--colors-border);
  }

  .control-section {
    border-top: 1px solid var(--colors-border);
  }

  .control-section-heading {
    width: 100%;
    gap: 7px;
    padding: 8px 10px;
    text-align: left;
  }

  .control-section-body {
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding: 0 10px 10px;
  }

  .standalone-search {
    padding-top: 0;
  }

  .control-search {
    min-width: 0;
    gap: 8px;
    height: 34px;
    padding: 0 9px;
    border: 1px solid var(--colors-border);
    border-radius: 7px;
    background: var(--colors-background);
    color: var(--colors-text-muted);
  }

  .control-search:focus-within {
    border-color: var(--colors-primary);
  }

  .control-search input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--colors-text);
    font: inherit;
    font-size: 0.86rem;
  }

  .control-row {
    justify-content: space-between;
    gap: 10px;
    min-height: 26px;
    font-weight: 700;
    font-size: 0.84rem;
  }

  .control-switch {
    position: relative;
    flex: 0 0 auto;
    width: 38px;
    height: 20px;
    border-radius: 999px;
    background: var(--colors-border);
  }

  .control-switch::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 4px;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: var(--colors-text);
    transition: transform 140ms ease;
  }

  .control-switch.active {
    background: var(--colors-primary);
  }

  .control-switch.active::after {
    transform: translateX(16px);
  }

  .control-slider {
    display: grid;
    gap: 5px;
    font-weight: 700;
    font-size: 0.84rem;
  }

  .control-slider input {
    width: 100%;
    height: 18px;
    accent-color: var(--colors-primary);
    cursor: pointer;
  }

  .animate-button {
    justify-content: center;
    gap: 6px;
    width: 100%;
    height: 32px;
    border: 0;
    border-radius: 7px;
    background: var(--colors-primary);
    color: var(--colors-text);
    font: inherit;
    font-size: 0.86rem;
    font-weight: 800;
    cursor: pointer;
  }

  .animate-button:hover {
    filter: brightness(1.08);
  }

  .graph-controls-open {
    top: 12px;
    right: 12px;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 1px solid var(--colors-border);
    border-radius: 9px;
    background: var(--colors-surface);
  }

  .graph-empty {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    gap: 8px;
    padding: 24px;
    text-align: center;
    pointer-events: none;
  }

  .graph-empty span {
    color: var(--colors-text-muted);
  }

  @media (max-width: 900px) {
    .graph-control-center {
      top: 10px;
      right: 10px;
      width: min(260px, calc(100% - 20px));
      max-height: min(72%, calc(100% - 20px));
    }
  }
</style>
