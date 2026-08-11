import { yaml } from '@codemirror/lang-yaml';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { tags as t } from '@lezer/highlight';
import { brainstormTheme } from '../../markdown/engine/theme';

export class YamlInspectorController {
	private view: EditorView | null = null;
	private renderedContent = '';
	private lastEmittedContent = '';
	private isApplyingExternalContent = false;
	private onChange: (content: string) => void = () => {};

	mount(parent: HTMLDivElement, content: string, onChange: (content: string) => void): void {
		this.onChange = onChange;
		this.renderedContent = content;
		this.view = new EditorView({
			state: EditorState.create({
				doc: content,
				extensions: [
					EditorState.tabSize.of(2),
					EditorView.editable.of(true),
					lineNumbers(),
					foldGutter(),
					indentOnInput(),
					bracketMatching(),
					keymap.of([...defaultKeymap, indentWithTab]),
					yaml(),
					brainstormTheme,
					yamlInspectorTheme,
					yamlHighlightStyle,
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
		if (!this.view || content === this.lastEmittedContent || content === this.renderedContent) return;
		this.renderedContent = content;
		this.isApplyingExternalContent = true;
		this.view.dispatch({ changes: { from: 0, to: this.view.state.doc.length, insert: content } });
		this.isApplyingExternalContent = false;
	}

	destroy(): void {
		this.view?.destroy();
		this.view = null;
		this.onChange = () => {};
	}
}

const yamlInspectorTheme = EditorView.theme({
	'&': { height: '100%', backgroundColor: 'var(--colors-background)' },
	'.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-mono, monospace)' },
	'.cm-content, .cm-line': {
		fontFamily: 'var(--font-mono, monospace)',
		fontSize: '12px',
		lineHeight: '1.6'
	},
	'.cm-content': { maxWidth: 'none', margin: '0', padding: '16px' },
	'.cm-gutters': {
		display: 'flex',
		borderRight: '1px solid var(--colors-border)',
		backgroundColor: 'var(--colors-surface)',
		color: 'var(--colors-textMuted)'
	},
	'.cm-lineNumbers .cm-gutterElement': { minWidth: '34px', padding: '0 8px 0 10px' },
	'.cm-activeLineGutter, .cm-activeLine': { backgroundColor: 'var(--colors-hover)' },
	'.cm-selectionBackground': { backgroundColor: 'var(--colors-selection)' }
}, { dark: true });

const yamlHighlightStyle = syntaxHighlighting(HighlightStyle.define([
	{ tag: t.propertyName, color: 'var(--colors-primary)' },
	{ tag: t.string, color: 'var(--colors-success)' },
	{ tag: t.number, color: 'var(--colors-warning)' },
	{ tag: [t.bool, t.null], color: 'var(--colors-secondary)' },
	{ tag: t.comment, color: 'var(--colors-textMuted)', fontStyle: 'italic' },
	{ tag: t.punctuation, color: 'var(--colors-textMuted)' },
	{ tag: t.invalid, color: 'var(--colors-error)' }
]));
