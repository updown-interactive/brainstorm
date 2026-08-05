import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

export const brainstormTheme = EditorView.theme({
	'&': {
		color: 'var(--colors-text)',
		backgroundColor: 'var(--colors-background)',
		fontFamily: '"Inter", var(--font-sans, sans-serif)',
		fontSize: '14px',
		height: '100%',
	},
	'.cm-scroller': {
		fontFamily: '"Inter", var(--font-sans, sans-serif)'
	},
	'.cm-content': {
		caretColor: 'var(--colors-primary)',
		padding: '40px',
		maxWidth: '800px',
		margin: '0 auto',
		fontFamily: '"Inter", var(--font-sans, sans-serif)'
	},
	'&.cm-focused .cm-cursor': {
		borderLeftColor: 'var(--colors-primary)',
		borderLeftWidth: '2px',
		marginLeft: '-1px'
	},
	'.cm-dropCursor': {
		borderLeftColor: 'var(--colors-primary)',
		borderLeftWidth: '2px'
	},
	'.cm-selectionLayer': {
		zIndex: '1'
	},
	'.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
		backgroundColor: 'color-mix(in srgb, var(--colors-primary, #3b82f6) 42%, rgba(59, 130, 246, 0.25)) !important',
		borderRadius: '2px'
	},
	'.cm-selectionLayer:not(.cm-focused) .cm-selectionBackground': {
		backgroundColor: 'rgba(255, 255, 255, 0.18) !important',
		borderRadius: '2px'
	},
	'.cm-content ::selection': {
		backgroundColor: 'color-mix(in srgb, var(--colors-primary, #3b82f6) 42%, rgba(59, 130, 246, 0.25)) !important'
	},
	'.cm-activeLine': {
		backgroundColor: 'transparent',
	},
	'.cm-gutters': {
		display: 'none',
	},
	'.cm-line': {
		lineHeight: '1.6',
		padding: '0',
		fontFamily: '"Inter", var(--font-sans, sans-serif)'
	},
	
	'.cm-highlight': {
		backgroundColor: 'rgba(255, 226, 143, 0.4)',
		borderRadius: '2px',
		padding: '0 2px'
	},
	'.cm-underline': {
		textDecoration: 'underline'
	},
	'.cm-superscript': {
		verticalAlign: 'super',
		fontSize: '0.8em'
	},
	'.cm-subscript': {
		verticalAlign: 'sub',
		fontSize: '0.8em'
	},
	'.cm-wikilink': {
		color: 'var(--colors-primary)',
		textDecoration: 'underline',
		cursor: 'pointer'
	},
	'.cm-link-preview': {
		color: 'var(--colors-primary)',
		textDecoration: 'underline',
		textUnderlineOffset: '2px',
		cursor: 'pointer'
	},
	'.cm-link-preview:hover': {
		filter: 'brightness(1.12)'
	},
	'.cm-tag': {
		color: 'var(--colors-primary)',
		backgroundColor: 'color-mix(in srgb, var(--colors-primary) 16%, transparent)',
		borderRadius: '4px',
		padding: '2px 4px',
		fontWeight: '600',
		fontSize: '0.9em'
	},
	'.cm-math': {
		fontFamily: 'var(--font-mono, monospace)',
		color: 'var(--colors-secondary)',
		backgroundColor: 'rgba(0, 0, 0, 0.2)',
		padding: '2px 4px',
		borderRadius: '4px'
	},
	'.cm-frontmatter': {
		color: 'var(--colors-textMuted)',
		fontFamily: 'var(--font-mono, monospace)',
		fontSize: '0.9em'
	},

	'.cm-properties-panel': {
		display: 'block',
		margin: '0',
		padding: '8px 0 24px 0',
		borderTop: '1px solid var(--colors-border)',
		borderBottom: '1px solid var(--colors-border)',
		color: 'var(--colors-text)',
		fontFamily: '"Inter", var(--font-sans, sans-serif)'
	},
	'.cm-properties-header': {
		display: 'flex',
		alignItems: 'center',
		gap: '6px',
		padding: '4px 0',
		cursor: 'pointer',
		userSelect: 'none',
		color: 'var(--colors-textMuted)',
		fontSize: '12px',
		fontWeight: '600',
		letterSpacing: '0.03em',
		transition: 'color 0.15s ease'
	},
	'.cm-properties-header:hover': {
		color: 'var(--colors-text)'
	},
	'.cm-properties-toggle-icon': {
		fontSize: '9px',
		width: '12px',
		display: 'inline-block',
		textAlign: 'center',
		opacity: '0.8'
	},
	'.cm-properties-body': {
		marginTop: '10px'
	},
	'.cm-properties-panel input, .cm-properties-panel textarea, .cm-properties-panel button, .cm-properties-panel select': {
		fontFamily: '"Inter", var(--font-sans, sans-serif)'
	},
	'.cm-properties-rows': {
		display: 'grid',
		gap: '8px'
	},
	'.cm-property-row': {
		display: 'grid',
		gridTemplateColumns: '128px minmax(0, 1fr)',
		alignItems: 'center',
		gap: '12px',
		minHeight: '32px'
	},
	'.cm-property-label': {
		color: 'var(--colors-textMuted)',
		fontSize: '12px',
		fontWeight: '600',
		lineHeight: '32px',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap'
	},
	'.cm-property-control': {
		minWidth: '0',
		position: 'relative'
	},
	'.cm-property-control.has-property-remove .cm-property-input, .cm-property-control.has-property-remove .cm-property-picker-button': {
		paddingRight: '42px'
	},
	'.cm-property-control.has-property-remove .cm-property-list-input-row .cm-property-input, .cm-property-control.has-property-remove .cm-property-link-input-row .cm-property-input': {
		paddingRight: '42px'
	},
	'.cm-property-row:has(.cm-property-textarea), .cm-property-row:has(.cm-property-validation)': {
		alignItems: 'start'
	},
	'.cm-property-dates-stack': {
		display: 'grid',
		gap: '8px'
	},
	'.cm-property-input': {
		width: '100%',
		minHeight: '32px',
		boxSizing: 'border-box',
		border: '1px solid var(--colors-border)',
		borderRadius: '6px',
		backgroundColor: 'var(--colors-surface)',
		color: 'var(--colors-text)',
		padding: '6px 9px',
		font: 'inherit',
		outline: 'none'
	},
	'.cm-property-input:focus': {
		borderColor: 'var(--colors-primary)'
	},
	'.cm-property-textarea': {
		resize: 'vertical',
		lineHeight: '1.5'
	},
	'.cm-property-popover-host': {
		position: 'relative'
	},
	'.cm-property-picker-button, .cm-property-add-button, .cm-property-calendar-button, .cm-property-menu-action, .cm-property-calendar-nav, .cm-property-calendar-day': {
		border: '1px solid var(--colors-border)',
		borderRadius: '6px',
		backgroundColor: 'var(--colors-surface)',
		color: 'var(--colors-text)',
		font: 'inherit',
		cursor: 'pointer'
	},
	'.cm-property-picker-button, .cm-property-add-button': {
		minHeight: '32px',
		width: '100%',
		padding: '6px 9px',
		textAlign: 'left'
	},
	'.cm-property-add-button': {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: '12px'
	},
	'.cm-property-add-button kbd': {
		color: 'var(--colors-textMuted)',
		fontSize: '11px',
		fontFamily: 'var(--font-mono, monospace)'
	},
	'.cm-property-picker-button:hover, .cm-property-add-button:hover, .cm-property-calendar-button:hover, .cm-property-menu-action:hover, .cm-property-calendar-nav:hover, .cm-property-calendar-day:hover': {
		borderColor: 'var(--colors-primary)'
	},
	'.cm-property-menu, .cm-property-calendar': {
		position: 'absolute',
		top: 'calc(100% + 6px)',
		left: '0',
		zIndex: '40',
		width: 'min(280px, 100%)',
		boxSizing: 'border-box',
		border: '1px solid var(--colors-border)',
		borderRadius: '8px',
		backgroundColor: 'var(--colors-surface)',
		padding: '8px'
	},
	'.cm-property-menu[hidden], .cm-property-calendar[hidden], .cm-property-custom-row[hidden]': {
		display: 'none'
	},
	'.cm-property-menu-search': {
		marginBottom: '8px'
	},
	'.cm-property-menu-list': {
		display: 'grid',
		gap: '4px',
		maxHeight: '220px',
		overflowY: 'auto'
	},
	'.cm-property-menu-item': {
		minHeight: '30px',
		border: '0',
		borderRadius: '6px',
		backgroundColor: 'transparent',
		color: 'var(--colors-text)',
		padding: '5px 8px',
		font: 'inherit',
		textAlign: 'left',
		cursor: 'pointer',
		display: 'grid',
		gap: '2px'
	},
	'.cm-property-menu-item small': {
		color: 'var(--colors-textMuted)',
		fontSize: '11px',
		lineHeight: '1.2'
	},
	'.cm-property-menu-item:hover, .cm-property-menu-item.is-selected': {
		backgroundColor: 'var(--colors-surfaceVariant)'
	},
	'.cm-property-custom-row': {
		display: 'grid',
		gridTemplateColumns: 'minmax(0, 1fr) auto',
		gap: '6px',
		marginTop: '8px',
		paddingTop: '8px',
		borderTop: '1px solid var(--colors-border)'
	},
	'.cm-property-menu-action': {
		minHeight: '32px',
		padding: '0 10px'
	},
	'.cm-property-spotlight-overlay': {
		position: 'fixed',
		inset: '0',
		zIndex: '1000',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		padding: '24px',
		backgroundColor: 'color-mix(in srgb, var(--colors-background) 64%, transparent)'
	},
	'.cm-property-spotlight-overlay[hidden]': {
		display: 'none'
	},
	'.cm-property-spotlight': {
		width: 'min(560px, calc(100vw - 32px))',
		maxHeight: 'min(560px, calc(100vh - 96px))',
		boxSizing: 'border-box',
		border: '1px solid var(--colors-border)',
		borderRadius: '8px',
		backgroundColor: 'var(--colors-surface)',
		padding: '10px',
		display: 'grid',
		gap: '10px'
	},
	'.cm-property-spotlight-search': {
		width: '100%',
		minHeight: '44px',
		boxSizing: 'border-box',
		border: '1px solid var(--colors-border)',
		borderRadius: '8px',
		backgroundColor: 'var(--colors-background)',
		color: 'var(--colors-text)',
		padding: '9px 12px',
		font: 'inherit',
		fontSize: '15px',
		outline: 'none'
	},
	'.cm-property-spotlight-search:focus': {
		borderColor: 'var(--colors-primary)'
	},
	'.cm-property-spotlight-list': {
		display: 'grid',
		gap: '4px',
		maxHeight: '320px',
		overflowY: 'auto'
	},
	'.cm-property-spotlight .cm-property-menu-item': {
		minHeight: '44px',
		padding: '7px 10px'
	},
	'.cm-property-spotlight-empty': {
		color: 'var(--colors-textMuted)',
		fontSize: '13px',
		padding: '12px',
		textAlign: 'center'
	},
	'.cm-property-date-picker': {
		position: 'relative'
	},
	'.cm-property-date-input': {
		paddingRight: '36px'
	},
	'.cm-property-calendar-button': {
		position: 'absolute',
		top: '4px',
		right: '4px',
		width: '24px',
		height: '24px',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		padding: '0'
	},
	'.cm-property-calendar-button svg': {
		fill: 'none',
		stroke: 'currentColor',
		strokeWidth: '2',
		strokeLinecap: 'round',
		strokeLinejoin: 'round'
	},
	'.cm-property-calendar': {
		width: '276px'
	},
	'.cm-property-calendar-header': {
		display: 'grid',
		gridTemplateColumns: '32px minmax(0, 1fr) 32px',
		alignItems: 'center',
		gap: '6px',
		marginBottom: '8px'
	},
	'.cm-property-calendar-title': {
		color: 'var(--colors-text)',
		fontSize: '13px',
		fontWeight: '600',
		textAlign: 'center'
	},
	'.cm-property-calendar-nav': {
		width: '32px',
		height: '30px'
	},
	'.cm-property-calendar-grid': {
		display: 'grid',
		gridTemplateColumns: 'repeat(7, 1fr)',
		gap: '4px'
	},
	'.cm-property-calendar-weekday': {
		color: 'var(--colors-textMuted)',
		fontSize: '11px',
		fontWeight: '600',
		lineHeight: '24px',
		textAlign: 'center'
	},
	'.cm-property-calendar-empty': {
		minHeight: '30px'
	},
	'.cm-property-calendar-day': {
		minWidth: '0',
		minHeight: '30px',
		padding: '0'
	},
	'.cm-property-calendar-day.is-selected': {
		backgroundColor: 'var(--colors-primary)',
		borderColor: 'var(--colors-primary)'
	},
	'.cm-property-switch': {
		width: '18px',
		height: '18px',
		marginTop: '7px',
		accentColor: 'var(--colors-primary)'
	},
	'.cm-property-list-editor': {
		display: 'grid',
		gap: '6px'
	},
	'.cm-property-list-input-row[hidden]': {
		display: 'none'
	},
	'.cm-property-chips': {
		display: 'flex',
		flexWrap: 'wrap',
		gap: '6px'
	},
	'.cm-property-chip': {
		minHeight: '26px',
		border: '1px solid var(--colors-border)',
		borderRadius: '6px',
		backgroundColor: 'var(--colors-surfaceVariant)',
		color: 'var(--colors-text)',
		padding: '3px 8px',
		font: 'inherit',
		cursor: 'pointer'
	},
	'.cm-property-chip:hover': {
		borderColor: 'var(--colors-primary)'
	},
	'.cm-property-list-chip': {
		display: 'inline-grid',
		gridTemplateColumns: 'minmax(0, auto) 20px',
		alignItems: 'center',
		gap: '4px',
		padding: '0'
	},
	'.cm-property-list-chip-label': {
		minWidth: '0',
		padding: '3px 2px 3px 8px',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap'
	},
	'.cm-property-list-chip-remove': {
		width: '20px',
		height: '24px',
		padding: '0',
		border: '0',
		backgroundColor: 'transparent',
		color: 'var(--colors-textMuted)',
		font: 'inherit',
		cursor: 'pointer'
	},
	'.cm-property-list-chip-remove:hover': {
		color: 'var(--colors-text)'
	},
	'.cm-property-list-add': {
		minWidth: '28px',
		justifyContent: 'center',
		fontWeight: '600'
	},
	'.cm-property-link-editor': {
		display: 'grid',
		gap: '8px'
	},
	'.cm-property-link-input-row': {
		position: 'relative'
	},
	'.cm-property-link-input-row[hidden]': {
		display: 'none'
	},
	'.cm-property-link-menu': {
		width: '100%',
		maxHeight: '240px',
		overflowY: 'auto'
	},
	'.cm-property-tag-menu': {
		width: '100%',
		maxHeight: '240px',
		overflowY: 'auto'
	},
	'.cm-property-link-chip': {
		display: 'inline-grid',
		gridTemplateColumns: 'minmax(0, auto) 20px',
		alignItems: 'center',
		gap: '4px',
		padding: '0'
	},
	'.cm-property-link-chip.is-broken': {
		borderColor: 'var(--colors-warning)'
	},
	'.cm-property-link-open, .cm-property-link-remove': {
		border: '0',
		backgroundColor: 'transparent',
		color: 'inherit',
		font: 'inherit',
		cursor: 'pointer'
	},
	'.cm-property-link-open': {
		minWidth: '0',
		padding: '3px 2px 3px 8px',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		color: 'var(--colors-primary)'
	},
	'.cm-property-link-remove': {
		width: '20px',
		height: '24px',
		padding: '0',
		color: 'var(--colors-textMuted)'
	},
	'.cm-property-link-remove:hover': {
		color: 'var(--colors-text)'
	},
	'.cm-property-link-add': {
		minWidth: '28px',
		justifyContent: 'center',
		fontWeight: '600'
	},
	'.cm-property-icon-button': {
		position: 'absolute',
		top: '50%',
		right: '8px',
		transform: 'translateY(-50%)',
		width: '24px',
		height: '24px',
		border: '0',
		borderRadius: '6px',
		backgroundColor: 'transparent',
		color: 'var(--colors-textMuted)',
		cursor: 'pointer',
		lineHeight: '1',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: '2'
	},
	'.cm-property-icon-button:hover': {
		color: 'var(--colors-text)',
		backgroundColor: 'var(--colors-surfaceVariant)'
	},
	'.cm-property-add': {
		marginTop: '12px',
		marginLeft: '140px',
		maxWidth: '260px'
	},
	'.cm-properties-error, .cm-property-validation': {
		color: 'var(--colors-error)',
		fontSize: '12px',
		lineHeight: '1.4'
	},
	'.cm-properties-error': {
		marginBottom: '10px'
	},
	'.cm-property-validation': {
		marginTop: '4px'
	},
	
	'.cm-callout': {
		display: 'block',
		padding: '12px 16px',
		margin: '0',
		backgroundColor: 'rgba(255, 255, 255, 0.05)',
		borderLeft: '4px solid var(--colors-primary)',
		borderRadius: '4px',
		color: 'var(--colors-text)'
	},
	'.cm-callout-note': { borderLeftColor: 'var(--colors-primary)', backgroundColor: 'rgba(0, 122, 204, 0.1)' },
	'.cm-callout-warning': { borderLeftColor: 'var(--colors-warning)', backgroundColor: 'rgba(255, 170, 0, 0.1)' },
	'.cm-callout-danger': { borderLeftColor: 'var(--colors-error)', backgroundColor: 'rgba(255, 51, 51, 0.1)' },
	'.cm-callout-success': { borderLeftColor: 'var(--colors-success)', backgroundColor: 'rgba(46, 204, 113, 0.1)' },
	'.cm-callout-tip': { borderLeftColor: 'var(--colors-success)', backgroundColor: 'rgba(46, 204, 113, 0.1)' },
	'.cm-callout-info': { borderLeftColor: 'var(--colors-primary)', backgroundColor: 'rgba(0, 122, 204, 0.1)' },

	'.cm-hr': {
		border: 'none',
		borderTop: '1px solid var(--colors-border)',
		margin: '0',
		padding: '12px 0',
		width: '100%'
	},
	'.cm-task-checkbox': {
		marginRight: '8px',
		cursor: 'not-allowed',
		accentColor: 'var(--colors-primary)'
	},
	'.cm-image-preview-wrap': {
		display: 'block',
		width: '100%',
		textAlign: 'center',
		padding: '12px 0'
	},
	'.cm-image-preview': {
		maxWidth: '100%',
		maxHeight: '400px',
		borderRadius: '8px',
		display: 'inline-block',
		margin: '0',
		boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
	},
	
	'.cm-table-widget-wrap': {
		display: 'block',
		width: '100%',
		overflowX: 'auto',
		margin: '0',
		padding: '16px 0'
	},
	'.cm-table-widget': {
		width: '100%',
		borderCollapse: 'collapse',
		textAlign: 'left',
		color: 'var(--colors-text)',
		backgroundColor: 'rgba(255, 255, 255, 0.02)'
	},
	'.cm-table-widget th, .cm-table-widget td': {
		padding: '12px 16px',
		border: '1px solid var(--colors-border)'
	},
	'.cm-table-widget th': {
		backgroundColor: 'rgba(255, 255, 255, 0.05)',
		fontWeight: '600'
	},
	'.cm-table-widget tr:nth-child(even)': {
		backgroundColor: 'rgba(255, 255, 255, 0.02)'
	},

	'.cm-mermaid-widget-wrap': {
		display: 'flex',
		justifyContent: 'center',
		padding: '24px',
		margin: '0',
		backgroundColor: 'var(--colors-surface)',
		border: '1px solid var(--colors-border)',
		borderRadius: '8px',
		width: '100%'
	},
	'.cm-mermaid-error': {
		color: 'var(--colors-error)',
		fontFamily: 'monospace',
		whiteSpace: 'pre-wrap'
	},

	'.cm-codeblock-line': {
		backgroundColor: 'rgba(255, 255, 255, 0.04)',
		padding: '0 16px'
	},
	'.cm-codeblock-top': {
		borderTopLeftRadius: '8px',
		borderTopRightRadius: '8px',
		paddingTop: '12px',
		position: 'relative'
	},
	'.cm-codeblock-bottom': {
		borderBottomLeftRadius: '8px',
		borderBottomRightRadius: '8px',
		paddingBottom: '24px',
		marginBottom: '0'
	},
	'.cm-copy-code-btn': {
		position: 'absolute',
		right: '8px',
		top: '8px',
		background: 'rgba(255, 255, 255, 0.05)',
		border: '1px solid rgba(255, 255, 255, 0.1)',
		color: 'var(--colors-textMuted, #888)',
		borderRadius: '6px',
		width: '28px',
		height: '28px',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		cursor: 'pointer',
		transition: 'all 0.2s ease',
		zIndex: '10'
	},
	'.cm-copy-code-btn:hover': {
		background: 'rgba(255, 255, 255, 0.15)',
		color: 'var(--colors-text, #fff)'
	},
	'.cm-inline-code': {
		backgroundColor: 'rgba(0, 0, 0, 0.25)',
		padding: '2px 4px',
		borderRadius: '4px'
	},

	// Hidden syntax markers (collapses visually to 0 width while preserving standard inline baseline)
	'.cm-syntax-hidden': {
		display: 'inline',
		fontSize: '0px !important',
		letterSpacing: '-1em !important',
		opacity: '0 !important',
		visibility: 'hidden !important',
		userSelect: 'none !important',
		pointerEvents: 'none !important'
	},

	// Active-region syntax markers: shown at reduced opacity
	'.cm-syntax-visible': {
		opacity: '0.4',
		transition: 'opacity 150ms ease'
	},

	// Widget fade-in animation for smooth decoration appearance
	'.cm-hr, .cm-task-checkbox-wrap, .cm-image-preview-wrap, .cm-link-preview, .cm-table-widget-wrap, .cm-mermaid-widget-wrap': {
		animation: 'cm-widget-enter 150ms ease'
	}

}, { dark: true });

export const brainstormHighlightStyle = HighlightStyle.define([
	{ tag: t.heading1, color: 'var(--colors-primary)', fontSize: '2.2em', fontWeight: '700' },
	{ tag: t.heading2, color: 'var(--colors-primary)', fontSize: '1.8em', fontWeight: '600' },
	{ tag: t.heading3, color: 'var(--colors-primary)', fontSize: '1.4em', fontWeight: '600' },
	{ tag: t.heading4, color: 'var(--colors-primary)', fontSize: '1.2em', fontWeight: '600' },
	{ tag: t.heading5, color: 'var(--colors-primary)', fontSize: '1.2em', fontWeight: '600' },
	{ tag: t.heading6, color: 'var(--colors-primary)', fontSize: '1.2em', fontWeight: '600' },
	{ tag: t.strong, fontWeight: '700' },
	{ tag: t.emphasis, fontStyle: 'italic' },
	{ tag: t.strikethrough, textDecoration: 'line-through', opacity: '0.7' },
	{ tag: t.link, color: 'var(--colors-primary)', textDecoration: 'underline' },
	{ tag: t.quote, color: 'var(--colors-textMuted)', fontStyle: 'italic', borderLeft: '3px solid var(--colors-primary)', paddingLeft: '12px' },
	{ tag: t.monospace, fontFamily: 'var(--font-mono, monospace)', fontSize: '0.9em', color: 'var(--colors-primary)' },
	{ tag: t.list, color: 'var(--colors-primary)', fontWeight: '600' }
]);

export const brainstormHighlightStyleExtension = syntaxHighlighting(brainstormHighlightStyle);

export function tagAccentTheme(color: string) {
	if (!color) return [];

	return [
		EditorView.theme({
			'&': {
				'--colors-primary': color
			},
			'.cm-content': {
				caretColor: color
			},
			'&.cm-focused .cm-cursor, .cm-dropCursor': {
				borderLeftColor: color
			},
			'.cm-selectionBackground, &.cm-focused .cm-selectionBackground, .cm-content ::selection': {
				backgroundColor: `color-mix(in srgb, ${color} 42%, rgba(59, 130, 246, 0.25)) !important`
			},
			'.cm-wikilink, .cm-link-preview, .cm-tag, .cm-property-link-open': {
				color
			},
			'.cm-tag': {
				backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`
			},
			'.cm-property-input:focus, .cm-property-picker-button:hover, .cm-property-add-button:hover, .cm-property-calendar-button:hover, .cm-property-menu-action:hover, .cm-property-calendar-nav:hover, .cm-property-calendar-day:hover, .cm-property-chip:hover': {
				borderColor: color
			},
			'.cm-property-calendar-day.is-selected': {
				backgroundColor: color,
				borderColor: color
			},
			'.cm-callout': {
				borderLeftColor: color
			},
			'.cm-callout-note, .cm-callout-info': {
				borderLeftColor: color,
				backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`
			},
			'.cm-task-checkbox, .cm-property-switch': {
				accentColor: color
			}
		}, { dark: true }),
		syntaxHighlighting(HighlightStyle.define([
			{ tag: t.heading1, color, fontSize: '2.2em', fontWeight: '700' },
			{ tag: t.heading2, color, fontSize: '1.8em', fontWeight: '600' },
			{ tag: t.heading3, color, fontSize: '1.4em', fontWeight: '600' },
			{ tag: t.heading4, color, fontSize: '1.2em', fontWeight: '600' },
			{ tag: t.heading5, color, fontSize: '1.2em', fontWeight: '600' },
			{ tag: t.heading6, color, fontSize: '1.2em', fontWeight: '600' },
			{ tag: t.link, color, textDecoration: 'underline' },
			{ tag: t.quote, color: 'var(--colors-textMuted)', fontStyle: 'italic', borderLeft: `3px solid ${color}`, paddingLeft: '12px' },
			{ tag: t.monospace, fontFamily: 'var(--font-mono, monospace)', fontSize: '0.9em', color },
			{ tag: t.list, color, fontWeight: '600' }
		]))
	];
}