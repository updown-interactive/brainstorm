export const BUILT_IN_PROPERTY_ORDER = [
	'name',
	'created',
	'updated',
	'type',
	'domain',
	'status',
	'tags',
	'aliases',
	'links',
	'summary',
	'icon',
	'cover',
	'favorite',
	'priority'
] as const;

export const ADD_PROPERTY_OPTIONS = [
	'type',
	'domain',
	'status',
	'priority',
	'summary',
	'tags',
	'aliases',
	'links',
	'icon',
	'cover',
	'favorite',
	'published',
	'author',
	'description',
	'contributors',
	'custom'
] as const;

export const LIST_PROPERTIES = new Set(['tags', 'aliases', 'links', 'contributors']);
export const DATE_PROPERTIES = new Set(['created', 'updated', 'published', 'date']);
export const NUMBER_PROPERTIES = new Set(['priority', 'estimated_hours']);
export const BOOLEAN_PROPERTIES = new Set(['favorite', 'reviewed', 'draft']);
export const MULTILINE_PROPERTIES = new Set(['summary', 'description']);
export const ENUM_PROPERTIES = new Map<string, string[]>([
	['status', ['active', 'draft', 'archived', 'done']],
	['type', ['documentation', 'note', 'task', 'project', 'reference']],
	['domain', ['company', 'personal', 'research', 'product']]
]);

export type PropertyType = 'text' | 'date' | 'number' | 'boolean' | 'enum' | 'list' | 'multiline';

export interface FrontmatterRange {
	from: number;
	to: number;
	bodyFrom: number;
	yaml: string;
}

export interface FrontmatterProperty {
	key: string;
	value: unknown;
	type: PropertyType;
	error?: string;
}

export interface ParsedFrontmatter {
	range: FrontmatterRange | null;
	properties: FrontmatterProperty[];
	data: Record<string, unknown>;
	errors: string[];
	duplicateKeys: string[];
}

export interface SharedTag {
	name: string;
	color: string;
	description: string;
	created: string;
}

export interface PropertyConfig {
	tags?: SharedTag[];
	types?: SharedTag[] | string[];
	domains?: SharedTag[] | string[];
}

export interface MarkdownState {
	content: string;
	isSaving: boolean;
	lastSavedAt: number | null;
	path: string | null;
}

export interface MarkdownFileSuggestion {
	name: string;
	path: string;
	label: string;
	relativePath: string;
	linkValue: string;
}

export interface FileEntry {
	name: string;
	path: string;
	is_dir: boolean;
	is_symlink: boolean;
}
