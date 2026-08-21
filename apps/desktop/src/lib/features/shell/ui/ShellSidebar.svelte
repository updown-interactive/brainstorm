<script lang="ts">
  import { MessageSquare, Folder, Network, Settings } from 'lucide-svelte';
  import type { ShellTab } from '../state/state';
  import LiquidGlassPanel from '$lib/shared/ui/LiquidGlassPanel.svelte';

  export let mode: 'hover' | 'expanded';
  export let isRevealed: boolean;
  export let activeTab: ShellTab;
  export let onEnter: () => void;
  export let onLeave: () => void;
  export let onSwitchTab: (tab: ShellTab) => void;

  $: panelClass = mode === 'hover'
    ? `sidebar-overlay ${isRevealed ? 'revealed' : ''}`
    : 'sidebar-wrapper';
</script>

{#if mode === 'hover'}
  <LiquidGlassPanel class={panelClass} onmouseenter={onEnter} onmouseleave={onLeave}>
    <div class="overlay-nav-buttons">
      {@render NavigationButtons()}
    </div>
  </LiquidGlassPanel>
{:else}
  <div class={panelClass} role="region" aria-label="Sidebar navigation" onmouseenter={onEnter} onmouseleave={onLeave}>
    <LiquidGlassPanel class="shell-sidebar">
      {@render NavigationButtons()}
    </LiquidGlassPanel>
  </div>
{/if}

{#snippet NavigationButtons()}
  <button class="sidebar-btn {activeTab === 'chat' ? 'active' : ''}" onclick={() => onSwitchTab('chat')} title="Chat"><MessageSquare size={18} /></button>
  <button class="sidebar-btn {activeTab === 'files' ? 'active' : ''}" onclick={() => onSwitchTab('files')} title="Files"><Folder size={18} /></button>
  <button class="sidebar-btn {activeTab === 'graph' ? 'active' : ''}" onclick={() => onSwitchTab('graph')} title="Graph"><Network size={18} /></button>
  <button class="sidebar-btn {activeTab === 'settings' ? 'active' : ''}" onclick={() => onSwitchTab('settings')} style="margin-top: auto;" title="Settings"><Settings size={18} /></button>
{/snippet}
