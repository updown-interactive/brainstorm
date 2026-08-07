<script lang="ts">
	import {
		Activity,
		Shield,
		Sliders,
		Terminal,
		Zap,
		FileText,
		Brain,
		Book,
		Calendar,
		Database,
		Code,
		Sparkles,
		Bot,
		Check,
		Edit,
		Save,
		X,
		GitBranch,
		Lock,
		Radio
	} from 'lucide-svelte';
	import type { AgentDocumentKind, AgentPackage } from '../types';
	import { agentDocumentFileNames } from '../config';

	export let agentPackage: AgentPackage;
	export let onSaveDocument: (docKind: AgentDocumentKind, content: string) => Promise<void>;

	let activeTab: AgentDocumentKind | 'overview' | 'status' | 'tasks' | 'history' = 'overview';
	let isEditingDoc = false;
	let editingContent = '';
	let saveMessage = '';

	const documentTabs: Array<{ id: AgentDocumentKind; label: string }> = [
		{ id: 'system', label: 'SYSTEM' },
		{ id: 'role', label: 'ROLE' },
		{ id: 'workflow', label: 'WORKFLOW' },
		{ id: 'rules', label: 'RULES' },
		{ id: 'communication', label: 'COMMUNICATION' },
		{ id: 'memory', label: 'MEMORY' },
		{ id: 'prompts', label: 'PROMPTS' },
		{ id: 'skills', label: 'SKILLS' },
		{ id: 'tools', label: 'TOOLS' },
		{ id: 'knowledge', label: 'KNOWLEDGE' }
	];

	function selectTab(tab: typeof activeTab) {
		activeTab = tab;
		isEditingDoc = false;
		saveMessage = '';
	}

	function startEdit() {
		if (activeTab === 'overview' || activeTab === 'status' || activeTab === 'tasks' || activeTab === 'history') return;
		editingContent = agentPackage.documents[activeTab] || '';
		isEditingDoc = true;
		saveMessage = '';
	}

	function cancelEdit() {
		isEditingDoc = false;
		saveMessage = '';
	}

	async function saveEdit() {
		if (activeTab === 'overview' || activeTab === 'status' || activeTab === 'tasks' || activeTab === 'history') return;
		await onSaveDocument(activeTab, editingContent);
		isEditingDoc = false;
		saveMessage = 'Saved!';
		setTimeout(() => (saveMessage = ''), 2000);
	}
</script>

<div class="agent-package-inspector" style="--agent-primary-color: {agentPackage.manifest.color || '#2979FF'};">
	<!-- Hero Banner -->
	<header class="agent-hero-banner">
		<div class="agent-avatar-ring">
			<div class="agent-avatar-icon">
				<Bot size={28} />
			</div>
		</div>

		<div class="agent-title-meta">
			<div class="agent-name-row">
				<h2>{agentPackage.manifest.display_name || agentPackage.manifest.name}</h2>
				<span class="agent-version-tag">v{agentPackage.manifest.version}</span>
				<span class="agent-type-badge">{agentPackage.manifest.type}</span>
			</div>
			<p class="agent-role-sub">{agentPackage.manifest.role}</p>
			<p class="agent-description">{agentPackage.manifest.description}</p>
		</div>

		<div class="agent-status-pill class-{agentPackage.manifest.default_status}">
			<span class="status-dot"></span>
			<span>{agentPackage.manifest.default_status}</span>
		</div>
	</header>

	<!-- Quick Stats Bar -->
	<div class="agent-stats-bar">
		<div class="stat-card">
			<Sliders size={14} />
			<div class="stat-info">
				<span class="stat-label">Priority</span>
				<strong class="stat-value">{agentPackage.manifest.priority}</strong>
			</div>
		</div>

		<div class="stat-card">
			<GitBranch size={14} />
			<div class="stat-info">
				<span class="stat-label">Delegation</span>
				<strong class="stat-value">{agentPackage.manifest.can_delegate ? 'Enabled' : 'Disabled'}</strong>
			</div>
		</div>

		<div class="stat-card">
			<Database size={14} />
			<div class="stat-info">
				<span class="stat-label">Memory</span>
				<strong class="stat-value">{agentPackage.manifest.memory.type} ({agentPackage.manifest.memory.persistence})</strong>
			</div>
		</div>

		<div class="stat-card">
			<Radio size={14} />
			<div class="stat-info">
				<span class="stat-label">Communication</span>
				<strong class="stat-value">{agentPackage.manifest.communication.protocol}</strong>
			</div>
		</div>
	</div>

	<!-- Package Navigation Tabs -->
	<nav class="agent-nav-tabs" aria-label="Agent document tabs">
		<button
			class="nav-tab-btn"
			class:is-active={activeTab === 'overview'}
			onclick={() => selectTab('overview')}
		>
			<Brain size={13} />
			<span>Overview</span>
		</button>

		{#each documentTabs as tab (tab.id)}
			<button
				class="nav-tab-btn"
				class:is-active={activeTab === tab.id}
				onclick={() => selectTab(tab.id)}
			>
				<FileText size={13} />
				<span>{tab.label}</span>
			</button>
		{/each}

		<div class="nav-divider"></div>

		<button
			class="nav-tab-btn generated"
			class:is-active={activeTab === 'status'}
			onclick={() => selectTab('status')}
		>
			<Activity size={13} />
			<span>STATUS</span>
		</button>
		<button
			class="nav-tab-btn generated"
			class:is-active={activeTab === 'tasks'}
			onclick={() => selectTab('tasks')}
		>
			<Terminal size={13} />
			<span>TASKS</span>
		</button>
		<button
			class="nav-tab-btn generated"
			class:is-active={activeTab === 'history'}
			onclick={() => selectTab('history')}
		>
			<Zap size={13} />
			<span>HISTORY</span>
		</button>
	</nav>

	<!-- Content Surface -->
	<main class="agent-content-surface">
		{#if activeTab === 'overview'}
			<div class="overview-grid">
				<section class="overview-panel">
					<h3><Shield size={14} /> Configuration & Permissions</h3>
					<div class="meta-row">
						<span>Max Parallel Tasks:</span>
						<strong>{agentPackage.manifest.max_concurrent_tasks}</strong>
					</div>
					<div class="meta-row">
						<span>Parallel Execution:</span>
						<strong>{agentPackage.manifest.parallel_execution ? 'Yes' : 'No'}</strong>
					</div>

					<div class="permissions-wrap">
						<h4>Permissions</h4>
						<div class="chip-group">
							{#each agentPackage.manifest.permissions as perm}
								<span class="perm-chip"><Lock size={11} /> {perm}</span>
							{/each}
						</div>
					</div>
				</section>

				{#if agentPackage.manifest.delegates.length > 0}
					<section class="overview-panel">
						<h3><GitBranch size={14} /> Direct Delegates</h3>
						<div class="chip-group">
							{#each agentPackage.manifest.delegates as delegate}
								<span class="delegate-chip">{delegate}</span>
							{/each}
						</div>
					</section>
				{/if}

				<section class="overview-panel full-width">
					<h3><FileText size={14} /> Package Manifest (agent.yaml)</h3>
					<pre class="manifest-code"><code>id: {agentPackage.manifest.id}
name: {agentPackage.manifest.name}
role: {agentPackage.manifest.role}
color: "{agentPackage.manifest.color}"
avatar: {agentPackage.manifest.avatar}
priority: {agentPackage.manifest.priority}
can_delegate: {agentPackage.manifest.can_delegate}</code></pre>
				</section>
			</div>
		{:else if activeTab === 'status' || activeTab === 'tasks' || activeTab === 'history'}
			<div class="generated-doc-view">
				<div class="doc-header">
					<h3>Runtime State ({activeTab.toUpperCase()}.md)</h3>
					<span class="read-only-tag">Generated</span>
				</div>
				<pre class="doc-code">{agentPackage.generated[activeTab] || 'No content'}</pre>
			</div>
		{:else}
			<div class="document-doc-view">
				<div class="doc-header">
					<h3>{activeTab.toUpperCase()}.md</h3>
					<div class="doc-actions">
						{#if saveMessage}
							<span class="save-msg"><Check size={13} /> {saveMessage}</span>
						{/if}
						{#if isEditingDoc}
							<button class="action-btn save" onclick={saveEdit}>
								<Save size={13} /> Save
							</button>
							<button class="action-btn cancel" onclick={cancelEdit}>
								<X size={13} /> Cancel
							</button>
						{:else}
							<button class="action-btn edit" onclick={startEdit}>
								<Edit size={13} /> Edit
							</button>
						{/if}
					</div>
				</div>

				{#if isEditingDoc}
					<textarea class="doc-editor" bind:value={editingContent} rows="16"></textarea>
				{:else}
					<pre class="doc-code">{agentPackage.documents[activeTab] || 'Empty document'}</pre>
				{/if}
			</div>
		{/if}
	</main>
</div>

<style>
	.agent-package-inspector {
		display: flex;
		flex-direction: column;
		gap: 16px;
		color: #e0e0e0;
	}

	.agent-hero-banner {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 20px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-left: 4px solid var(--agent-primary-color);
		border-radius: 12px;
	}

	.agent-avatar-ring {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.05);
		border: 2px solid var(--agent-primary-color);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--agent-primary-color);
	}

	.agent-title-meta {
		flex: 1;
	}

	.agent-name-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.agent-name-row h2 {
		margin: 0;
		font-size: 1.3rem;
		font-weight: 600;
	}

	.agent-version-tag {
		font-size: 0.75rem;
		padding: 2px 6px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 4px;
		color: #888;
	}

	.agent-type-badge {
		font-size: 0.75rem;
		padding: 2px 8px;
		background: var(--agent-primary-color);
		color: #000;
		font-weight: 600;
		border-radius: 4px;
		text-transform: uppercase;
	}

	.agent-role-sub {
		margin: 4px 0 2px 0;
		font-size: 0.85rem;
		color: #aaa;

	}

	.agent-description {
		margin: 0;
		font-size: 0.82rem;
		color: #777;
	}

	.agent-status-pill {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 20px;
		background: rgba(255, 255, 255, 0.05);
		font-size: 0.75rem;
		text-transform: capitalize;
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #4caf50;
	}

	.agent-stats-bar {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 12px;
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 8px;
	}

	.stat-info {
		display: flex;
		flex-direction: column;
	}

	.stat-label {
		font-size: 0.7rem;
		color: #888;

	}

	.stat-value {
		font-size: 0.85rem;
		color: #fff;
	}

	.agent-nav-tabs {
		display: flex;
		align-items: center;
		gap: 6px;
		overflow-x: auto;
		padding-bottom: 4px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.nav-tab-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: #888;
		font-size: 0.78rem;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s ease;
	}

	.nav-tab-btn:hover {
		color: #fff;
		background: rgba(255, 255, 255, 0.05);
	}

	.nav-tab-btn.is-active {
		color: #fff;
		background: rgba(255, 255, 255, 0.1);
		font-weight: 600;
	}

	.nav-tab-btn.generated {
		color: #ffb74d;
	}

	.nav-divider {
		width: 1px;
		height: 16px;
		background: rgba(255, 255, 255, 0.1);
		margin: 0 4px;
	}

	.agent-content-surface {
		padding: 16px;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.overview-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;
	}

	.overview-panel {
		padding: 14px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 8px;
	}

	.overview-panel.full-width {
		grid-column: span 2;
	}

	.overview-panel h3 {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 12px 0;
		font-size: 0.9rem;
		color: #fff;
	}

	.meta-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.8rem;
		margin-bottom: 6px;
		color: #aaa;
	}

	.chip-group {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 8px;
	}

	.perm-chip,
	.delegate-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.72rem;
		padding: 3px 8px;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.06);
		color: #ccc;
	}

	.doc-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}

	.doc-header h3 {
		margin: 0;
		font-size: 0.95rem;
		color: #fff;
	}

	.read-only-tag {
		font-size: 0.7rem;
		padding: 2px 6px;
		background: rgba(255, 183, 77, 0.2);
		color: #ffb74d;
		border-radius: 4px;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		font-size: 0.75rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.action-btn.edit {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}

	.action-btn.save {
		background: var(--agent-primary-color);
		color: #000;
		font-weight: 600;
	}

	.action-btn.cancel {
		background: rgba(255, 255, 255, 0.05);
		color: #888;
	}

	.doc-code,
	.manifest-code {
		margin: 0;
		font-family: monospace;
		font-size: 0.82rem;
		white-space: pre-wrap;
		color: #ddd;
		background: rgba(0, 0, 0, 0.3);
		padding: 12px;
		border-radius: 6px;
	}

	.doc-editor {
		width: 100%;
		font-family: monospace;
		font-size: 0.82rem;
		background: rgba(0, 0, 0, 0.4);
		color: #fff;
		border: 1px solid var(--agent-primary-color);
		border-radius: 6px;
		padding: 12px;
		box-sizing: border-box;
		resize: vertical;
	}
</style>
