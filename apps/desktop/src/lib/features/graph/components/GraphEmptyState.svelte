<script lang="ts">
	export let title = '';
	export let message = '';
</script>

<div class="graph-empty">
	<strong>{title}</strong>
	<span>{message}</span>
</div>

<style>
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
</style>