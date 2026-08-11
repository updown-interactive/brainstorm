import { invoke } from '@tauri-apps/api/core';
import type { AddProviderRequest, ProviderConfig, ProviderDefinition } from '../types/providers';

export const providersService = {
	listDefinitions: (): Promise<ProviderDefinition[]> => invoke('ai_list_providers'),
	listConfigured: (): Promise<ProviderConfig[]> => invoke('ai_get_configured_providers'),
	add: (request: AddProviderRequest): Promise<ProviderConfig> => invoke('ai_add_provider', { request }),
	remove: (id: string): Promise<void> => invoke('ai_remove_provider', { id }),
	test: (id: string): Promise<{ success: boolean; provider: string; model: string; latency_ms: number | null; error: { code: string; message: string } | null }> => invoke('ai_test_provider', { id })
};
