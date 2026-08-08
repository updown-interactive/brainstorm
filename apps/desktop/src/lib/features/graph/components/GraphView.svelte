<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { SlidersHorizontal } from 'lucide-svelte';
	import { graphController } from '../controller';
	import GraphControlCenter from './GraphControlCenter.svelte';
	import GraphEmptyState from './GraphEmptyState.svelte';

	let canvas: HTMLCanvasElement;

	onMount(() => {
		graphController.mount(canvas);
	});

	onDestroy(() => {
		graphController.destroy();
	});
</script>

<div class="graph-view">
	{#if $graphController.showControls}
		<GraphControlCenter
			config={$graphController.graphConfig}
			searchQuery={$graphController.searchQuery}
			onFitGraph={graphController.fitGraph}
			onZoomIn={graphController.zoomIn}
			onZoomOut={graphController.zoomOut}
			onSearchQueryChange={graphController.setSearchQuery}
			onUpdateDisplayConfig={graphController.updateDisplayConfig}
			onUpdateForceConfig={graphController.updateForceConfig}
			onStartSimulation={graphController.startSimulation}
			onUpdatePanelConfig={graphController.updatePanelConfig}
			onSearchKeydown={graphController.handleSearchKeydown}
		/>
	{:else}
		<button type="button" class="graph-controls-open liquid-glass-input" title="Open graph controls" on:click={graphController.showControlCenter}>
			<SlidersHorizontal size={18} />
		</button>
	{/if}

	<div class="graph-content">
		<main class="graph-canvas" aria-label="Markdown file graph">
			<canvas
				bind:this={canvas}
				on:pointerdown={graphController.handlePointerDown}
				on:pointermove={graphController.handlePointerMove}
				on:pointerup={graphController.handlePointerUp}
				on:pointercancel={graphController.handlePointerUp}
				on:pointerleave={graphController.handlePointerLeave}
				on:wheel={graphController.handleWheel}
				on:dblclick={graphController.handleDblClick}
			></canvas>

			{#if $graphController.error}
				<GraphEmptyState title="Graph failed to load" message={$graphController.error} />
			{:else if $graphController.isLoading && $graphController.nodes.length === 0}
				<GraphEmptyState title="Building graph" message="Reading markdown files from this project." />
			{:else if $graphController.nodes.length === 0}
				<GraphEmptyState title="No markdown files" message="Create a markdown file in this project to show it here." />
			{:else if $graphController.visibleNodes.length === 0}
				<GraphEmptyState title="No matching files" message="Try a different file name or folder." />
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

	.graph-controls-open {
		position: absolute;
		top: 12px;
		right: 12px;
		z-index: 5;
		justify-content: center;
		width: 34px;
		height: 34px;
		border: 1px solid var(--colors-border);
		border-radius: 9px;
		background: var(--colors-surface);
		color: var(--colors-text-muted);
		cursor: pointer;
	}

	.graph-controls-open:hover {
		color: var(--colors-text);
		background: var(--colors-hover);
	}
</style>
