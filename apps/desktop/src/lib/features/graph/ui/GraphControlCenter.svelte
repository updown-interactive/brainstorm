<script lang="ts">
	import { ChevronDown, ChevronRight, Minus, Play, Plus, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-svelte';
	import type { GraphConfig, DisplayRangeKey, ForceRangeKey } from '../types';
	import LiquidGlassPanel from '$lib/shared/ui/LiquidGlassPanel.svelte';

	export let config: GraphConfig;
	export let searchQuery = '';

	export let onFitGraph: () => void = () => {};
	export let onZoomIn: () => void = () => {};
	export let onZoomOut: () => void = () => {};
	export let onSearchQueryChange: (query: string) => void = () => {};
	export let onSearchKeydown: (event: KeyboardEvent) => void = () => {};
	export let onUpdateDisplayConfig: (display: Partial<GraphConfig['display']>, restart?: boolean) => void = () => {};
	export let onUpdateForceConfig: (forces: Partial<GraphConfig['forces']>) => void = () => {};
	export let onStartSimulation: (alpha?: number) => void = () => {};
	export let onUpdatePanelConfig: (panel: Partial<GraphConfig['panel']>) => void = () => {};

	function handleDisplayRangeInput(key: DisplayRangeKey, event: Event): void {
		const value = Number((event.currentTarget as HTMLInputElement).value);
		onUpdateDisplayConfig({ [key]: value }, false);
	}

	function handleForceRangeInput(key: ForceRangeKey, event: Event): void {
		const value = Number((event.currentTarget as HTMLInputElement).value);
		onUpdateForceConfig({ [key]: value });
	}

	function handleDisplayRangePointerMove(key: DisplayRangeKey, event: PointerEvent): void {
		if (event.buttons !== 1) return;
		handleDisplayRangeInput(key, event);
	}

	function handleForceRangePointerMove(key: ForceRangeKey, event: PointerEvent): void {
		if (event.buttons !== 1) return;
		handleForceRangeInput(key, event);
	}

	function handleSearchInput(event: Event): void {
		onSearchQueryChange((event.currentTarget as HTMLInputElement).value);
	}

	function formatSignedValue(value: number): string {
		if (value > 0) return `+${value}`;
		return `${value}`;
	}
</script>

<LiquidGlassPanel class="graph-control-center" aria-label="Graph controls">
	<div class="control-header">
		<SlidersHorizontal size={18} />
		<strong>Graph</strong>
		<div class="control-header-actions">
			<button type="button" class="icon-only" title="Zoom in" on:click={() => onZoomIn()}>
				<Plus size={19} />
			</button>
			<button type="button" class="icon-only" title="Zoom out" on:click={() => onZoomOut()}>
				<Minus size={19} />
			</button>
			<button type="button" class="icon-only" title="Fit graph to view" on:click={() => onFitGraph()}>
				<RotateCcw size={19} />
			</button>
			<button type="button" class="icon-only" title="Close controls" on:click={() => onUpdatePanelConfig({ open: false })}>
				<X size={19} />
			</button>
		</div>
	</div>

	<div class="control-section-body standalone-search">
		<label class="control-search liquid-glass-input">
			<Search size={18} />
			<input
				type="search"
				value={searchQuery}
				on:input={handleSearchInput}
				on:keydown={onSearchKeydown}
				placeholder="Search files..."
			/>
		</label>
	</div>

	<div class="control-section">
		<button
			type="button"
			class="control-section-heading"
			on:click={() => onUpdatePanelConfig({ displayOpen: !config.panel.displayOpen })}
		>
			{#if config.panel.displayOpen}
				<ChevronDown size={18} />
			{:else}
				<ChevronRight size={18} />
			{/if}
			<strong>Display</strong>
		</button>
		{#if config.panel.displayOpen}
			<div class="control-section-body">
				<div class="control-row">
					<span>Arrows</span>
					<button
						type="button"
						class:active={config.display.arrows}
						class="control-switch"
						aria-label="Toggle link arrows"
						aria-pressed={config.display.arrows}
						on:click={() => onUpdateDisplayConfig({ arrows: !config.display.arrows })}
					></button>
				</div>
				<label class="control-slider">
					<span>Text fade threshold</span>
					<input
						type="range"
						min="0.2"
						max="1.2"
						step="0.05"
						value={config.display.textFadeThreshold}
						on:input={(event) => handleDisplayRangeInput('textFadeThreshold', event)}
						on:change={(event) => handleDisplayRangeInput('textFadeThreshold', event)}
						on:pointermove={(event) => handleDisplayRangePointerMove('textFadeThreshold', event)}
					/>
				</label>
				<label class="control-slider">
					<span>Node size scale</span>
					<input
						type="range"
						min="0.6"
						max="2.2"
						step="0.05"
						value={config.display.nodeSize}
						on:input={(event) => handleDisplayRangeInput('nodeSize', event)}
						on:change={(event) => handleDisplayRangeInput('nodeSize', event)}
						on:pointermove={(event) => handleDisplayRangePointerMove('nodeSize', event)}
					/>
				</label>
				<label class="control-slider">
					<span>Min node size ({config.display.minNodeSize ?? 8}px)</span>
					<input
						type="range"
						min="8"
						max="20"
						step="1"
						value={config.display.minNodeSize ?? 8}
						on:input={(event) => handleDisplayRangeInput('minNodeSize', event)}
						on:change={(event) => handleDisplayRangeInput('minNodeSize', event)}
						on:pointermove={(event) => handleDisplayRangePointerMove('minNodeSize', event)}
					/>
				</label>
				<label class="control-slider">
					<span>Max node size ({config.display.maxNodeSize ?? 40}px)</span>
					<input
						type="range"
						min="20"
						max="80"
						step="1"
						value={config.display.maxNodeSize ?? 40}
						on:input={(event) => handleDisplayRangeInput('maxNodeSize', event)}
						on:change={(event) => handleDisplayRangeInput('maxNodeSize', event)}
						on:pointermove={(event) => handleDisplayRangePointerMove('maxNodeSize', event)}
					/>
				</label>
				<label class="control-slider">
					<span>Link thickness</span>
					<input
						type="range"
						min="0.4"
						max="3"
						step="0.05"
						value={config.display.linkThickness}
						on:input={(event) => handleDisplayRangeInput('linkThickness', event)}
						on:change={(event) => handleDisplayRangeInput('linkThickness', event)}
						on:pointermove={(event) => handleDisplayRangePointerMove('linkThickness', event)}
					/>
				</label>
				<button type="button" class="animate-button" on:click={() => onStartSimulation(0.9)}>
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
			on:click={() => onUpdatePanelConfig({ forcesOpen: !config.panel.forcesOpen })}
		>
			{#if config.panel.forcesOpen}
				<ChevronDown size={18} />
			{:else}
				<ChevronRight size={18} />
			{/if}
			<strong>Forces</strong>
		</button>
		{#if config.panel.forcesOpen}
			<div class="control-section-body">
				<label class="control-slider">
					<span>Center force ({formatSignedValue(config.forces.center)})</span>
					<input
						type="range"
						min="-50"
						max="50"
						step="1"
						value={config.forces.center}
						on:input={(event) => handleForceRangeInput('center', event)}
						on:change={(event) => handleForceRangeInput('center', event)}
						on:pointermove={(event) => handleForceRangePointerMove('center', event)}
					/>
				</label>
				<label class="control-slider">
					<span>Repel force ({formatSignedValue(config.forces.repel)})</span>
					<input
						type="range"
						min="-50"
						max="50"
						step="1"
						value={config.forces.repel}
						on:input={(event) => handleForceRangeInput('repel', event)}
						on:change={(event) => handleForceRangeInput('repel', event)}
						on:pointermove={(event) => handleForceRangePointerMove('repel', event)}
					/>
				</label>
				<label class="control-slider">
					<span>Link force ({formatSignedValue(config.forces.link)})</span>
					<input
						type="range"
						min="-50"
						max="50"
						step="1"
						value={config.forces.link}
						on:input={(event) => handleForceRangeInput('link', event)}
						on:change={(event) => handleForceRangeInput('link', event)}
						on:pointermove={(event) => handleForceRangePointerMove('link', event)}
					/>
				</label>
				<label class="control-slider">
					<span>Link distance ({formatSignedValue(config.forces.linkDistance)})</span>
					<input
						type="range"
						min="-50"
						max="50"
						step="1"
						value={config.forces.linkDistance}
						on:input={(event) => handleForceRangeInput('linkDistance', event)}
						on:change={(event) => handleForceRangeInput('linkDistance', event)}
						on:pointermove={(event) => handleForceRangePointerMove('linkDistance', event)}
					/>
				</label>
			</div>
		{/if}
	</div>
</LiquidGlassPanel>

<style>
	:global(.graph-control-center) {
		position: absolute;
		top: 12px;
		right: 12px;
		width: min(268px, calc(100% - 24px));
		max-height: calc(100% - 24px);
		border-radius: 14px;
		overflow: auto;
		z-index: 5;
		padding: 0;
	}

	.control-header,
	.control-section-heading,
	.control-row,
	.control-search,
	.animate-button {
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
	.control-switch {
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
	.control-section-heading:hover {
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

	@media (max-width: 900px) {
		:global(.graph-control-center) {
			top: 10px;
			right: 10px;
			width: min(260px, calc(100% - 20px));
			max-height: min(72%, calc(100% - 20px));
		}
	}
</style>
