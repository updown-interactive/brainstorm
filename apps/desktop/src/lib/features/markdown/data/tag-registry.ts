import { invoke } from '@tauri-apps/api/core';
import { get } from 'svelte/store';
import { fileTreeState } from '../../files/state';
import { todayString } from '../engine/frontmatter';

export interface SharedTag {
	name: string;
	color: string;
	description: string;
	created: string;
}

export type SharedPropertyValue = SharedTag;

export interface PropertyConfig {
	tags?: SharedTag[];
	types?: SharedPropertyValue[] | string[];
	domains?: SharedPropertyValue[] | string[];
}

export type SharedPropertyKey = 'type' | 'domain';

const configFileName = 'config.json';
const propertyConfigFileName = 'property-config.json';
const legacyPropertiesSchemaFileName = 'properties-schema.json';
const brainstormFolderName = '.brainstorm';
const configurationFolderName = 'configuration';
let tagCache: SharedTag[] = [];

export async function listSharedTags(rootPathOverride?: string | null) {
	const config = await readPropertyConfig(rootPathOverride);
	tagCache = normalizeSharedTags(config.tags ?? []);
	return tagCache;
}

export async function ensureSharedTags(names: string[], rootPathOverride?: string | null) {
	const normalizedNames = uniqueTagNames(names.map(normalizeTagName).filter(Boolean));
	if (normalizedNames.length === 0) return tagCache;

	const config = await readPropertyConfig(rootPathOverride);
	const existingTags = normalizeSharedTags(config.tags ?? []);
	const existingNames = new Set(existingTags.map((tag) => tag.name.toLocaleLowerCase()));
	const created = todayString();
	const nextTags = [...existingTags];

	for (const name of normalizedNames) {
		if (existingNames.has(name.toLocaleLowerCase())) continue;
		existingNames.add(name.toLocaleLowerCase());
		nextTags.push({
			name,
			color: defaultTagColor(),
			description: '',
			created
		});
	}

	tagCache = nextTags;
	await writePropertyConfig({ ...config, tags: nextTags }, rootPathOverride);
	return tagCache;
}

export async function listSharedPropertyValues(key: SharedPropertyKey, rootPathOverride?: string | null): Promise<string[]> {
	const config = await readPropertyConfig(rootPathOverride);
	return normalizeSharedPropertyValues(config[key === 'type' ? 'types' : 'domains']).map((value) => value.name);
}

export async function ensureSharedPropertyValue(
	key: SharedPropertyKey,
	value: string,
	rootPathOverride?: string | null
): Promise<string[]> {
	const normalizedValue = value.trim();
	if (!normalizedValue) return listSharedPropertyValues(key, rootPathOverride);

	const config = await readPropertyConfig(rootPathOverride);
	const configKey = key === 'type' ? 'types' : 'domains';
	const values = normalizeSharedPropertyValues(config[configKey]);
	if (!values.some((item) => item.name.toLocaleLowerCase() === normalizedValue.toLocaleLowerCase())) {
		values.push({ name: normalizedValue, color: defaultTagColor(), description: '', created: todayString() });
		await writePropertyConfig({ ...config, [configKey]: values }, rootPathOverride);
	}

	return values.map((value) => value.name);
}

export async function saveSharedPropertyValues(
	key: SharedPropertyKey,
	values: SharedPropertyValue[],
	rootPathOverride?: string | null
): Promise<SharedPropertyValue[]> {
	const config = await readPropertyConfig(rootPathOverride);
	const configKey = key === 'type' ? 'types' : 'domains';
	const normalizedValues = normalizeSharedPropertyValues(values);
	await writePropertyConfig({ ...config, [configKey]: normalizedValues }, rootPathOverride);
	return normalizedValues;
}

export async function saveSharedTags(tags: SharedTag[], rootPathOverride?: string | null) {
	const config = await readPropertyConfig(rootPathOverride);
	const normalizedTags = normalizeSharedTags(tags);
	tagCache = normalizedTags;
	await writePropertyConfig({ ...config, tags: normalizedTags }, rootPathOverride);
	return tagCache;
}

export function getCachedSharedTags() {
	return tagCache;
}

export function normalizeTagName(value: string) {
	const trimmed = value.trim();
	if (!trimmed) return '';
	const withoutHash = trimmed.replace(/^#+/, '').trim();
	return withoutHash ? `#${withoutHash}` : '';
}

export function normalizeTagColor(value: string | undefined | null) {
	const color = `${value ?? ''}`.trim();
	if (/^#[0-9a-f]{6}$/i.test(color)) return color;
	if (/^#[0-9a-f]{3}$/i.test(color)) {
		return `#${color.slice(1).split('').map((part) => `${part}${part}`).join('')}`;
	}
	return defaultTagColor();
}

function uniqueTagNames(names: string[]) {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const name of names) {
		const normalized = name.toLocaleLowerCase();
		if (seen.has(normalized)) continue;
		seen.add(normalized);
		result.push(name);
	}

	return result;
}

function normalizeSharedPropertyValues(values: unknown): SharedPropertyValue[] {
	if (!Array.isArray(values)) return [];
	const entries = values.map((value) => {
		if (typeof value === 'string') {
			return { name: value, color: defaultTagColor(), description: '', created: todayString() };
		}
		if (!value || typeof value !== 'object' || !('name' in value)) return null;
		const entry = value as Partial<SharedPropertyValue>;
		return {
			name: `${entry.name ?? ''}`,
			color: normalizeTagColor(entry.color),
			description: `${entry.description ?? ''}`,
			created: `${entry.created ?? todayString()}`
		};
	}).filter((value): value is SharedPropertyValue => Boolean(value?.name.trim()));

	return uniqueTagNames(entries.map((value) => value.name.trim()))
		.map((name) => entries.find((value) => value.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase()))
		.filter((value): value is SharedPropertyValue => Boolean(value));
}

function normalizeSharedTags(tags: SharedTag[]) {
	return uniqueTagNames(tags.map((tag) => normalizeTagName(tag.name)).filter(Boolean))
		.map((name) => {
			const source = tags.find((tag) => normalizeTagName(tag.name).toLocaleLowerCase() === name.toLocaleLowerCase());
			return {
				name,
				color: normalizeTagColor(source?.color),
				description: source?.description || '',
				created: source?.created || todayString()
			};
		})
		.sort((left, right) => left.name.localeCompare(right.name));
}

export async function readPropertyConfig(rootPathOverride?: string | null): Promise<PropertyConfig> {
	const schemaPath = await ensurePropertyConfigPath(rootPathOverride);
	if (!schemaPath) return { tags: tagCache };

	try {
		const content = await invoke<string>('read_file', { path: schemaPath });
		const parsed = JSON.parse(content || '{}');
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
			? parsed as PropertyConfig
			: {};
	} catch (error) {
		await writePropertyConfig({ tags: [] }, rootPathOverride);
		return {};
	}
}

export async function writePropertyConfig(config: PropertyConfig, rootPathOverride?: string | null) {
	const schemaPath = await ensurePropertyConfigPath(rootPathOverride);
	if (!schemaPath) return;
	await invoke('write_file', {
		path: schemaPath,
		content: `${JSON.stringify({
			...config,
			tags: normalizeSharedTags(config.tags ?? []),
			types: normalizeSharedPropertyValues(config.types),
			domains: normalizeSharedPropertyValues(config.domains)
		}, null, 2)}\n`
	});
}

export async function ensurePropertyConfigPath(rootPathOverride?: string | null) {
	const { fileTreeState } = await import('../../files/state');
	const rootPath = rootPathOverride ?? get(fileTreeState).rootPath;
	if (!rootPath) return null;

	const folderPath = `${rootPath}/${brainstormFolderName}/${configurationFolderName}`;
	const schemaPath = `${folderPath}/${propertyConfigFileName}`;

	try {
		const folderExists = await invoke<boolean>('path_exists', { path: folderPath });
		if (!folderExists) {
			await invoke('create_folder', { path: folderPath });
		}

		const schemaExists = await invoke<boolean>('path_exists', { path: schemaPath });
		const previousSchemaPath = `${rootPath}/${brainstormFolderName}/${propertyConfigFileName}`;
		const previousSchemaExists = await invoke<boolean>('path_exists', { path: previousSchemaPath });
		if (!schemaExists && previousSchemaExists) {
			await invoke('rename_path', { oldPath: previousSchemaPath, newPath: schemaPath });
		}

		const nextSchemaExists = await invoke<boolean>('path_exists', { path: schemaPath });
		if (!nextSchemaExists) {
			const legacyTags = await readLegacyPropertyTags(rootPath);
			await invoke('write_file', {
				path: schemaPath,
				content: `${JSON.stringify({ tags: normalizeSharedTags(legacyTags) }, null, 2)}\n`
			});
		}
	} catch (error) {
		console.error('Failed to ensure Brainstorm properties schema', error);
		return null;
	}

	return schemaPath;
}

async function readLegacyPropertyTags(rootPath: string): Promise<SharedTag[]> {
	const schemaPath = `${rootPath}/${brainstormFolderName}/${legacyPropertiesSchemaFileName}`;
	try {
		const schemaExists = await invoke<boolean>('path_exists', { path: schemaPath });
		if (!schemaExists) return readLegacyConfigTags(rootPath);

		const content = await invoke<string>('read_file', { path: schemaPath });
		const parsed = JSON.parse(content || '{}');
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray((parsed as { tags?: unknown }).tags)
			? (parsed as { tags: SharedTag[] }).tags
			: [];
	} catch {
		return readLegacyConfigTags(rootPath);
	}
}

async function readLegacyConfigTags(rootPath: string): Promise<SharedTag[]> {
	const configPath = `${rootPath}/${brainstormFolderName}/${configFileName}`;
	try {
		const configExists = await invoke<boolean>('path_exists', { path: configPath });
		if (!configExists) return [];

		const content = await invoke<string>('read_file', { path: configPath });
		const parsed = JSON.parse(content || '{}');
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray((parsed as { tags?: unknown }).tags)
			? (parsed as { tags: SharedTag[] }).tags
			: [];
	} catch {
		return [];
	}
}

function defaultTagColor() {
	return '#007ACC';
}
