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
	'.cm-footnote-ref': {
		color: 'var(--colors-primary)',
		backgroundColor: 'color-mix(in srgb, var(--colors-primary) 14%, transparent)',
		borderRadius: '999px',
		padding: '0 5px',
		fontSize: '0.78em',
		fontWeight: '700',
		verticalAlign: 'super'
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
		cursor: 'pointer',
		display: 'inline',
		fontSize: 'inherit',
		fontFamily: 'inherit',
		lineHeight: 'inherit',
		verticalAlign: 'baseline'
	},
	'.cm-link-preview:hover': {
		filter: 'brightness(1.15)'
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
	'.cm-render-widget-boundary': {
		display: 'inline-block',
		contain: 'layout style paint',
		maxWidth: '100%',
		verticalAlign: 'baseline'
	},
	'.cm-render-widget-boundary[data-render-widget="Link"], .cm-render-widget-boundary[data-render-widget="URL"]': {
		display: 'inline !important',
		contain: 'none !important',
		verticalAlign: 'baseline',
		fontSize: 'inherit',
		fontFamily: 'inherit',
		lineHeight: 'inherit'
	},
	'.cm-render-widget-boundary[data-render-widget="Mermaid"], .cm-render-widget-boundary[data-render-widget="Table"], .cm-render-widget-boundary[data-render-widget="Properties"], .cm-render-widget-boundary[data-render-widget="Horizontal Rule"]': {
		display: 'block',
		width: '100%'
	},
	'.cm-render-error': {
		boxSizing: 'border-box',
		margin: '8px 0',
		padding: '8px 10px',
		border: '1px solid var(--colors-error, #ff3b30)',
		borderRadius: '6px',
		color: 'var(--colors-error, #ff3b30)',
		backgroundColor: 'color-mix(in srgb, var(--colors-error, #ff3b30) 10%, transparent)',
		fontFamily: 'var(--font-mono, monospace)',
		fontSize: '12px',
		whiteSpace: 'pre-wrap',
		overflowWrap: 'anywhere'
	},
	'.cm-frontmatter': {
		color: 'var(--colors-textMuted)',
		fontFamily: 'var(--font-mono, monospace)',
		fontSize: '0.9em'
	},

	'.cm-line:has(.cm-properties-panel), .cm-embedWidget:has(.cm-properties-panel)': {
		overflow: 'visible !important',
		zIndex: '20'
	},
	'.cm-properties-panel': {
		display: 'block',
		position: 'relative',
		zIndex: '20',
		overflow: 'visible !important',
		margin: '12px 0 20px 0',
		padding: '12px 14px',
		borderRadius: '14px',
		border: '1px solid color-mix(in srgb, var(--colors-border) 60%, transparent)',
		backgroundColor: 'color-mix(in srgb, var(--colors-surface, #1C1C1E) 55%, transparent)',
		backdropFilter: 'blur(20px) saturate(180%)',
		WebkitBackdropFilter: 'blur(20px) saturate(180%)',
		color: 'var(--colors-text)',
		fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", var(--font-sans, sans-serif)',
		boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), inset 0 1px 0 color-mix(in srgb, var(--colors-text) 10%, transparent)',
		transition: 'all 0.2s ease'
	},
	'.cm-properties-header': {
		display: 'flex',
		alignItems: 'center',
		gap: '8px',
		padding: '2px 4px',
		cursor: 'pointer',
		userSelect: 'none',
		color: 'var(--colors-textMuted)',
		fontSize: '11px',
		fontWeight: '600',
		letterSpacing: '0.04em',
		textTransform: 'uppercase',
		transition: 'color 0.15s ease'
	},
	'.cm-properties-header:hover': {
		color: 'var(--colors-text)'
	},
	'.cm-properties-toggle-icon': {
		width: '16px',
		height: '16px',
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		color: 'var(--colors-textMuted)',
		transition: 'color 0.15s ease'
	},
	'.cm-properties-chevron': {
		transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)'
	},
	'.cm-properties-panel.is-expanded .cm-properties-chevron': {
		transform: 'rotate(90deg)'
	},
	'.cm-properties-panel.is-collapsed .cm-properties-chevron': {
		transform: 'rotate(0deg)'
	},
	'.cm-properties-title-group': {
		display: 'flex',
		alignItems: 'center',
		gap: '8px'
	},
	'.cm-properties-title': {
		fontSize: '11px',
		fontWeight: '700',
		letterSpacing: '0.05em',
		textTransform: 'uppercase'
	},
	'.cm-properties-count-badge': {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		minWidth: '18px',
		height: '18px',
		padding: '0 6px',
		borderRadius: '9px',
		fontSize: '10px',
		fontWeight: '600',
		backgroundColor: 'color-mix(in srgb, var(--colors-text) 10%, transparent)',
		color: 'var(--colors-textMuted)'
	},
	'.cm-properties-body': {
		marginTop: '10px',
		position: 'relative',
		overflow: 'visible !important'
	},
	'.cm-properties-panel input, .cm-properties-panel textarea, .cm-properties-panel button, .cm-properties-panel select': {
		fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", var(--font-sans, sans-serif)'
	},
	'.cm-properties-rows': {
		display: 'flex',
		flexDirection: 'column',
		gap: '2px',
		padding: '4px',
		borderRadius: '10px',
		backgroundColor: 'color-mix(in srgb, var(--colors-background) 40%, transparent)',
		border: '1px solid color-mix(in srgb, var(--colors-border) 45%, transparent)',
		position: 'relative',
		overflow: 'visible !important'
	},
	'.cm-property-row': {
		display: 'grid',
		gridTemplateColumns: '136px minmax(0, 1fr)',
		alignItems: 'center',
		gap: '12px',
		minHeight: '34px',
		padding: '3px 8px',
		borderRadius: '7px',
		position: 'relative',
		overflow: 'visible !important',
		transition: 'background-color 0.15s ease'
	},
	'.cm-property-row:hover': {
		backgroundColor: 'color-mix(in srgb, var(--colors-text) 4%, transparent)'
	},
	'.cm-property-row:has(.cm-property-menu:not([hidden])), .cm-property-row:has(.cm-property-calendar:not([hidden]))': {
		zIndex: '100',
		position: 'relative'
	},
	'.cm-property-label': {
		display: 'flex',
		alignItems: 'center',
		gap: '7px',
		color: 'var(--colors-textMuted)',
		fontSize: '12px',
		fontWeight: '500',
		lineHeight: '1.4',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		userSelect: 'none'
	},
	'.cm-property-label-icon': {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: '0',
		color: 'var(--colors-textMuted)',
		opacity: '0.75'
	},
	'.cm-property-label-text': {
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap'
	},
	'.cm-property-control': {
		minWidth: '0',
		position: 'relative',
		overflow: 'visible !important'
	},
	'.cm-property-control:has(.cm-property-menu:not([hidden])), .cm-property-control:has(.cm-property-calendar:not([hidden]))': {
		zIndex: '100',
		position: 'relative'
	},
	'.cm-property-control.has-property-remove .cm-property-input, .cm-property-control.has-property-remove .cm-property-picker-button': {
		paddingRight: '36px'
	},
	'.cm-property-control.has-property-remove .cm-property-list-input-row .cm-property-input, .cm-property-control.has-property-remove .cm-property-link-input-row .cm-property-input': {
		paddingRight: '36px'
	},
	'.cm-property-row:has(.cm-property-textarea), .cm-property-row:has(.cm-property-validation)': {
		alignItems: 'start'
	},
	'.cm-property-dates-stack': {
		display: 'flex',
		flexDirection: 'column',
		gap: '2px'
	},
	'.cm-property-input': {
		width: '100%',
		minHeight: '30px',
		boxSizing: 'border-box',
		border: '1px solid color-mix(in srgb, var(--colors-border) 60%, transparent)',
		borderRadius: '7px',
		backgroundColor: 'color-mix(in srgb, var(--colors-surface) 75%, transparent)',
		color: 'var(--colors-text)',
		padding: '5px 9px',
		font: 'inherit',
		fontSize: '12.5px',
		outline: 'none',
		transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
	},
	'.cm-property-input:focus': {
		borderColor: '#007AFF',
		boxShadow: '0 0 0 3px color-mix(in srgb, #007AFF 25%, transparent)'
	},
	'.cm-property-option-custom-fields': {
		display: 'grid',
		gridTemplateColumns: '1fr auto',
		gap: '5px',
		padding: '2px 0 4px'
	},
	'.cm-property-option-custom-fields .cm-property-input:first-child': {
		gridColumn: '1 / -1'
	},
	'.cm-property-option-color': {
		width: '30px',
		height: '30px',
		padding: '2px',
		border: '1px solid color-mix(in srgb, var(--colors-border) 60%, transparent)',
		borderRadius: '7px',
		background: 'transparent',
		cursor: 'pointer'
	},
	'.cm-property-textarea': {
		resize: 'vertical',
		lineHeight: '1.5',
		minHeight: '60px'
	},
	'.cm-property-popover-host': {
		position: 'relative',
		overflow: 'visible !important'
	},
	'.cm-property-popover-host:has(.cm-property-menu:not([hidden])), .cm-property-popover-host:has(.cm-property-calendar:not([hidden]))': {
		zIndex: '100',
		position: 'relative'
	},
	'.cm-property-picker-button, .cm-property-add-button, .cm-property-calendar-button, .cm-property-menu-action, .cm-property-calendar-nav': {
		border: '1px solid color-mix(in srgb, var(--colors-border) 60%, transparent)',
		borderRadius: '7px',
		backgroundColor: 'color-mix(in srgb, var(--colors-surface) 70%, transparent)',
		color: 'var(--colors-text)',
		font: 'inherit',
		fontSize: '12.5px',
		cursor: 'pointer',
		backdropFilter: 'blur(8px)',
		WebkitBackdropFilter: 'blur(8px)',
		transition: 'all 0.15s ease'
	},
	'.cm-property-picker-button, .cm-property-add-button': {
		minHeight: '30px',
		width: '100%',
		padding: '5px 9px',
		textAlign: 'left'
	},
	'.cm-property-add-button': {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: '12px',
		borderRadius: '8px',
		border: '1px dashed color-mix(in srgb, var(--colors-border) 70%, transparent)'
	},
	'.cm-property-add-label': {
		display: 'inline-flex',
		alignItems: 'center',
		gap: '6px',
		fontWeight: '500',
		fontSize: '12px',
		color: 'var(--colors-textMuted)'
	},
	'.cm-property-add-button kbd': {
		color: 'var(--colors-textMuted)',
		fontSize: '10px',
		fontWeight: '600',
		fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
		padding: '2px 5px',
		borderRadius: '4px',
		backgroundColor: 'color-mix(in srgb, var(--colors-text) 8%, transparent)'
	},
	'.cm-property-picker-button:hover, .cm-property-add-button:hover, .cm-property-calendar-button:hover, .cm-property-menu-action:hover, .cm-property-calendar-nav:hover': {
		borderColor: '#007AFF',
		backgroundColor: 'color-mix(in srgb, #007AFF 10%, var(--colors-surface))',
		color: 'var(--colors-text)'
	},
	'.cm-property-menu, .cm-property-spotlight': {
		position: 'fixed',
		zIndex: '999999 !important',
		isolation: 'isolate',
		boxSizing: 'border-box',
		borderRadius: '16px',
		display: 'flex !important',
		flexDirection: 'column !important',
		gap: '3px',
		maxHeight: '260px',
		overflowY: 'auto',
		padding: '6px',
		color: 'var(--colors-text)',
		backgroundColor: 'color-mix(in srgb, var(--colors-surface, #1C1C1E) 85%, rgba(20, 20, 24, 0.85)) !important',
		backdropFilter: 'blur(24px) saturate(180%) !important',
		WebkitBackdropFilter: 'blur(24px) saturate(180%) !important',
		border: '1px solid color-mix(in srgb, var(--colors-text) 16%, rgba(255, 255, 255, 0.12)) !important',
		boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 color-mix(in srgb, var(--colors-text) 20%, transparent) !important'
	},
	'.cm-property-calendar': {
		position: 'fixed',
		zIndex: '999999 !important',
		isolation: 'isolate',
		boxSizing: 'border-box',
		overflow: 'visible !important',
		margin: '0 !important',
		padding: '0 !important',
		border: 'none !important',
		background: 'transparent !important',
		boxShadow: 'none !important'
	},
	'.cm-property-menu::before, .cm-property-spotlight::before': {
		content: '""',
		position: 'absolute',
		inset: '0',
		zIndex: '0',
		background: 'color-mix(in srgb, var(--colors-surfaceVariant, var(--colors-surface, #1C1C1E)) 70%, transparent)',
		backdropFilter: 'url(#liquid-glass-refract-dark) blur(12px) saturate(160%)',
		WebkitBackdropFilter: 'blur(20px) saturate(160%)',
		pointerEvents: 'none'
	},
	'.cm-property-menu::after, .cm-property-spotlight::after': {
		content: '""',
		position: 'absolute',
		inset: '0',
		zIndex: '1',
		borderRadius: 'inherit',
		padding: '1px',
		background: 'linear-gradient(160deg, color-mix(in srgb, var(--colors-text) 50%, transparent) 0%, color-mix(in srgb, var(--colors-text) 15%, transparent) 18%, transparent 45%, color-mix(in srgb, var(--colors-text) 10%, transparent) 100%)',
		mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
		WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
		WebkitMaskComposite: 'xor',
		maskComposite: 'exclude',
		pointerEvents: 'none'
	},
	'.cm-property-menu > *, .cm-property-calendar > *, .cm-property-spotlight > *': {
		position: 'relative',
		zIndex: '2'
	},
	'.cm-property-menu[hidden], .cm-property-calendar[hidden], .cm-property-custom-row[hidden]': {
		display: 'none !important'
	},
	'.cm-property-menu-search': {
		marginBottom: '8px'
	},
	'.cm-property-menu-list': {
		display: 'flex',
		flexDirection: 'column',
		gap: '2px',
		maxHeight: '220px',
		overflowY: 'auto'
	},
	'.cm-property-menu-item': {
		minHeight: '38px',
		width: '100% !important',
		boxSizing: 'border-box !important',
		border: '0',
		borderRadius: '8px',
		backgroundColor: 'transparent',
		color: 'var(--colors-text)',
		padding: '6px 10px',
		font: 'inherit',
		fontSize: '12.5px',
		textAlign: 'left !important',
		cursor: 'pointer',
		display: 'flex !important',
		flexDirection: 'column !important',
		alignItems: 'flex-start !important',
		justifyContent: 'center !important',
		gap: '2px !important',
		margin: '0 !important',
		transition: 'background 0.12s ease, color 0.12s ease'
	},
	'.cm-property-menu-item-title': {
		fontSize: '13px',
		fontWeight: '600',
		lineHeight: '1.3',
		color: 'var(--colors-text)',
		display: 'block !important',
		width: '100% !important',
		textAlign: 'left !important',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap'
	},
	'.cm-property-menu-item-subtitle': {
		fontSize: '11px',
		fontWeight: '400',
		lineHeight: '1.3',
		color: 'var(--colors-textMuted)',
		display: 'block !important',
		width: '100% !important',
		textAlign: 'left !important',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap'
	},
	'.cm-property-menu-item:hover': {
		backgroundColor: 'color-mix(in srgb, var(--colors-hover, #2C2C2E) 75%, transparent)',
		color: 'var(--colors-text)'
	},
	'.cm-property-menu-item.is-selected': {
		backgroundColor: 'var(--colors-primary, #0A84FF)',
		color: '#ffffff'
	},
	'.cm-property-menu-item.is-selected .cm-property-menu-item-title': {
		color: '#ffffff'
	},
	'.cm-property-menu-item.is-selected .cm-property-menu-item-subtitle': {
		color: 'rgba(255, 255, 255, 0.75)'
	},
	'.cm-property-custom-row': {
		display: 'grid',
		gridTemplateColumns: 'minmax(0, 1fr) auto',
		gap: '6px',
		marginTop: '8px',
		paddingTop: '8px',
		borderTop: '1px solid color-mix(in srgb, var(--colors-border) 60%, transparent)'
	},
	'.cm-property-menu-action': {
		minHeight: '30px',
		padding: '0 12px'
	},
	'.cm-property-spotlight-overlay': {
		position: 'fixed',
		inset: '0',
		zIndex: '1000',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		padding: '24px',
		backdropFilter: 'blur(16px)',
		WebkitBackdropFilter: 'blur(16px)',
		backgroundColor: 'rgba(0, 0, 0, 0.4)'
	},
	'.cm-property-spotlight-overlay[hidden]': {
		display: 'none'
	},
	'.cm-property-spotlight': {
		position: 'relative',
		width: 'min(500px, calc(100vw - 32px))',
		maxHeight: 'min(520px, calc(100vh - 96px))',
		padding: '10px',
		display: 'flex',
		flexDirection: 'column',
		gap: '8px'
	},
	'.cm-property-spotlight-search': {
		width: '100%',
		minHeight: '40px',
		boxSizing: 'border-box',
		border: '1px solid color-mix(in srgb, var(--colors-border) 60%, transparent)',
		borderRadius: '9px',
		backgroundColor: 'color-mix(in srgb, var(--colors-background) 60%, transparent)',
		color: 'var(--colors-text)',
		padding: '8px 12px',
		font: 'inherit',
		fontSize: '14px',
		outline: 'none'
	},
	'.cm-property-spotlight-search:focus': {
		borderColor: '#007AFF',
		boxShadow: '0 0 0 3px color-mix(in srgb, #007AFF 25%, transparent)'
	},
	'.cm-property-spotlight-list': {
		display: 'flex',
		flexDirection: 'column',
		gap: '2px',
		maxHeight: '300px',
		overflowY: 'auto'
	},
	'.cm-property-spotlight .cm-property-menu-item': {
		minHeight: '38px',
		padding: '8px 10px'
	},
	'.cm-property-spotlight-empty': {
		color: 'var(--colors-textMuted)',
		fontSize: '12.5px',
		padding: '16px',
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
		top: '3px',
		right: '3px',
		width: '24px',
		height: '24px',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		padding: '0',
		borderRadius: '5px'
	},
	'.cm-property-calendar-button svg': {
		fill: 'none',
		stroke: 'currentColor',
		strokeWidth: '2',
		strokeLinecap: 'round',
		strokeLinejoin: 'round'
	},
	'.cm-property-calendar-header': {
		display: 'flex !important',
		alignItems: 'center !important',
		justifyContent: 'space-between !important',
		marginBottom: '10px !important',
		padding: '0 2px !important'
	},
	'.cm-property-calendar-title': {
		color: 'var(--colors-text)',
		fontSize: '13px !important',
		fontWeight: '600 !important',
		letterSpacing: '-0.01em',
		textAlign: 'center'
	},
	'.cm-property-calendar-nav': {
		width: '28px !important',
		height: '28px !important',
		border: '1px solid color-mix(in srgb, var(--colors-border) 60%, transparent)',
		borderRadius: '8px !important',
		backgroundColor: 'color-mix(in srgb, var(--colors-surface) 70%, transparent)',
		color: 'var(--colors-text)',
		cursor: 'pointer',
		transition: 'all 0.15s ease',
		display: 'flex !important',
		alignItems: 'center !important',
		justifyContent: 'center !important',
		padding: '0 !important'
	},
	'.cm-property-calendar-nav:hover': {
		backgroundColor: '#007AFF',
		borderColor: '#007AFF',
		color: '#ffffff'
	},
	'.cm-property-calendar-grid': {
		display: 'grid !important',
		gridTemplateColumns: 'repeat(7, 34px) !important',
		justifyContent: 'space-between !important',
		rowGap: '4px !important'
	},
	'.cm-property-calendar-weekday': {
		width: '34px !important',
		height: '24px !important',
		display: 'flex !important',
		alignItems: 'center !important',
		justifyContent: 'center !important',
		color: 'var(--colors-textMuted)',
		fontSize: '11px !important',
		fontWeight: '600 !important'
	},
	'.cm-property-calendar-empty': {
		width: '34px !important',
		height: '32px !important'
	},
	'.cm-property-calendar-day': {
		width: '34px !important',
		height: '32px !important',
		display: 'flex !important',
		alignItems: 'center !important',
		justifyContent: 'center !important',
		padding: '0 !important',
		border: '0 !important',
		borderRadius: '8px !important',
		backgroundColor: 'transparent',
		color: 'var(--colors-text)',
		font: 'inherit',
		fontSize: '12.5px !important',
		fontWeight: '500',
		cursor: 'pointer',
		transition: 'all 0.15s ease'
	},
	'.cm-property-calendar-day:hover': {
		backgroundColor: 'color-mix(in srgb, #007AFF 18%, transparent)',
		color: '#007AFF'
	},
	'.cm-property-calendar-day.is-selected': {
		backgroundColor: '#007AFF !important',
		color: '#ffffff !important',
		fontWeight: '600 !important',
		boxShadow: '0 3px 10px color-mix(in srgb, #007AFF 40%, transparent) !important'
	},

	/* Custom Apple iOS/macOS Toggle Switch */
	'.cm-property-switch': {
		appearance: 'none',
		WebkitAppearance: 'none',
		width: '32px',
		height: '18px',
		borderRadius: '9px',
		backgroundColor: 'color-mix(in srgb, var(--colors-text) 18%, transparent)',
		position: 'relative',
		cursor: 'pointer',
		outline: 'none',
		margin: '0',
		transition: 'background-color 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
	},
	'.cm-property-switch::before': {
		content: '""',
		position: 'absolute',
		top: '2px',
		left: '2px',
		width: '14px',
		height: '14px',
		borderRadius: '50%',
		backgroundColor: '#ffffff',
		boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
		transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
	},
	'.cm-property-switch:checked': {
		backgroundColor: '#34C759'
	},
	'.cm-property-switch:checked::before': {
		transform: 'translateX(14px)'
	},
	'.cm-property-switch:focus-visible': {
		boxShadow: '0 0 0 3px color-mix(in srgb, #34C759 30%, transparent)'
	},

	'.cm-property-list-editor': {
		display: 'flex',
		flexDirection: 'column',
		gap: '6px'
	},
	'.cm-property-list-input-row[hidden]': {
		display: 'none'
	},
	'.cm-property-chips': {
		display: 'flex',
		flexWrap: 'wrap',
		gap: '5px'
	},
	'.cm-property-chip': {
		minHeight: '24px',
		border: '1px solid color-mix(in srgb, var(--colors-border) 60%, transparent)',
		borderRadius: '12px',
		backgroundColor: 'color-mix(in srgb, var(--colors-surfaceVariant, var(--colors-surface)) 70%, transparent)',
		color: 'var(--colors-text)',
		padding: '2px 8px',
		font: 'inherit',
		fontSize: '12px',
		cursor: 'pointer',
		transition: 'all 0.15s ease'
	},
	'.cm-property-chip:hover': {
		borderColor: '#007AFF',
		backgroundColor: 'color-mix(in srgb, #007AFF 10%, var(--colors-surfaceVariant))'
	},
	'.cm-property-list-chip': {
		display: 'inline-flex',
		alignItems: 'center',
		gap: '3px',
		padding: '0'
	},
	'.cm-property-list-chip-label': {
		minWidth: '0',
		padding: '2px 2px 2px 8px',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap'
	},
	'.cm-property-list-chip-remove': {
		width: '18px',
		height: '18px',
		padding: '0',
		border: '0',
		borderRadius: '50%',
		backgroundColor: 'transparent',
		color: 'var(--colors-textMuted)',
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		cursor: 'pointer',
		marginRight: '3px',
		transition: 'all 0.15s ease'
	},
	'.cm-property-list-chip-remove:hover': {
		backgroundColor: 'color-mix(in srgb, var(--colors-text) 15%, transparent)',
		color: 'var(--colors-text)'
	},
	'.cm-property-list-add': {
		minWidth: '24px',
		justifyContent: 'center',
		fontWeight: '600'
	},
	'.cm-property-link-editor': {
		display: 'flex',
		flexDirection: 'column',
		gap: '6px'
	},
	'.cm-property-link-input-row': {
		position: 'relative'
	},
	'.cm-property-link-input-row[hidden]': {
		display: 'none'
	},
	'.cm-property-link-chip': {
		display: 'inline-flex',
		alignItems: 'center',
		gap: '3px',
		padding: '0'
	},
	'.cm-property-icon-grid': {
		display: 'grid',
		gridTemplateColumns: 'repeat(5, 1fr)',
		gap: '4px',
		maxHeight: '230px',
		overflowY: 'auto',
		paddingRight: '2px'
	},
	'.cm-property-icon-grid-item': {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		height: '36px',
		border: '1px solid transparent',
		borderRadius: '7px',
		backgroundColor: 'transparent',
		color: 'var(--colors-textMuted)',
		cursor: 'pointer',
		transition: 'all 0.15s ease'
	},
	'.cm-property-icon-grid-item:hover': {
		backgroundColor: 'color-mix(in srgb, #007AFF 14%, transparent)',
		color: '#007AFF',
		borderColor: 'color-mix(in srgb, #007AFF 30%, transparent)'
	},
	'.cm-property-icon-grid-item.is-selected': {
		backgroundColor: '#007AFF',
		color: '#ffffff',
		borderColor: '#007AFF'
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
		padding: '2px 2px 2px 8px',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		color: '#007AFF',
		fontWeight: '500'
	},
	'.cm-property-link-remove': {
		width: '18px',
		height: '18px',
		padding: '0',
		borderRadius: '50%',
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		color: 'var(--colors-textMuted)',
		marginRight: '3px'
	},
	'.cm-property-link-remove:hover': {
		backgroundColor: 'color-mix(in srgb, var(--colors-text) 15%, transparent)',
		color: 'var(--colors-text)'
	},
	'.cm-property-link-add': {
		minWidth: '24px',
		justifyContent: 'center',
		fontWeight: '600'
	},
	'.cm-property-icon-button': {
		position: 'absolute',
		top: '50%',
		right: '6px',
		transform: 'translateY(-50%)',
		width: '20px',
		height: '20px',
		border: '0',
		borderRadius: '50%',
		backgroundColor: 'transparent',
		color: 'var(--colors-textMuted)',
		cursor: 'pointer',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: '2',
		opacity: '0',
		transition: 'all 0.15s ease'
	},
	'.cm-property-row:hover .cm-property-icon-button': {
		opacity: '0.6'
	},
	'.cm-property-icon-button:hover': {
		opacity: '1 !important',
		color: 'var(--colors-text)',
		backgroundColor: 'color-mix(in srgb, var(--colors-text) 12%, transparent)'
	},
	'.cm-property-add': {
		marginTop: '8px'
	},
	'.cm-properties-error, .cm-property-validation': {
		color: 'var(--colors-error)',
		fontSize: '11.5px',
		lineHeight: '1.4'
	},
	'.cm-properties-error': {
		marginBottom: '8px'
	},
	'.cm-property-validation': {
		marginTop: '4px'
	},
	
	'.cm-callout-line': {
		padding: '0 20px',
		lineHeight: '1.6',
		position: 'relative'
	},
	'.cm-callout-top': {
		borderTopLeftRadius: '8px',
		borderTopRightRadius: '8px',
		paddingTop: '16px',
		marginTop: '12px'
	},
	'.cm-callout-bottom': {
		borderBottomLeftRadius: '8px',
		borderBottomRightRadius: '8px',
		paddingBottom: '16px',
		marginBottom: '12px'
	},

	'.cm-callout-note': { backgroundColor: 'rgba(59, 130, 246, 0.12)' },
	'.cm-callout-tip': { backgroundColor: 'rgba(45, 212, 191, 0.10)' },
	'.cm-callout-warning': { backgroundColor: 'rgba(245, 158, 11, 0.10)' },
	'.cm-callout-important': { backgroundColor: 'rgba(45, 212, 191, 0.10)' },
	'.cm-callout-caution': { backgroundColor: 'rgba(245, 158, 11, 0.10)' },
	'.cm-callout-success': { backgroundColor: 'rgba(34, 197, 94, 0.10)' },
	'.cm-callout-bug': { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
	'.cm-callout-question': { backgroundColor: 'rgba(245, 158, 11, 0.10)' },
	'.cm-callout-quote': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
	'.cm-callout-danger': { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
	'.cm-callout-info': { backgroundColor: 'rgba(59, 130, 246, 0.12)' },

	'.cm-callout-header': {
		display: 'flex',
		alignItems: 'center',
		gap: '8px',
		paddingBottom: '4px',
		userSelect: 'none'
	},
	'.cm-callout-icon': {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: '0'
	},
	'.cm-callout-title': {
		fontFamily: '"Inter", var(--font-sans, sans-serif)',
		fontSize: '14px',
		fontWeight: '600'
	},

	'.cm-callout-header-note, .cm-callout-header-info': { color: '#3b82f6' },
	'.cm-callout-header-tip, .cm-callout-header-important': { color: '#2dd4bf' },
	'.cm-callout-header-warning, .cm-callout-header-caution, .cm-callout-header-question': { color: '#f59e0b' },
	'.cm-callout-header-success': { color: '#22c55e' },
	'.cm-callout-header-bug, .cm-callout-header-danger': { color: '#ef4444' },
	'.cm-callout-header-quote': { color: '#94a3b8' },

	'.cm-blockquote-line': {
		position: 'relative',
		color: 'var(--colors-textMuted)',
		fontStyle: 'italic',
		paddingLeft: '16px',
		borderLeft: '3px solid color-mix(in srgb, var(--colors-primary) 70%, var(--colors-border))'
	},
	'.cm-blockquote-depth-2': {
		marginLeft: '16px',
		borderLeftColor: 'color-mix(in srgb, var(--colors-secondary, #22c55e) 70%, var(--colors-border))'
	},
	'.cm-blockquote-depth-3': {
		marginLeft: '32px',
		borderLeftColor: 'color-mix(in srgb, var(--colors-warning, #f59e0b) 70%, var(--colors-border))'
	},
	'.cm-list-line': {
		paddingLeft: '2px'
	},
	'.cm-list-marker-preview': {
		display: 'inline-block',
		color: 'var(--colors-textMuted, #8e8e93)',
		fontWeight: '500',
		userSelect: 'none',
		verticalAlign: 'baseline'
	},
	'.cm-list-marker-preview.is-unordered': {
		minWidth: '1.2em',
		marginRight: '0.4em',
		textAlign: 'center',
		fontSize: '1em',
		lineHeight: '1'
	},
	'.cm-list-marker-preview.is-unordered.depth-1': {
		fontSize: '1.1em'
	},
	'.cm-list-marker-preview.is-unordered.depth-2': {
		fontSize: '1em'
	},
	'.cm-list-marker-preview.is-unordered.depth-3': {
		fontSize: '0.85em'
	},
	'.cm-list-marker-preview.is-ordered': {
		minWidth: '1.5em',
		marginRight: '0.4em',
		textAlign: 'right',
		fontVariantNumeric: 'tabular-nums'
	},
	'.cm-render-widget-boundary[data-render-widget="List Marker"]': {
		display: 'inline-block',
		contain: 'none !important',
		verticalAlign: 'baseline'
	},
	'.cm-definition-line, .cm-footnote-definition-line': {
		color: 'var(--colors-textMuted)',
		paddingLeft: '18px',
		borderLeft: '2px solid var(--colors-border)'
	},
	'.cm-container-open-line, .cm-container-close-line': {
		color: 'var(--colors-textMuted)',
		backgroundColor: 'color-mix(in srgb, var(--colors-warning, #f59e0b) 10%, transparent)',
		borderLeft: '3px solid var(--colors-warning, #f59e0b)',
		paddingLeft: '12px'
	},

	'.cm-hr': {
		border: 'none',
		borderTop: '1px solid var(--colors-border)',
		margin: '0',
		padding: '12px 0',
		width: '100%'
	},
	'.cm-render-widget-boundary[data-render-widget="Task Checkbox"]': {
		display: 'inline-block !important',
		contain: 'none !important',
		verticalAlign: 'middle'
	},
	'.cm-task-checkbox-wrap': {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: '8px',
		verticalAlign: 'middle',
		pointerEvents: 'auto'
	},
	'.cm-task-checkbox': {
		margin: '0',
		cursor: 'pointer',
		accentColor: 'var(--colors-primary, #007acc)',
		width: '16px',
		height: '16px',
		pointerEvents: 'auto',
		verticalAlign: 'middle'
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
		padding: '0 20px',
		position: 'relative',
		fontFamily: 'var(--font-mono, "JetBrains Mono", "Fira Code", monospace)',
		fontSize: '13.5px',
		lineHeight: '1.6'
	},
	'.cm-codeblock-widget': {
		position: 'relative',
		display: 'block',
		boxSizing: 'border-box',
		width: '100%',
		margin: '12px 0',
		padding: '36px 16px 16px',
		border: '1px solid color-mix(in srgb, var(--colors-border) 80%, transparent)',
		borderRadius: '10px',
		backgroundColor: 'rgba(255, 255, 255, 0.04)',
		overflow: 'hidden'
	},
	'.cm-codeblock-widget .cm-copy-code-btn': {
		top: '8px',
		right: '8px'
	},
	'.cm-codeblock-language': {
		position: 'absolute',
		top: '10px',
		left: '16px',
		color: 'var(--colors-textMuted)',
		fontFamily: '"Inter", var(--font-sans, sans-serif)',
		fontSize: '13px',
		fontWeight: '500'
	},
	'.cm-codeblock-pre': {
		margin: '0',
		overflowX: 'auto',
		color: 'var(--colors-text)',
		fontFamily: 'var(--font-mono, monospace)',
		fontSize: '13.5px',
		lineHeight: '1.6',
		whiteSpace: 'pre'
	},
	'.cm-codeblock-top': {
		borderTopLeftRadius: '10px',
		borderTopRightRadius: '10px',
		paddingTop: '16px',
		marginTop: '8px',
		position: 'relative'
	},
	'.cm-codeblock-bottom': {
		borderBottomLeftRadius: '10px',
		borderBottomRightRadius: '10px',
		paddingBottom: '16px',
		marginBottom: '8px'
	},
	'.cm-codeblock-fence-hidden': {
		display: 'none !important',
		height: '0 !important',
		lineHeight: '0 !important',
		padding: '0 !important',
		margin: '0 !important',
		overflow: 'hidden !important'
	},
	'.cm-render-widget-boundary[data-render-widget="Copy Code"]': {
		display: 'inline',
		position: 'static',
		contain: 'none !important'
	},
	'.cm-codeblock-action-wrap': {
		position: 'absolute',
		right: '20px',
		top: '14px',
		display: 'flex',
		flexDirection: 'row',
		alignItems: 'center',
		gap: '10px',
		whiteSpace: 'nowrap',
		pointerEvents: 'auto',
		zIndex: '20'
	},
	'.cm-codeblock-lang-tag': {
		color: 'var(--colors-textMuted, rgba(255, 255, 255, 0.45))',
		fontFamily: '"Inter", var(--font-sans, sans-serif)',
		fontSize: '13px',
		fontWeight: '500',
		letterSpacing: '0.01em',
		userSelect: 'none',
		whiteSpace: 'nowrap'
	},
	'.cm-copy-code-btn': {
		position: 'relative',
		background: 'rgba(255, 255, 255, 0.06)',
		border: '1px solid rgba(255, 255, 255, 0.12)',
		color: 'var(--colors-textMuted, rgba(255, 255, 255, 0.6))',
		borderRadius: '6px',
		width: '28px',
		height: '28px',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		cursor: 'pointer',
		transition: 'all 0.15s ease',
		flexShrink: '0',
		opacity: '0.6'
	},
	'.cm-copy-code-btn:hover': {
		background: 'rgba(255, 255, 255, 0.15)',
		color: '#ffffff',
		opacity: '1'
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
	{ tag: t.keyword, color: '#ff79c6' },
	{ tag: [t.variableName, t.definition(t.variableName)], color: '#f8f8f2' },
	{ tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#66d9ef' },
	{ tag: t.propertyName, color: '#66d9ef' },
	{ tag: t.string, color: '#f1fa8c' },
	{ tag: t.number, color: '#bd93f9' },
	{ tag: t.operator, color: '#ff79c6' },
	{ tag: t.bool, color: '#bd93f9' },
	{ tag: t.null, color: '#bd93f9' },
	{ tag: t.comment, color: '#6272a4', fontStyle: 'italic' },
	{ tag: t.typeName, color: '#8be9fd' }
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
			{ tag: t.monospace, fontFamily: 'var(--font-mono, monospace)', fontSize: '0.9em', color }
		]))
	];
}
