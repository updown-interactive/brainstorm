export type ProviderDefinition = {
	id: string;
	name: string;
	description: string;
	authentication: 'api_key' | 'none';
	default_base_url: string | null;
	models: string[];
};

export type ProviderConfig = {
	id: string;
	provider_id: string;
	name: string;
	model: string;
	base_url: string | null;
	configured: boolean;
};

export type AddProviderRequest = {
	provider_id: string;
	name: string;
	api_key?: string;
	model: string;
	base_url?: string;
};

export type UpdateProviderRequest = {
	id: string;
	name?: string;
	api_key?: string;
	model?: string;
	base_url?: string;
};
