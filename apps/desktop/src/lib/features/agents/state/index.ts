import { writable } from 'svelte/store';
import type { AgentDocumentKind, AgentPackage } from '../types';

export interface AgentsState {
	packages: AgentPackage[];
	selectedPackageId: string | null;
	activeDocumentKind: AgentDocumentKind | 'overview' | 'status' | 'tasks' | 'history';
	isLoading: boolean;
	error: string | null;
}

const initialState: AgentsState = {
	packages: [],
	selectedPackageId: null,
	activeDocumentKind: 'overview',
	isLoading: false,
	error: null
};

export const agentsState = writable<AgentsState>(initialState);
