<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { JsonInspectorController } from '../controller/json-inspector-controller';

  export let content = '';
  export let error = '';
  export let onChange: (content: string) => void = () => {};

  let editorHost: HTMLDivElement;
  const controller = new JsonInspectorController();

  $: controller.updateContent(content);

  onMount(() => {
    controller.mount(editorHost, content, onChange);
  });

  onDestroy(() => {
    controller.destroy();
  });
</script>

<div class="json-editor-shell">
  <div class="json-inspector" bind:this={editorHost}></div>
  {#if error}
    <div class="json-inline-error" role="status">{error}</div>
  {/if}
</div>

<style>
  .json-editor-shell {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    background-color: var(--colors-background);
  }

  .json-inspector {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    background-color: var(--colors-background);
  }

  .json-inspector :global(.cm-editor) {
    height: 100%;
  }

  .json-inline-error {
    min-height: 32px;
    display: flex;
    align-items: center;
    border-top: 1px solid var(--colors-border);
    background-color: color-mix(in srgb, var(--colors-error) 12%, var(--colors-background));
    color: var(--colors-error);
    padding: 6px 12px;
    font-size: 12px;
    line-height: 1.35;
  }
</style>
