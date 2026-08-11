export const brainstormFolderName = '.brainstorm';
export const configurationFolderName = 'configuration';
export const stateFolderName = 'state';
export const explorerConfigFileName = 'explorer-config.json';
export const legacyConfigFileName = 'config.json';
export const propertyConfigFileName = 'property-config.json';
export const legacyPropertiesSchemaFileName = 'properties-schema.json';
export const explorerStateFileName = 'explorer-state.json';
export const graphConfigFileName = 'graph-config.json';
export const legacyGraphStateFileName = 'graph-state.json';

export const minExplorerSidebarWidth = 180;
export const maxExplorerSidebarWidth = 520;

export const sidebarWidthStorageKey = 'brainstorm.explorer.sidebarWidth';

export const defaultExplorerConfig: ExplorerConfig = {
	position: 'left',
	sidebarWidth: 260,
	showBrainstormFolder: false
};

export type ExplorerConfig = {
	position: 'left' | 'right';
	sidebarWidth: number;
	showBrainstormFolder?: boolean;
};
