<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import YAML from 'yaml';
  import { onDestroy } from 'svelte';
  import YamlInspector from './YamlInspector.svelte';

  export let path: string;

  let content = '';
  let error = '';
  let loadedPath = '';
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  $: if (path && path !== loadedPath) void loadFile(path);

  async function loadFile(nextPath: string): Promise<void> {
    loadedPath = nextPath;
    error = '';
    try {
      content = await invoke<string>('read_file', { path: nextPath });
    } catch (loadError) {
      content = '';
      error = loadError instanceof Error ? loadError.message : 'Unable to read YAML file.';
    }
  }

  function handleChange(nextContent: string): void {
    content = nextContent;
    try {
      if (nextContent.trim()) YAML.parse(nextContent);
      error = '';
    } catch (parseError) {
      error = parseError instanceof Error ? parseError.message : 'Invalid YAML.';
      if (saveTimer) clearTimeout(saveTimer);
      return;
    }

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      saveTimer = null;
      try {
        await invoke('write_file', { path: loadedPath, content: nextContent });
      } catch (saveError) {
        error = saveError instanceof Error ? saveError.message : 'Unable to save YAML file.';
      }
    }, 400);
  }

  onDestroy(() => {
    if (saveTimer) clearTimeout(saveTimer);
  });
</script>

<YamlInspector {content} {error} onChange={handleChange} />
