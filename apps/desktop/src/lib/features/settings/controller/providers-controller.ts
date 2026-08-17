import { get, writable } from 'svelte/store';
import { providersService } from '../data/providers-service';
import type { AddProviderRequest, ProviderConfig, ProviderDefinition, UpdateProviderRequest } from '../types/providers';

type ProvidersState = { definitions: ProviderDefinition[]; configured: ProviderConfig[]; isLoading: boolean; error: string };

class ProvidersController {
	private readonly state = writable<ProvidersState>({ definitions: [], configured: [], isLoading: false, error: '' });
	readonly subscribe = this.state.subscribe;

	async load(): Promise<void> {
		this.state.update((state) => ({ ...state, isLoading: true, error: '' }));
		try {
			const [definitions, configured] = await Promise.all([providersService.listDefinitions(), providersService.listConfigured()]);
			this.state.set({ definitions, configured, isLoading: false, error: '' });
		} catch (error) {
			this.state.update((state) => ({ ...state, isLoading: false, error: error instanceof Error ? error.message : 'Failed to load providers.' }));
		}
	}

	add = async (request: AddProviderRequest): Promise<void> => {
		try {
			const provider = await providersService.add(request);
			this.state.update((state) => ({ ...state, configured: [...state.configured, provider], error: '' }));
		} catch (error) {
			this.state.update((state) => ({ ...state, error: error instanceof Error ? error.message : 'Failed to save provider.' }));
			throw error;
		}
	};

	update = async (request: UpdateProviderRequest): Promise<void> => {
		try {
			const provider = await providersService.update(request);
			this.state.update((state) => ({ ...state, configured: state.configured.map((item) => item.id === provider.id ? provider : item), error: '' }));
		} catch (error) {
			this.state.update((state) => ({ ...state, error: error instanceof Error ? error.message : 'Failed to update provider.' }));
			throw error;
		}
	};

	remove = async (id: string): Promise<void> => {
		await providersService.remove(id);
		this.state.update((state) => ({ ...state, configured: state.configured.filter((provider) => provider.id !== id) }));
	};

	snapshot(): ProvidersState { return get(this.state); }
}

export const providersController = new ProvidersController();
