import { json } from '@codemirror/lang-json';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { brainstormTheme } from '../../markdown/engine/theme';

export class JsonInspectorController {
	private view: EditorView | null = null;
	private renderedContent = '';
	private lastEmittedContent = '';
	private isApplyingExternalContent = false;
	private onChange: (content: string) => void = () => {};

	mount(parent: HTMLDivElement, content: string, onChange: (content: string) => void): void {
		this.onChange = onChange;
		const formattedContent = this.formatJson(content);
		this.renderedContent = formattedContent;
		this.view = new EditorView({
			state: EditorState.create({
				doc: formattedContent,
				extensions: [
					EditorState.tabSize.of(2),
					EditorView.editable.of(true),
					lineNumbers(),
					json(),
					brainstormTheme,
					jsonInspectorTheme,
					jsonHighlightStyle,
					EditorView.lineWrapping,
					EditorView.updateListener.of((update) => {
						if (!update.docChanged || this.isApplyingExternalContent) return;
						this.renderedContent = update.state.doc.toString();
						this.lastEmittedContent = this.renderedContent;
						this.onChange(this.renderedContent);
					})
				]
			}),
			parent
		});
	}

	updateContent(content: string): void {
		const formattedContent = this.formatJson(content);
		if (!this.view || content === this.lastEmittedContent || formattedContent === this.renderedContent) return;
		this.renderedContent = formattedContent;
		this.isApplyingExternalContent = true;
		this.view.dispatch({
			changes: { from: 0, to: this.view.state.doc.length, insert: formattedContent }
		});
		this.isApplyingExternalContent = false;
	}

	destroy(): void {
		this.view?.destroy();
		this.view = null;
		this.onChange = () => {};
	}

	private formatJson(value: string): string {
		try {
			return `${JSON.stringify(JSON.parse(value || '{}'), null, 2)}\n`;
		} catch {
			return value;
		}
	}
}

const jsonInspectorTheme = EditorView.theme({
	'&': {
		height: '100%',
		backgroundColor: 'var(--colors-background)'
	},
	'.cm-scroller': {
		overflow: 'auto',
		fontFamily: 'var(--font-mono, monospace)'
	},
	'.cm-content': {
		maxWidth: 'none',
		margin: '0',
		padding: '16px',
		fontFamily: 'var(--font-mono, monospace)',
		fontSize: '12px',
		lineHeight: '1.6'
	},
	'.cm-line': {
		fontFamily: 'var(--font-mono, monospace)',
		lineHeight: '1.6'
	},
	'.cm-gutters': {
		display: 'flex',
		borderRight: '1px solid var(--colors-border)',
		backgroundColor: 'var(--colors-surface)',
		color: 'var(--colors-textMuted)'
	},
	'.cm-lineNumbers .cm-gutterElement': {
		minWidth: '34px',
		padding: '0 8px 0 10px'
	},
	'.cm-activeLineGutter': {
		backgroundColor: 'var(--colors-hover)'
	},
	'.cm-activeLine': {
		backgroundColor: 'var(--colors-hover)'
	},
	'.cm-selectionBackground': {
		backgroundColor: 'var(--colors-selection)'
	}
}, { dark: true });

const jsonHighlightStyle = syntaxHighlighting(HighlightStyle.define([
	{ tag: t.propertyName, color: 'var(--colors-primary)' },
	{ tag: t.string, color: 'var(--colors-success)' },
	{ tag: t.number, color: 'var(--colors-warning)' },
	{ tag: [t.bool, t.null], color: 'var(--colors-secondary)' },
	{ tag: t.punctuation, color: 'var(--colors-textMuted)' },
	{ tag: t.invalid, color: 'var(--colors-error)' }
]));
