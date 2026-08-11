<script lang="ts">
  import { onMount } from 'svelte';
  import { filesController } from '../controller';
  
  export let initialValue = '';
  export let depth = 0;
  
  let value = initialValue;
  let inputEl: HTMLInputElement;
  
  onMount(() => {
    inputEl.focus();
    if (initialValue) {
      // Select filename without extension
      const dotIndex = initialValue.lastIndexOf('.');
      if (dotIndex > 0) {
        inputEl.setSelectionRange(0, dotIndex);
      } else {
        inputEl.select();
      }
    }
  });
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      filesController.handleInlineCommit(value);
    } else if (e.key === 'Escape') {
      filesController.handleInlineCancel();
    }
  }
</script>

<div class="inline-input-wrapper" style="padding-left: {depth * 12 + 4}px;">
  <input 
    bind:this={inputEl}
    bind:value
    onkeydown={handleKeydown}
    onblur={() => filesController.handleInlineCommit(value)}
    class="inline-input"
  />
</div>

<style>
  .inline-input-wrapper {
    display: flex;
    align-items: center;
    padding-top: 2px;
    padding-bottom: 2px;
    padding-right: 8px;
    margin: 0 4px;
  }
  
  .inline-input {
    width: 100%;
    background: var(--colors-surfaceVariant);
    border: 1px solid var(--colors-primary);
    color: var(--colors-text);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
    outline: none;
  }
</style>
