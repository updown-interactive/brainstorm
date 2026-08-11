<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { YamlInspectorController } from '../controller/yaml-inspector-controller';

  export let content = '';
  export let error = '';
  export let onChange: (content: string) => void = () => {};

  let editorHost: HTMLDivElement;
  const controller = new YamlInspectorController();

  $: controller.updateContent(content);

  onMount(() => controller.mount(editorHost, content, onChange));
  onDestroy(() => controller.destroy());
</script>

<div class="yaml-editor-shell">
  <div class="yaml-inspector" bind:this={editorHost}></div>
  {#if error}
    <div class="yaml-inline-error" role="status">{error}</div>
  {/if}
</div>

<style>
  .yaml-editor-shell, .yaml-inspector { width: 100%; height: 100%; min-width: 0; min-height: 0; }
  .yaml-editor-shell { display: grid; grid-template-rows: minmax(0, 1fr) auto; background-color: var(--colors-background); }
  .yaml-inspector :global(.cm-editor) { height: 100%; }
  .yaml-inline-error {
    min-height: 32px; display: flex; align-items: center; padding: 6px 12px;
    border-top: 1px solid var(--colors-border);
    background-color: color-mix(in srgb, var(--colors-error) 12%, var(--colors-background));
    color: var(--colors-error); font-size: 12px; line-height: 1.35;
  }
</style>
