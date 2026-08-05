import type { GraphConfig } from '../types';

export const brainstormFolderName = '.brainstorm';
export const configurationFolderName = 'configuration';
export const graphConfigFileName = 'graph-config.json';
export const legacyGraphStateFileName = 'graph-state.json';

export const minZoom = 0.15;
export const maxZoom = 8;

export const collisionPadding = 20;
export const settledVelocityDamping = 0.82;
export const boostedVelocityDamping = 0.88;
export const settledAlphaDecay = 0.985;
export const boostedAlphaDecay = 0.992;
export const maxVelocity = 260;
export const maxCoordinate = 100000;
export const midZoomLabelLimit = 100;
export const viewportCullMargin = 72;
export const hitCellSize = 96;
export const baseNodeRadius = 8;

export const defaultGraphConfig: GraphConfig = {
	forceModelVersion: 2,
	display: {
		arrows: false,
		textFadeThreshold: 0.5,
		nodeSize: 1,
		linkThickness: 1
	},
	forces: {
		center: 50,
		repel: 50,
		link: 50,
		linkDistance: 50
	},
	panel: {
		open: true,
		displayOpen: true,
		forcesOpen: true
	}
};
