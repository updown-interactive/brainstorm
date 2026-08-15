<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { createMarkdownController } from '../controller';
	import MarkdownContextMenu from './MarkdownContextMenu.svelte';
	import MarkdownToolbar from './MarkdownToolbar.svelte';

	export let path: string;
	export let initialContent: string | undefined = undefined;
	export let persist = true;
	export let onContentChange: ((content: string) => void) | undefined = undefined;

	const controller = createMarkdownController();

	let editorContainer: HTMLDivElement;
	let markdownContainer: HTMLDivElement;

	$: controller.setPath(path);

	onMount(() => {
		controller.mount({
			editorContainer,
			markdownContainer,
			path,
			initialContent,
			persist,
			onContentChange
		});
	});

	onDestroy(() => {
		controller.destroy();
	});
</script>

<div class="markdown-container" bind:this={markdownContainer}>
	<div class="editor-wrapper" bind:this={editorContainer}></div>

	{#if $controller.view && $controller.isMarkdown}
		<MarkdownToolbar view={$controller.view} />
	{/if}

	{#if $controller.contextMenu && $controller.view}
		<MarkdownContextMenu
			{controller}
			view={$controller.view}
			position={$controller.contextMenu}
			onClose={() => controller.closeContextMenu()}
		/>
	{/if}
</div>

<style>
	.markdown-container {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.editor-wrapper {
		width: 100%;
		height: 100%;
		background-color: var(--colors-background);
	}

	.editor-wrapper :global(.cm-editor) {
		height: 100%;
	}
</style>
