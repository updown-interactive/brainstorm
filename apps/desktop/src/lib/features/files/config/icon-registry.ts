import { writable, get } from 'svelte/store';
import {
	Zap,
	Brain,
	FileText,
	FileCode,
	Sparkles,
	Star,
	Bookmark,
	Folder,
	Terminal,
	CheckCircle,
	Database,
	Layers,
	Flame,
	Compass,
	Heart,
	Hash,
	Key,
	Lock,
	Tag,
	User,
	Globe,
	MessageSquare,
	Shield,
	Rocket,
	Target,
	Wrench,
	Book,
	Calendar,
	Cpu,
	Box,
	Activity,
	Sun,
	Moon,
	Lightbulb,
	ShieldAlert
} from 'lucide-svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LucideIconComponent = any;

export interface IconOption {
	id: string;
	label: string;
	component: LucideIconComponent;
}

export const ICON_OPTIONS: IconOption[] = [
	{ id: 'zap', label: 'Zap (Default)', component: Zap },
	{ id: 'brain', label: 'Brain', component: Brain },
	{ id: 'sparkles', label: 'Sparkles', component: Sparkles },
	{ id: 'star', label: 'Star', component: Star },
	{ id: 'bookmark', label: 'Bookmark', component: Bookmark },
	{ id: 'file', label: 'Document', component: FileText },
	{ id: 'code', label: 'Code', component: FileCode },
	{ id: 'terminal', label: 'Terminal', component: Terminal },
	{ id: 'rocket', label: 'Rocket', component: Rocket },
	{ id: 'target', label: 'Target', component: Target },
	{ id: 'layers', label: 'Layers', component: Layers },
	{ id: 'flame', label: 'Flame', component: Flame },
	{ id: 'compass', label: 'Compass', component: Compass },
	{ id: 'database', label: 'Database', component: Database },
	{ id: 'check-circle', label: 'Check Circle', component: CheckCircle },
	{ id: 'key', label: 'Key', component: Key },
	{ id: 'lock', label: 'Lock', component: Lock },
	{ id: 'tag', label: 'Tag', component: Tag },
	{ id: 'user', label: 'User', component: User },
	{ id: 'globe', label: 'Globe', component: Globe },
	{ id: 'message', label: 'Message', component: MessageSquare },
	{ id: 'shield', label: 'Shield', component: Shield },
	{ id: 'wrench', label: 'Wrench', component: Wrench },
	{ id: 'book', label: 'Book', component: Book },
	{ id: 'calendar', label: 'Calendar', component: Calendar },
	{ id: 'cpu', label: 'CPU', component: Cpu },
	{ id: 'box', label: 'Box', component: Box },
	{ id: 'activity', label: 'Activity', component: Activity },
	{ id: 'sun', label: 'Sun', component: Sun },
	{ id: 'moon', label: 'Moon', component: Moon },
	{ id: 'lightbulb', label: 'Lightbulb', component: Lightbulb },
	{ id: 'shield-alert', label: 'Shield Alert', component: ShieldAlert }
];

const iconMap = new Map<string, LucideIconComponent>();
for (const opt of ICON_OPTIONS) {
	iconMap.set(opt.id, opt.component);
	iconMap.set(opt.id.toLowerCase(), opt.component);
}

export function resolveIconComponent(iconName?: string | null): LucideIconComponent {
	if (!iconName) return Zap;
	const normalized = `${iconName}`.trim().toLowerCase();
	return iconMap.get(normalized) || Zap;
}

export const customFileIcons = writable<Record<string, string>>({});

export function setCustomFileIcon(path: string, iconName: string | null | undefined): void {
	customFileIcons.update((map) => {
		if (!iconName || iconName.trim() === '' || iconName.trim().toLowerCase() === 'zap') {
			if (!(path in map)) return map;
			const next = { ...map };
			delete next[path];
			return next;
		}
		const normalized = iconName.trim().toLowerCase();
		if (map[path] === normalized) return map;
		return { ...map, [path]: normalized };
	});
}

export function getCustomFileIcon(path: string): string | null {
	const map = get(customFileIcons);
	return map[path] ?? null;
}
