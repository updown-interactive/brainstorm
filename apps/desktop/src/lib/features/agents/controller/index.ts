import { get } from 'svelte/store';
import { agentRepository } from '../data/agent-repository';
import { agentsState, type AgentsState } from '../state';
import type { AgentDocumentKind, AgentManifest, AgentPackage } from '../types';

class AgentsController {
	readonly subscribe = agentsState.subscribe;

	async loadAgents(projectRootPath: string): Promise<void> {
		this.patchState({ isLoading: true, error: null });
		try {
			const packagePaths = await agentRepository.discoverAgentPackagePaths(projectRootPath);
			const packages = await Promise.all(
				packagePaths.map((path) => agentRepository.loadAgentPackage(path))
			);

			const currentSelectedId = get(agentsState).selectedPackageId;
			const nextSelectedId = packages.some((p) => p.id === currentSelectedId)
				? currentSelectedId
				: packages[0]?.id ?? null;

			this.patchState({
				packages,
				selectedPackageId: nextSelectedId,
				isLoading: false
			});
		} catch (error) {
			this.patchState({
				isLoading: false,
				error: error instanceof Error ? error.message : 'Failed to load agents.'
			});
		}
	}

	selectPackage(packageId: string): void {
		this.patchState({ selectedPackageId: packageId });
	}

	selectDocumentKind(docKind: AgentsState['activeDocumentKind']): void {
		this.patchState({ activeDocumentKind: docKind });
	}

	async updateDocument(projectRootPath: string, packageId: string, docKind: AgentDocumentKind, content: string): Promise<void> {
		const state = get(agentsState);
		const pkg = state.packages.find((p) => p.id === packageId);
		if (!pkg) return;

		try {
			await agentRepository.saveDocument(pkg.packagePath, docKind, content);
			pkg.documents[docKind] = content;
			this.patchState({ packages: [...state.packages] });
		} catch (error) {
			this.patchState({
				error: error instanceof Error ? error.message : `Failed to save ${docKind}.md`
			});
		}
	}

	async updateManifest(projectRootPath: string, packageId: string, manifest: AgentManifest): Promise<void> {
		const state = get(agentsState);
		const pkg = state.packages.find((p) => p.id === packageId);
		if (!pkg) return;

		try {
			await agentRepository.saveManifest(pkg.packagePath, manifest);
			pkg.manifest = manifest;
			this.patchState({ packages: [...state.packages] });
		} catch (error) {
			this.patchState({
				error: error instanceof Error ? error.message : 'Failed to update agent manifest.'
			});
		}
	}

	async createAgent(projectRootPath: string, agentId: string, name: string): Promise<AgentPackage | null> {
		this.patchState({ isLoading: true, error: null });
		try {
			const newPkg = await agentRepository.createAgentPackage(projectRootPath, agentId, name);
			const state = get(agentsState);
			this.patchState({
				packages: [...state.packages, newPkg],
				selectedPackageId: newPkg.id,
				isLoading: false
			});
			return newPkg;
		} catch (error) {
			this.patchState({
				isLoading: false,
				error: error instanceof Error ? error.message : 'Failed to create agent package.'
			});
			return null;
		}
	}

	getSelectedPackage(): AgentPackage | null {
		const state = get(agentsState);
		if (!state.selectedPackageId) return null;
		return state.packages.find((p) => p.id === state.selectedPackageId) ?? null;
	}

	private patchState(patch: Partial<AgentsState>): void {
		agentsState.update((current) => ({ ...current, ...patch }));
	}
}

export const agentsController = new AgentsController();
