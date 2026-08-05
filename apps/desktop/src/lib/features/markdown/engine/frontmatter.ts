import YAML from 'yaml';

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

export function todayString(date = new Date()) {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, '0');
	const day = `${date.getDate()}`.padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function nameFromPath(path: string | null | undefined) {
	if (!path) return 'Untitled';
	const fileName = path.split('/').pop() || 'Untitled';
	return fileName.replace(/\.[^.]+$/, '') || 'Untitled';
}

export function detectFrontmatter(doc: string): FrontmatterRange | null {
	if (!doc.startsWith('---')) return null;

	const firstLineEnd = doc.indexOf('\n');
	if (firstLineEnd !== 3 && firstLineEnd !== -1) return null;

	let cursor = firstLineEnd + 1;
	while (cursor <= doc.length) {
		const lineEnd = doc.indexOf('\n', cursor);
		const to = lineEnd === -1 ? doc.length : lineEnd;
		const line = doc.slice(cursor, to).trim();

		if (line === '---') {
			return {
				from: 0,
				to,
				bodyFrom: lineEnd === -1 ? doc.length : lineEnd + 1,
				yaml: doc.slice(firstLineEnd + 1, cursor)
			};
		}

		if (lineEnd === -1) break;
		cursor = lineEnd + 1;
	}

	return null;
}

export function parseFrontmatter(doc: string): ParsedFrontmatter {
	const range = detectFrontmatter(doc);
	if (!range) {
		return { range: null, properties: [], data: {}, errors: [], duplicateKeys: [] };
	}

	const duplicateKeys = findDuplicateTopLevelKeys(range.yaml);
	const errors: string[] = [];
	let data: Record<string, unknown> = {};

	try {
		const parsed = YAML.parse(range.yaml);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			data = parsed as Record<string, unknown>;
		} else if (parsed != null) {
			errors.push('Frontmatter must be a YAML map.');
		}
	} catch (error) {
		errors.push(error instanceof Error ? error.message : 'Invalid YAML frontmatter.');
	}

	const properties = orderedKeys(data).map((key) => {
		const property: FrontmatterProperty = {
			key,
			value: data[key],
			type: inferPropertyType(key, data[key])
		};

		const validation = validateProperty(property);
		if (validation) property.error = validation;
		return property;
	});

	for (const key of duplicateKeys) {
		const property = properties.find((item) => item.key === key);
		if (property) property.error = 'Duplicate property key.';
	}

	return { range, properties, data, errors, duplicateKeys };
}

export function defaultFrontmatter(path?: string | null, date = todayString()) {
	return serializeFrontmatter({
		name: nameFromPath(path),
		created: date,
		updated: date
	});
}

export function ensureMarkdownFrontmatter(content: string, path?: string | null, touchUpdated = false) {
	const parsed = parseFrontmatter(content);
	const date = todayString();

	if (!parsed.range) {
		const frontmatter = defaultFrontmatter(path, date);
		const body = content.length > 0 ? `\n${content.replace(/^\n+/, '')}` : '';
		return `${frontmatter}${body}`;
	}

	const data = {
		...parsed.data,
		name: parsed.data.name || nameFromPath(path),
		created: parsed.data.created || todayString(),
		updated: touchUpdated ? date : (parsed.data.updated || date)
	};

	const frontmatter = serializeFrontmatter(data);
	return `${frontmatter}${content.slice(parsed.range.bodyFrom)}`;
}

export function updateFrontmatterProperty(doc: string, key: string, value: unknown) {
	const parsed = parseFrontmatter(doc);
	const data = { ...parsed.data, [key]: normalizeValueForKey(key, value) };
	return replaceFrontmatter(doc, data);
}

export function removeFrontmatterProperty(doc: string, key: string) {
	const parsed = parseFrontmatter(doc);
	const data = { ...parsed.data };
	delete data[key];
	return replaceFrontmatter(doc, data);
}

export function addFrontmatterProperty(doc: string, key: string) {
	const value = defaultValueForKey(key);
	return updateFrontmatterProperty(doc, key, value);
}

export function serializeFrontmatter(data: Record<string, unknown>) {
	const ordered: Record<string, unknown> = {};

	for (const key of BUILT_IN_PROPERTY_ORDER) {
		if (Object.prototype.hasOwnProperty.call(data, key)) {
			ordered[key] = data[key];
		}
	}

	for (const key of Object.keys(data)) {
		if (!Object.prototype.hasOwnProperty.call(ordered, key)) {
			ordered[key] = data[key];
		}
	}

	const yaml = YAML.stringify(ordered, {
		lineWidth: 0,
		defaultStringType: 'PLAIN',
		collectionStyle: 'block'
	}).trimEnd();

	return `---\n${yaml}\n---\n`;
}

export function inferPropertyType(key: string, value: unknown): PropertyType {
	if (LIST_PROPERTIES.has(key) || Array.isArray(value)) return 'list';
	if (DATE_PROPERTIES.has(key)) return 'date';
	if (BOOLEAN_PROPERTIES.has(key) || typeof value === 'boolean') return 'boolean';
	if (NUMBER_PROPERTIES.has(key) || typeof value === 'number') return 'number';
	if (ENUM_PROPERTIES.has(key)) return 'enum';
	if (MULTILINE_PROPERTIES.has(key) || (typeof value === 'string' && value.includes('\n'))) return 'multiline';
	return 'text';
}

export function enumOptionsForKey(key: string) {
	return ENUM_PROPERTIES.get(key) || [];
}

export function defaultValueForKey(key: string) {
	const type = inferPropertyType(key, undefined);
	if (type === 'list') return [];
	if (type === 'date') return todayString();
	if (type === 'number') return 0;
	if (type === 'boolean') return false;
	if (type === 'enum') return enumOptionsForKey(key)[0] || '';
	return '';
}

export function normalizeValueForKey(key: string, value: unknown) {
	if (LIST_PROPERTIES.has(key) || Array.isArray(value)) {
		const values = Array.isArray(value) ? value : `${value ?? ''}`.split(',');
		return uniqueStrings(values.map((item) => normalizeListItemForKey(key, `${item}`)).filter(Boolean));
	}

	if (NUMBER_PROPERTIES.has(key) || typeof value === 'number') {
		const numberValue = Number(value);
		return Number.isFinite(numberValue) ? numberValue : 0;
	}

	if (BOOLEAN_PROPERTIES.has(key) || typeof value === 'boolean') {
		return value === true || value === 'true';
	}

	return value == null ? '' : `${value}`;
}

function normalizeListItemForKey(key: string, value: string) {
	const trimmed = value.trim();
	if (!trimmed) return '';
	if (key !== 'tags') return trimmed;

	const tag = trimmed.replace(/^#+/, '').trim();
	return tag ? `#${tag}` : '';
}

export function valueToInputString(value: unknown) {
	if (Array.isArray(value)) return value.map((item) => `${item}`).join(', ');
	if (value == null) return '';
	return `${value}`;
}

function replaceFrontmatter(doc: string, data: Record<string, unknown>) {
	const range = detectFrontmatter(doc);
	const frontmatter = serializeFrontmatter(data);

	if (!range) {
		const body = doc.length > 0 ? `\n${doc.replace(/^\n+/, '')}` : '';
		return `${serializeFrontmatter(data)}${body}`;
	}

	return `${serializeFrontmatter(data)}${doc.slice(range.bodyFrom)}`;
}

export function orderedKeys(data: Record<string, unknown>) {
	const keys = Object.keys(data);
	const builtIns = BUILT_IN_PROPERTY_ORDER.filter((key) => keys.includes(key));
	const custom = keys.filter((key) => !BUILT_IN_PROPERTY_ORDER.includes(key as any));
	return [...builtIns, ...custom];
}

export function validateProperty(property: { key: string; value: unknown; type: string }) {
	if (!property.key.trim()) return 'Property name is required.';

	if (property.type === 'date' && property.value) {
		const value = `${property.value}`;
		if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Use YYYY-MM-DD.';
	}

	if (property.type === 'number' && Number.isNaN(Number(property.value))) {
		return 'Must be a number.';
	}

	if (property.type === 'enum') {
		const options = enumOptionsForKey(property.key);
		if (options.length > 0 && property.value && !options.includes(`${property.value}`)) {
			return `Expected one of: ${options.join(', ')}.`;
		}
	}

	if (property.type === 'list' && Array.isArray(property.value)) {
		const duplicates = findDuplicateStrings(property.value.map((item) => `${item}`));
		if (duplicates.length > 0) return `Duplicate values: ${duplicates.join(', ')}.`;
	}

	return undefined;
}

export function findDuplicateTopLevelKeys(yaml: string) {
	const seen = new Set<string>();
	const duplicates = new Set<string>();

	for (const line of yaml.split('\n')) {
		const match = line.match(/^([A-Za-z0-9_-]+):(?:\s|$)/);
		if (!match) continue;

		const key = match[1];
		if (seen.has(key)) duplicates.add(key);
		seen.add(key);
	}

	return [...duplicates];
}

export function findDuplicateStrings(values: string[]) {
	const seen = new Set<string>();
	const duplicates = new Set<string>();

	for (const value of values) {
		const normalized = value.toLocaleLowerCase();
		if (seen.has(normalized)) duplicates.add(value);
		seen.add(normalized);
	}

	return [...duplicates];
}

export function uniqueStrings(values: string[]) {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const value of values) {
		const normalized = value.toLocaleLowerCase();
		if (seen.has(normalized)) continue;
		seen.add(normalized);
		result.push(value);
	}

	return result;
}

export function isMarkdownPath(path: string) {
	return /\.md(?:x)?$/i.test(path);
}

export function formatLabel(key: string) {
	return key
		.replace(/[_-]+/g, ' ')
		.replace(/\b\w/g, (match) => match.toUpperCase());
}

export function isRequiredLifecycleKey(key: string) {
	return key === 'name' || key === 'created' || key === 'updated';
}