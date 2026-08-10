<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import LiquidGlassPanel from './LiquidGlassPanel.svelte';

	export let value: string = '';
	export let onSelect: (value: string) => void = () => {};

	const dispatch = createEventDispatcher<{
		select: string;
		close: void;
	}>();

	function parseDate(str: string): Date | null {
		if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
		const [year, month, day] = str.split('-').map(Number);
		return new Date(year, month - 1, day);
	}

	function formatDate(date: Date): string {
		const year = date.getFullYear();
		const month = `${date.getMonth() + 1}`.padStart(2, '0');
		const day = `${date.getDate()}`.padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function monthStart(date: Date): Date {
		return new Date(date.getFullYear(), date.getMonth(), 1);
	}

	function isSameDate(a: Date | null, b: Date | null): boolean {
		if (!a || !b) return false;
		return (
			a.getFullYear() === b.getFullYear() &&
			a.getMonth() === b.getMonth() &&
			a.getDate() === b.getDate()
		);
	}

	let selectedDate = parseDate(value);
	let visibleMonth = monthStart(selectedDate || new Date());
	let viewMode: 'days' | 'years' = 'days';
	let yearRangeStart = Math.floor(visibleMonth.getFullYear() / 12) * 12;

	$: selectedDate = parseDate(value);

	function prevHeader() {
		if (viewMode === 'years') {
			yearRangeStart -= 12;
		} else {
			visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
		}
	}

	function nextHeader() {
		if (viewMode === 'years') {
			yearRangeStart += 12;
		} else {
			visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
		}
	}

	function toggleYearSelector() {
		if (viewMode === 'days') {
			yearRangeStart = Math.floor(visibleMonth.getFullYear() / 12) * 12;
			viewMode = 'years';
		} else {
			viewMode = 'days';
		}
	}

	function selectYear(year: number) {
		visibleMonth = new Date(year, visibleMonth.getMonth(), 1);
		viewMode = 'days';
	}

	function selectDate(date: Date) {
		const formatted = formatDate(date);
		onSelect(formatted);
		dispatch('select', formatted);
	}

	$: monthTitle = visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
	$: yearRangeTitle = `${yearRangeStart} – ${yearRangeStart + 11}`;
	$: startOffset = visibleMonth.getDay();
	$: daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
</script>

<LiquidGlassPanel class="calendar-picker-panel" role="dialog" aria-label="Calendar date picker">
	<div class="calendar-header">
		<button type="button" class="calendar-nav-button" title={viewMode === 'years' ? 'Previous years' : 'Previous month'} on:click={prevHeader}>
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="15 18 9 12 15 6"></polyline>
			</svg>
		</button>

		<button type="button" class="calendar-title-btn" title={viewMode === 'years' ? 'Back to calendar' : 'Select year'} on:click={toggleYearSelector}>
			<span class="calendar-title-text">{viewMode === 'years' ? yearRangeTitle : monthTitle}</span>
			<svg class="calendar-title-chevron" class:is-flipped={viewMode === 'years'} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="6 9 12 15 18 9"></polyline>
			</svg>
		</button>

		<button type="button" class="calendar-nav-button" title={viewMode === 'years' ? 'Next years' : 'Next month'} on:click={nextHeader}>
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="9 18 15 12 9 6"></polyline>
			</svg>
		</button>
	</div>

	{#if viewMode === 'years'}
		<div class="calendar-years-grid">
			{#each Array(12) as _, i}
				{@const year = yearRangeStart + i}
				{@const isSelectedYear = visibleMonth.getFullYear() === year}
				<button
					type="button"
					class="calendar-year-item"
					class:is-selected={isSelectedYear}
					on:click={() => selectYear(year)}
				>
					{year}
				</button>
			{/each}
		</div>
	{:else}
		<div class="calendar-grid">
			{#each ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as day}
				<div class="calendar-weekday">{day}</div>
			{/each}

			{#each Array(startOffset) as _}
				<div class="calendar-empty"></div>
			{/each}

			{#each Array(daysInMonth) as _, i}
				{@const dayNumber = i + 1}
				{@const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), dayNumber)}
				{@const isSelected = isSameDate(date, selectedDate)}
				<button
					type="button"
					class="calendar-day"
					class:is-selected={isSelected}
					on:click={() => selectDate(date)}
				>
					{dayNumber}
				</button>
			{/each}
		</div>
	{/if}
</LiquidGlassPanel>

<style>
	:global(.calendar-picker-panel) {
		position: fixed;
		z-index: 999999;
		width: 280px !important;
		box-sizing: border-box !important;
		padding: 12px !important;
		border-radius: 16px !important;
		display: flex !important;
		flex-direction: column !important;
		gap: 10px !important;
		user-select: none;
		max-height: none !important;
		height: auto !important;
		overflow: visible !important;
	}

	.calendar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		margin-bottom: 2px;
	}

	.calendar-title-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px;
		border: 0;
		background: transparent;
		color: var(--colors-text);
		font-family: inherit;
		font-size: 13px;
		font-weight: 600;
		letter-spacing: -0.01em;
		cursor: pointer;
		border-radius: 6px;
		transition: background-color 0.15s ease;
	}

	.calendar-title-btn:hover {
		background-color: color-mix(in srgb, var(--colors-text) 10%, transparent);
	}

	.calendar-title-chevron {
		transition: transform 0.2s ease;
	}

	.calendar-title-chevron.is-flipped {
		transform: rotate(180deg);
	}

	.calendar-nav-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: 1px solid color-mix(in srgb, var(--colors-border) 60%, transparent);
		border-radius: 8px;
		background-color: color-mix(in srgb, var(--colors-surface) 70%, transparent);
		color: var(--colors-text);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.calendar-nav-button:hover {
		background-color: var(--colors-primary);
		border-color: var(--colors-primary);
		color: var(--colors-onPrimary, #ffffff);
	}

	.calendar-grid {
		display: grid;
		grid-template-columns: repeat(7, 32px);
		justify-content: space-between;
		row-gap: 4px;
		width: 100%;
		max-height: none !important;
		overflow: visible !important;
	}

	.calendar-years-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
		width: 100%;
		min-height: 200px;
		align-content: center;
	}

	.calendar-year-item {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 42px;
		border: 0;
		border-radius: 10px;
		font-family: inherit;
		font-size: 13px;
		font-weight: 500;
		background-color: color-mix(in srgb, var(--colors-surface) 60%, transparent);
		color: var(--colors-text);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.calendar-year-item:hover:not(.is-selected) {
		background-color: color-mix(in srgb, var(--colors-primary) 18%, transparent);
		color: var(--colors-primary);
	}

	.calendar-year-item.is-selected {
		background-color: var(--colors-primary);
		color: var(--colors-onPrimary, #ffffff);
		font-weight: 600;
		box-shadow: 0 3px 10px color-mix(in srgb, var(--colors-primary) 40%, transparent);
	}

	.calendar-weekday {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 24px;
		font-size: 11px;
		font-weight: 600;
		color: var(--colors-textMuted);
	}

	.calendar-empty {
		width: 32px;
		height: 32px;
	}

	.calendar-day {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: 0;
		border-radius: 8px;
		font-family: inherit;
		font-size: 12.5px;
		font-weight: 500;
		background-color: transparent;
		color: var(--colors-text);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.calendar-day:hover:not(.is-selected) {
		background-color: color-mix(in srgb, var(--colors-primary) 18%, transparent);
		color: var(--colors-primary);
	}

	.calendar-day.is-selected {
		background-color: var(--colors-primary);
		color: var(--colors-onPrimary, #ffffff);
		font-weight: 600;
		box-shadow: 0 3px 10px color-mix(in srgb, var(--colors-primary) 40%, transparent);
	}
</style>
