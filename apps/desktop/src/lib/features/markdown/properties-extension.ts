import { EditorSelection, StateField } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { invoke } from '@tauri-apps/api/core';
import { get } from 'svelte/store';
import { fileTreeState } from '../files/state';
import { editorState } from '../files/stores/editor';
import {
  ADD_PROPERTY_OPTIONS,
  addFrontmatterProperty,
  defaultFrontmatter,
  enumOptionsForKey,
  parseFrontmatter,
  removeFrontmatterProperty,
  updateFrontmatterProperty,
  valueToInputString,
  type FrontmatterProperty,
  type ParsedFrontmatter
} from './frontmatter';
import {
  ensureSharedTags,
  listSharedTags,
  normalizeTagName,
  type SharedTag
} from './tag-registry';

class PropertiesWidget extends WidgetType {
  private cleanups: Array<() => void> = [];

  constructor(private parsed: ParsedFrontmatter) {
    super();
  }

  eq(other: PropertiesWidget) {
    return JSON.stringify(this.parsed.data) === JSON.stringify(other.parsed.data)
      && this.parsed.errors.join('\n') === other.parsed.errors.join('\n');
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement('section');
    wrap.className = 'cm-properties-panel';
    wrap.setAttribute('aria-label', 'Markdown properties');

    if (this.parsed.errors.length > 0) {
      const error = document.createElement('div');
      error.className = 'cm-properties-error';
      error.textContent = this.parsed.errors.join(' ');
      wrap.appendChild(error);
    }

    const rows = document.createElement('div');
    rows.className = 'cm-properties-rows';

    const created = this.parsed.properties.find((property) => property.key === 'created');
    const updated = this.parsed.properties.find((property) => property.key === 'updated');

    for (const property of this.parsed.properties) {
      if (property.key === 'created' && updated) {
        rows.appendChild(this.createDatesRow(view, property, updated));
        continue;
      }
      if (property.key === 'updated' && created) {
        continue;
      }
      rows.appendChild(this.createPropertyRow(view, property));
    }

    wrap.appendChild(rows);
    wrap.appendChild(this.createAddProperty(view));
    return wrap;
  }

  ignoreEvent() {
    return true;
  }

  destroy() {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
  }

  private createPropertyRow(view: EditorView, property: FrontmatterProperty) {
    const row = document.createElement('div');
    row.className = 'cm-property-row';

    const label = document.createElement('label');
    label.className = 'cm-property-label';
    label.textContent = formatLabel(property.key);
    label.title = property.key;
    row.appendChild(label);

    const controlWrap = document.createElement('div');
    controlWrap.className = 'cm-property-control';
    controlWrap.appendChild(this.createControl(view, property));

    if (this.canRemoveProperty(property)) {
      controlWrap.classList.add('has-property-remove');
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'cm-property-icon-button';
      remove.title = `Remove ${property.key}`;
      remove.textContent = 'x';
      remove.addEventListener('click', () => {
        this.replaceDoc(view, removeFrontmatterProperty(view.state.doc.toString(), property.key));
      });
      controlWrap.appendChild(remove);
    }

    if (property.error) {
      const error = document.createElement('div');
      error.className = 'cm-property-validation';
      error.textContent = property.error;
      controlWrap.appendChild(error);
    }

    row.appendChild(controlWrap);

    return row;
  }

  private canRemoveProperty(property: FrontmatterProperty) {
    if (isRequiredLifecycleKey(property.key)) return false;
    if (property.type !== 'list') return true;
    return !Array.isArray(property.value) || property.value.length === 0;
  }

  private createDatesRow(view: EditorView, created: FrontmatterProperty, updated: FrontmatterProperty) {
    const stack = document.createElement('div');
    stack.className = 'cm-property-dates-stack';

    for (const property of [created, updated]) {
      const row = document.createElement('div');
      row.className = 'cm-property-row cm-property-date-row';

      const label = document.createElement('label');
      label.className = 'cm-property-label';
      label.textContent = formatLabel(property.key);
      row.appendChild(label);

      const controlWrap = document.createElement('div');
      controlWrap.className = 'cm-property-control';
      controlWrap.appendChild(this.createControl(view, property));

      if (property.error) {
        const error = document.createElement('div');
        error.className = 'cm-property-validation';
        error.textContent = property.error;
        controlWrap.appendChild(error);
      }

      row.appendChild(controlWrap);

      stack.appendChild(row);
    }

    return stack;
  }

  private createControl(view: EditorView, property: FrontmatterProperty) {
    if (property.type === 'boolean') {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'cm-property-switch';
      input.checked = property.value === true;
      input.addEventListener('change', () => this.updateValue(view, property.key, input.checked));
      return input;
    }

    if (property.type === 'enum') {
      return this.createOptionPicker(
        valueToInputString(property.value),
        enumOptionsForKey(property.key),
        'Select value',
        (value) => this.updateValue(view, property.key, value)
      );
    }

    if (property.type === 'multiline') {
      const textarea = document.createElement('textarea');
      textarea.className = 'cm-property-input cm-property-textarea';
      textarea.value = valueToInputString(property.value);
      textarea.rows = 3;
      textarea.addEventListener('change', () => this.updateValue(view, property.key, textarea.value));
      textarea.addEventListener('blur', () => this.updateValue(view, property.key, textarea.value));
      return textarea;
    }

    if (property.key === 'links') {
      return this.createLinksEditor(view, property);
    }

    if (property.key === 'tags') {
      return this.createTagsEditor(view, property);
    }

    if (property.type === 'list') {
      return this.createListEditor(view, property);
    }

    if (property.type === 'date') {
      return this.createDatePicker(valueToInputString(property.value), (value) => {
        this.updateValue(view, property.key, value);
      });
    }

    const input = document.createElement('input');
    input.className = 'cm-property-input';
    input.type = property.type === 'number' ? 'number' : 'text';
    input.value = valueToInputString(property.value);
    input.addEventListener('change', () => this.updateValue(view, property.key, input.value));
    input.addEventListener('blur', () => this.updateValue(view, property.key, input.value));
    return input;
  }

  private createListEditor(view: EditorView, property: FrontmatterProperty) {
    const wrap = document.createElement('div');
    wrap.className = 'cm-property-list-editor';

    const values = Array.isArray(property.value)
      ? property.value.map((item) => normalizeListValueForKey(property.key, `${item}`)).filter(Boolean)
      : [];
    const chips = document.createElement('div');
    chips.className = 'cm-property-chips';

    const inputRow = document.createElement('div');
    inputRow.className = 'cm-property-list-input-row';
    inputRow.hidden = values.length > 0;

    const input = document.createElement('input');
    input.className = 'cm-property-input';
    input.placeholder = `Search or add ${formatLabel(property.key).toLocaleLowerCase()}`;

    const commitInput = () => {
      const nextValues = uniqueListValues([
        ...values,
        ...input.value.split(',')
          .map((item) => normalizeListValueForKey(property.key, item))
          .filter(Boolean)
      ]);

      if (nextValues.length === values.length) {
        input.value = '';
        inputRow.hidden = values.length > 0;
        return;
      }

      this.updateValue(view, property.key, nextValues);
    };

    for (const value of values) {
      const chip = document.createElement('span');
      chip.className = 'cm-property-chip cm-property-list-chip';

      const label = document.createElement('span');
      label.className = 'cm-property-list-chip-label';
      label.textContent = displayListValueForKey(property.key, value);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'cm-property-list-chip-remove';
      remove.title = `Remove ${displayListValueForKey(property.key, value)}`;
      remove.textContent = 'x';
      remove.addEventListener('click', () => {
        this.updateValue(view, property.key, values.filter((item) => item !== value));
      });

      chip.append(label, remove);
      chips.appendChild(chip);
    }

    if (values.length > 0) {
      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'cm-property-chip cm-property-list-add';
      addButton.textContent = '+';
      addButton.title = `Add ${formatLabel(property.key)}`;
      addButton.addEventListener('click', () => {
        inputRow.hidden = false;
        input.value = '';
        input.focus();
      });
      chips.appendChild(addButton);
    }

    input.addEventListener('change', commitInput);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitInput();
      }
      if (event.key === 'Escape') {
        input.value = '';
        inputRow.hidden = values.length > 0;
      }
    });
    input.addEventListener('blur', () => {
      if (!input.value.trim()) {
        inputRow.hidden = values.length > 0;
      }
    });

    inputRow.appendChild(input);
    wrap.append(chips, inputRow);
    return wrap;
  }

  private createTagsEditor(view: EditorView, property: FrontmatterProperty) {
    const wrap = document.createElement('div');
    wrap.className = 'cm-property-list-editor cm-property-tag-editor cm-property-popover-host';

    const values = Array.isArray(property.value)
      ? property.value.map((item) => normalizeTagName(`${item}`)).filter(Boolean)
      : [];
    void ensureSharedTags(values);

    const chips = document.createElement('div');
    chips.className = 'cm-property-chips';

    const inputRow = document.createElement('div');
    inputRow.className = 'cm-property-list-input-row cm-property-tag-input-row';
    inputRow.hidden = values.length > 0;

    const input = document.createElement('input');
    input.className = 'cm-property-input';
    input.placeholder = 'Search or add tags';

    const menu = document.createElement('div');
    menu.className = 'cm-property-menu cm-property-tag-menu';
    menu.hidden = true;

    let selectedIndex = 0;
    let visibleMatches: SharedTag[] = [];

    const addTag = async (rawValue: string) => {
      const tagName = normalizeTagName(rawValue);
      const existingTags = new Set(values.map((item) => item.toLocaleLowerCase()));
      if (!tagName || existingTags.has(tagName.toLocaleLowerCase())) return;

      const nextValues = [...values, tagName];
      this.updateValue(view, property.key, nextValues);
      await ensureSharedTags([tagName]);
    };

    const renderMenu = async () => {
      const query = input.value.trim();
      const queryTag = normalizeTagName(query);
      const normalizedQuery = query.replace(/^#+/, '').trim().toLocaleLowerCase();
      const existingTags = new Set(values.map((item) => item.toLocaleLowerCase()));
      menu.replaceChildren();

      visibleMatches = (await listSharedTags())
        .filter((tag) => !existingTags.has(tag.name.toLocaleLowerCase()))
        .filter((tag) => {
          if (!normalizedQuery) return true;
          return tag.name.replace(/^#+/, '').toLocaleLowerCase().includes(normalizedQuery)
            || tag.description.toLocaleLowerCase().includes(normalizedQuery);
        })
        .slice(0, 8);

      selectedIndex = Math.min(selectedIndex, Math.max(visibleMatches.length - 1, 0));

      for (const [index, tag] of visibleMatches.entries()) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = index === selectedIndex ? 'cm-property-menu-item is-selected' : 'cm-property-menu-item';
        const name = document.createElement('span');
        name.textContent = tag.name;
        const detail = document.createElement('small');
        detail.textContent = tag.description || 'Shared tag';
        item.append(name, detail);
        item.addEventListener('click', () => addTag(tag.name));
        menu.appendChild(item);
      }

      const hasExactMatch = visibleMatches.some((tag) => tag.name.toLocaleLowerCase() === queryTag.toLocaleLowerCase());
      if (queryTag && !hasExactMatch && !existingTags.has(queryTag.toLocaleLowerCase())) {
        const create = document.createElement('button');
        create.type = 'button';
        create.className = visibleMatches.length === 0 ? 'cm-property-menu-item is-selected' : 'cm-property-menu-item';
        const name = document.createElement('span');
        name.textContent = `Create ${queryTag}`;
        const detail = document.createElement('small');
        detail.textContent = 'New shared tag';
        create.append(name, detail);
        create.addEventListener('click', () => addTag(queryTag));
        menu.appendChild(create);
      }

      menu.hidden = input.value.trim().length === 0 && visibleMatches.length === 0;
    };

    for (const value of values) {
      const chip = document.createElement('span');
      chip.className = 'cm-property-chip cm-property-list-chip cm-property-tag-chip';

      const label = document.createElement('span');
      label.className = 'cm-property-list-chip-label';
      label.textContent = normalizeTagName(value);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'cm-property-list-chip-remove';
      remove.title = `Remove ${normalizeTagName(value)}`;
      remove.textContent = 'x';
      remove.addEventListener('click', () => {
        this.updateValue(view, property.key, values.filter((item) => item !== value));
      });

      chip.append(label, remove);
      chips.appendChild(chip);
    }

    if (values.length > 0) {
      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'cm-property-chip cm-property-list-add';
      addButton.textContent = '+';
      addButton.title = 'Add tag';
      addButton.addEventListener('click', () => {
        inputRow.hidden = false;
        input.value = '';
        void renderMenu();
        input.focus();
      });
      chips.appendChild(addButton);
    }

    input.addEventListener('focus', () => {
      void renderMenu();
      menu.hidden = false;
    });
    input.addEventListener('input', () => {
      selectedIndex = 0;
      void renderMenu();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        menu.hidden = true;
        input.value = '';
        inputRow.hidden = values.length > 0;
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectedIndex += 1;
        void renderMenu();
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        void renderMenu();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const selected = menu.querySelector<HTMLButtonElement>('.cm-property-menu-item.is-selected');
        if (selected) selected.click();
        else addTag(input.value);
      }
    });

    const onOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && wrap.contains(target)) return;
      inputRow.hidden = true;
    };
    document.addEventListener('pointerdown', onOutsidePointerDown, true);
    this.cleanups.push(() => document.removeEventListener('pointerdown', onOutsidePointerDown, true));

    this.bindPopoverDismiss(wrap, menu, input);
    inputRow.append(input, menu);
    wrap.append(chips, inputRow);
    return wrap;
  }

  private createLinksEditor(view: EditorView, property: FrontmatterProperty) {
    const wrap = document.createElement('div');
    wrap.className = 'cm-property-link-editor cm-property-popover-host';

    const values = Array.isArray(property.value) ? property.value.map((item) => `${item}`) : [];
    const chips = document.createElement('div');
    chips.className = 'cm-property-chips';
    const inputRow = document.createElement('div');
    inputRow.className = 'cm-property-link-input-row';
    inputRow.hidden = true;

    const renderChips = () => {
      chips.replaceChildren();

      for (const value of values) {
        const linkTarget = normalizeLinkValue(value);
        const wikiLink = formatWikiLink(linkTarget);
        const match = resolveMarkdownLink(linkTarget);
        const chip = document.createElement('span');
        chip.className = match ? 'cm-property-chip cm-property-link-chip' : 'cm-property-chip cm-property-link-chip is-broken';

        const open = document.createElement('button');
        open.type = 'button';
        open.className = 'cm-property-link-open';
        open.textContent = displayLinkName(linkTarget);
        open.title = match ? `Open ${match.path}` : `Create and open ${wikiLink}`;
        open.addEventListener('click', () => this.openOrCreateLink(linkTarget, view));

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'cm-property-link-remove';
        remove.textContent = 'x';
        remove.title = `Remove ${wikiLink}`;
        remove.addEventListener('click', () => {
          this.updateValue(view, property.key, values.filter((item) => item !== value));
        });

        chip.append(open, remove);
        chips.appendChild(chip);
      }

      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'cm-property-chip cm-property-link-add';
      addButton.textContent = '+';
      addButton.title = 'Add linked file';
      addButton.addEventListener('click', () => {
        inputRow.hidden = false;
        input.value = '';
        void renderMenu();
        input.focus();
      });
      chips.appendChild(addButton);
    };

    const input = document.createElement('input');
    input.className = 'cm-property-input';
    input.placeholder = 'Search files or type a new file name';

    const menu = document.createElement('div');
    menu.className = 'cm-property-menu cm-property-link-menu';
    menu.hidden = true;

    let selectedIndex = 0;
    let visibleMatches: MarkdownFileSuggestion[] = [];

    const addLink = async (rawValue: string) => {
      const linkTarget = normalizeLinkValue(rawValue);
      const value = formatWikiLink(linkTarget);
      const existingTargets = new Set(values.map((item) => normalizeLinkValue(item).toLocaleLowerCase()));
      if (!linkTarget || existingTargets.has(linkTarget.toLocaleLowerCase())) return;

      const nextValues = [...values, value];
      this.updateValue(view, property.key, nextValues);

      if (!resolveMarkdownLink(linkTarget)) {
        await this.createLinkedFile(linkTarget);
      }
    };

    const renderMenu = async () => {
      const query = input.value.trim();
      const normalizedQuery = query.toLocaleLowerCase();
      const existingTargets = new Set(values.map((item) => normalizeLinkValue(item).toLocaleLowerCase()));
      menu.replaceChildren();

      visibleMatches = (await listMarkdownFileSuggestions())
        .filter((file) => !existingTargets.has(file.linkValue.toLocaleLowerCase()))
        .filter((file) => {
          if (!normalizedQuery) return true;
          return file.label.toLocaleLowerCase().includes(normalizedQuery)
            || file.relativePath.toLocaleLowerCase().includes(normalizedQuery);
        })
        .slice(0, 8);

      selectedIndex = Math.min(selectedIndex, Math.max(visibleMatches.length - 1, 0));

      for (const [index, file] of visibleMatches.entries()) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = index === selectedIndex ? 'cm-property-menu-item is-selected' : 'cm-property-menu-item';
        item.innerHTML = `<span>${formatWikiLink(file.linkValue)}</span><small>${file.relativePath}</small>`;
        item.addEventListener('click', () => addLink(file.linkValue));
        menu.appendChild(item);
      }

      if (query && !visibleMatches.some((file) => file.label.toLocaleLowerCase() === normalizedQuery)) {
        const create = document.createElement('button');
        create.type = 'button';
        create.className = visibleMatches.length === 0 ? 'cm-property-menu-item is-selected' : 'cm-property-menu-item';
        create.innerHTML = `<span>Create ${formatWikiLink(normalizeLinkValue(query))}</span><small>New markdown file</small>`;
        create.addEventListener('click', () => addLink(query));
        menu.appendChild(create);
      }

      menu.hidden = input.value.trim().length === 0 && visibleMatches.length === 0;
    };

    input.addEventListener('focus', () => {
      void renderMenu();
      menu.hidden = false;
    });
    input.addEventListener('input', () => {
      selectedIndex = 0;
      void renderMenu();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        menu.hidden = true;
        inputRow.hidden = true;
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectedIndex += 1;
        void renderMenu();
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        void renderMenu();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const selected = menu.querySelector<HTMLButtonElement>('.cm-property-menu-item.is-selected');
        if (selected) selected.click();
        else addLink(input.value);
      }
    });

    const onOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && wrap.contains(target)) return;
      inputRow.hidden = true;
    };
    document.addEventListener('pointerdown', onOutsidePointerDown, true);
    this.cleanups.push(() => document.removeEventListener('pointerdown', onOutsidePointerDown, true));
    this.bindPopoverDismiss(wrap, menu, input);
    renderChips();
    inputRow.append(input, menu);
    wrap.append(chips, inputRow);
    return wrap;
  }

  private createAddProperty(view: EditorView) {
    const wrap = document.createElement('div');
    wrap.className = 'cm-property-add';
    const existing = new Set(this.parsed.properties.map((property) => property.key));
    const options = ADD_PROPERTY_OPTIONS.filter((option) => !existing.has(option));

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cm-property-add-button';
    button.innerHTML = '<span>+ Add Property</span><kbd>Cmd+P</kbd>';

    const overlay = document.createElement('div');
    overlay.className = 'cm-property-spotlight-overlay';
    overlay.hidden = true;

    const palette = document.createElement('div');
    palette.className = 'cm-property-spotlight';

    const search = document.createElement('input');
    search.className = 'cm-property-spotlight-search';
    search.placeholder = 'Search or create a property';
    palette.appendChild(search);

    const customWrap = document.createElement('div');
    customWrap.className = 'cm-property-custom-row';
    const customInput = document.createElement('input');
    customInput.className = 'cm-property-input';
    customInput.placeholder = 'custom_property';
    const customButton = document.createElement('button');
    customButton.type = 'button';
    customButton.className = 'cm-property-menu-action';
    customButton.textContent = 'Add';
    customWrap.append(customInput, customButton);

    const list = document.createElement('div');
    list.className = 'cm-property-spotlight-list';
    palette.append(list, customWrap);
    overlay.appendChild(palette);

    const addKey = (key: string) => {
      const normalizedKey = key.trim();
      if (!normalizedKey || existing.has(normalizedKey)) return;
      this.replaceDoc(view, addFrontmatterProperty(view.state.doc.toString(), normalizedKey));
    };

    let selectedIndex = 0;

    const render = () => {
      const query = search.value.trim().toLocaleLowerCase();
      list.replaceChildren();
      const visibleOptions = options.filter((option) => {
        if (option === 'custom') return false;
        return !query || formatLabel(option).toLocaleLowerCase().includes(query) || option.includes(query);
      });

      selectedIndex = Math.min(selectedIndex, Math.max(visibleOptions.length - 1, 0));
      for (const [index, option] of visibleOptions.entries()) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = index === selectedIndex ? 'cm-property-menu-item is-selected' : 'cm-property-menu-item';
        item.dataset.propertyKey = option;
        const name = document.createElement('span');
        name.textContent = formatLabel(option);
        const detail = document.createElement('small');
        detail.textContent = option;
        item.append(name, detail);
        item.addEventListener('click', () => addKey(option));
        list.appendChild(item);
      }

      if (visibleOptions.length === 0 && query.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'cm-property-spotlight-empty';
        empty.textContent = 'All built-in properties are already added';
        list.appendChild(empty);
      }

      customWrap.hidden = query.length === 0;
      customInput.value = query.replace(/\s+/g, '_');
    };

    const openPalette = () => {
      overlay.hidden = false;
      search.value = '';
      selectedIndex = 0;
      render();
      search.focus();
    };

    const closePalette = () => {
      overlay.hidden = true;
      button.focus();
    };

    button.addEventListener('click', openPalette);
    button.setAttribute('data-property-add-trigger', 'true');
    const overlayHost = view.dom.closest<HTMLElement>('.shell-container') || document.body;
    overlayHost.appendChild(overlay);
    this.cleanups.push(() => overlay.remove());
    overlay.addEventListener('pointerdown', (event) => {
      if (event.target === overlay) closePalette();
    });
    const onOverlayKeyDown = (event: KeyboardEvent) => {
      if (overlay.hidden || event.key !== 'Escape') return;
      closePalette();
    };
    document.addEventListener('keydown', onOverlayKeyDown, true);
    this.cleanups.push(() => document.removeEventListener('keydown', onOverlayKeyDown, true));

    search.addEventListener('input', () => {
      selectedIndex = 0;
      render();
    });
    search.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closePalette();
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectedIndex += 1;
        render();
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        render();
      }
      if (event.key === 'Enter') {
        const selectedItem = list.querySelector<HTMLButtonElement>('.cm-property-menu-item.is-selected');
        if (selectedItem) selectedItem.click();
        else addKey(customInput.value);
      }
    });
    customInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') addKey(customInput.value);
    });
    customButton.addEventListener('click', () => addKey(customInput.value));

    wrap.appendChild(button);
    return wrap;
  }

  private createOptionPicker(value: string, options: string[], placeholder: string, onSelect: (value: string) => void) {
    const wrap = document.createElement('div');
    wrap.className = 'cm-property-popover-host';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cm-property-picker-button';
    button.textContent = value ? formatLabel(value) : placeholder;

    const menu = document.createElement('div');
    menu.className = 'cm-property-menu cm-property-option-menu';
    menu.hidden = true;

    for (const option of options) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = option === value ? 'cm-property-menu-item is-selected' : 'cm-property-menu-item';
      item.textContent = formatLabel(option);
      item.addEventListener('click', () => onSelect(option));
      menu.appendChild(item);
    }

    button.addEventListener('click', () => {
      menu.hidden = !menu.hidden;
    });
    this.bindPopoverDismiss(wrap, menu, button);

    wrap.append(button, menu);
    return wrap;
  }

  private createDatePicker(value: string, onSelect: (value: string) => void) {
    const wrap = document.createElement('div');
    wrap.className = 'cm-property-date-picker cm-property-popover-host';

    const input = document.createElement('input');
    input.className = 'cm-property-input cm-property-date-input';
    input.value = value;
    input.placeholder = 'YYYY-MM-DD';
    input.addEventListener('change', () => onSelect(input.value));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') onSelect(input.value);
    });

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cm-property-calendar-button';
    button.title = 'Open calendar';
    button.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';

    const popover = document.createElement('div');
    popover.className = 'cm-property-calendar';
    popover.hidden = true;

    let visibleMonth = monthStart(parseDate(value) || new Date());

    const renderCalendar = () => {
      popover.replaceChildren();

      const header = document.createElement('div');
      header.className = 'cm-property-calendar-header';

      const previous = document.createElement('button');
      previous.type = 'button';
      previous.className = 'cm-property-calendar-nav';
      previous.textContent = '<';
      previous.addEventListener('click', () => {
        visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
        renderCalendar();
      });

      const title = document.createElement('div');
      title.className = 'cm-property-calendar-title';
      title.textContent = visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'cm-property-calendar-nav';
      next.textContent = '>';
      next.addEventListener('click', () => {
        visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
        renderCalendar();
      });

      header.append(previous, title, next);
      popover.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'cm-property-calendar-grid';
      for (const day of ['S', 'M', 'T', 'W', 'T', 'F', 'S']) {
        const label = document.createElement('div');
        label.className = 'cm-property-calendar-weekday';
        label.textContent = day;
        grid.appendChild(label);
      }

      const selected = parseDate(input.value);
      const startOffset = visibleMonth.getDay();
      const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();

      for (let index = 0; index < startOffset; index += 1) {
        const empty = document.createElement('span');
        empty.className = 'cm-property-calendar-empty';
        grid.appendChild(empty);
      }

      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
        const item = document.createElement('button');
        item.type = 'button';
        item.className = isSameDate(date, selected) ? 'cm-property-calendar-day is-selected' : 'cm-property-calendar-day';
        item.textContent = `${day}`;
        item.addEventListener('click', () => {
          const nextValue = formatDate(date);
          input.value = nextValue;
          popover.hidden = true;
          onSelect(nextValue);
        });
        grid.appendChild(item);
      }

      popover.appendChild(grid);
    };

    button.addEventListener('click', () => {
      visibleMonth = monthStart(parseDate(input.value) || visibleMonth);
      renderCalendar();
      popover.hidden = !popover.hidden;
    });
    this.bindPopoverDismiss(wrap, popover, button);

    renderCalendar();
    wrap.append(input, button, popover);
    return wrap;
  }

  private bindPopoverDismiss(host: HTMLElement, popover: HTMLElement, returnFocus: HTMLElement) {
    const onPointerDown = (event: PointerEvent) => {
      if (popover.hidden) return;
      const target = event.target;
      if (target instanceof Node && (host.contains(target) || popover.contains(target))) return;
      popover.hidden = true;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (popover.hidden || event.key !== 'Escape') return;
      popover.hidden = true;
      returnFocus.focus();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    this.cleanups.push(() => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    });
  }

  private updateValue(view: EditorView, key: string, value: unknown) {
    this.replaceDoc(view, updateFrontmatterProperty(view.state.doc.toString(), key, value));
  }

  private async openOrCreateLink(value: string, view: EditorView) {
    const file = await resolveMarkdownLinkAsync(value) || await this.createLinkedFile(value);
    if (!file) return;

    editorState.openFile(file.path, file.name, false);
    view.focus();
  }

  private async createLinkedFile(value: string) {
    const state = get(fileTreeState);
    if (!state.rootPath) return null;

    const linkValue = normalizeLinkValue(value);
    if (!linkValue) return null;

    const fileName = linkValue.endsWith('.md') ? linkValue : `${linkValue}.md`;
    const path = linkValue.includes('/')
      ? `${state.rootPath}/${fileName}`
      : `${state.rootPath}/${fileName}`;

    try {
      const parentPath = path.slice(0, path.lastIndexOf('/'));
      if (parentPath && parentPath !== state.rootPath) {
        try {
          await invoke('create_folder', { path: parentPath });
        } catch {
          // Folder may already exist.
        }
      }
      await invoke('write_file', { path, content: defaultFrontmatter(path) });
      const suggestion = {
        name: path.split('/').pop() || fileName,
        path,
        label: linkValue.split('/').pop()?.replace(/\.md$/, '') || linkValue.replace(/\.md$/, ''),
        relativePath: fileName,
        linkValue: linkValue.replace(/\.md$/, '')
      };
      markdownSuggestionCache = [...markdownSuggestionCache.filter((file) => file.path !== path), suggestion];
      return {
        ...suggestion,
        name: suggestion.name
      };
    } catch (error) {
      console.error('Failed to create linked markdown file', error);
      return null;
    }
  }

  private replaceDoc(view: EditorView, nextDoc: string) {
    const currentDoc = view.state.doc.toString();
    if (nextDoc === currentDoc) return;
    const nextParsed = parseFrontmatter(nextDoc);
    const anchor = nextParsed.range?.bodyFrom ?? 0;

    view.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: nextDoc },
      selection: EditorSelection.cursor(anchor),
      userEvent: 'input'
    });
  }
}

function buildPropertiesDecorations(state: EditorState): DecorationSet {
  const parsed = parseFrontmatter(state.doc.toString());
  if (!parsed.range) return Decoration.none;

  const builder = new RangeSetBuilder<Decoration>();
  builder.add(
    parsed.range.from,
    parsed.range.to,
    Decoration.replace({
      widget: new PropertiesWidget(parsed),
      block: true
    })
  );
  return builder.finish();
}

interface MarkdownFileSuggestion {
  name: string;
  path: string;
  label: string;
  relativePath: string;
  linkValue: string;
}

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_symlink: boolean;
}

let markdownSuggestionCache: MarkdownFileSuggestion[] = [];

async function listMarkdownFileSuggestions() {
  const state = get(fileTreeState);
  if (!state.rootPath) return getMarkdownFileSuggestions();

  try {
    const entries = await invoke<FileEntry[]>('list_markdown_files', { path: state.rootPath });
    markdownSuggestionCache = entries.map((entry) => markdownEntryToSuggestion(entry.path, entry.name, state.rootPath!));
    return markdownSuggestionCache;
  } catch (error) {
    console.error('Failed to list markdown files', error);
    return getMarkdownFileSuggestions();
  }
}

function getMarkdownFileSuggestions(): MarkdownFileSuggestion[] {
  const state = get(fileTreeState);
  const rootPath = state.rootPath;
  if (!rootPath) return markdownSuggestionCache;

  const loadedSuggestions = [...state.nodes.values()]
    .filter((node) => !node.isDir && node.name.toLocaleLowerCase().endsWith('.md'))
    .map((node) => markdownEntryToSuggestion(node.path, node.name, rootPath));

  const byPath = new Map<string, MarkdownFileSuggestion>();
  for (const file of markdownSuggestionCache) byPath.set(file.path, file);
  for (const file of loadedSuggestions) byPath.set(file.path, file);

  return [...byPath.values()]
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function markdownEntryToSuggestion(path: string, name: string, rootPath: string): MarkdownFileSuggestion {
  const relativePath = path.startsWith(`${rootPath}/`)
    ? path.slice(rootPath.length + 1)
    : name;
  const label = name.replace(/\.md$/i, '');
  const linkValue = relativePath.replace(/\.md$/i, '');

  return {
    name,
    path,
    label,
    relativePath,
    linkValue
  };
}

function resolveMarkdownLink(value: string) {
  const normalized = normalizeLinkValue(value).toLocaleLowerCase();
  if (!normalized) return null;

  return getMarkdownFileSuggestions().find((file) => {
    const label = file.label.toLocaleLowerCase();
    const linkValue = file.linkValue.toLocaleLowerCase();
    const relativePath = file.relativePath.toLocaleLowerCase();
    return linkValue === normalized
      || relativePath === normalized
      || relativePath.replace(/\.md$/i, '') === normalized
      || label === normalized;
  }) || null;
}

async function resolveMarkdownLinkAsync(value: string) {
  const normalized = normalizeLinkValue(value).toLocaleLowerCase();
  if (!normalized) return null;

  const immediate = resolveMarkdownLink(value);
  if (immediate) return immediate;

  return (await listMarkdownFileSuggestions()).find((file) => {
    const label = file.label.toLocaleLowerCase();
    const linkValue = file.linkValue.toLocaleLowerCase();
    const relativePath = file.relativePath.toLocaleLowerCase();
    return linkValue === normalized
      || relativePath === normalized
      || relativePath.replace(/\.md$/i, '') === normalized
      || label === normalized;
  }) || null;
}

function normalizeLinkValue(value: string) {
  return value
    .trim()
    .replace(/^\[\[/, '')
    .replace(/\]\]$/, '')
    .replace(/\.md$/i, '');
}

function formatWikiLink(value: string) {
  const normalized = normalizeLinkValue(value);
  return normalized ? `[[${normalized}]]` : '';
}

function displayLinkName(value: string) {
  const normalized = normalizeLinkValue(value);
  const fileName = normalized.split('/').pop() || normalized;
  return fileName.replace(/\.md$/i, '');
}

function normalizeListValueForKey(key: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (key !== 'tags') return trimmed;

  return normalizeTagName(trimmed);
}

function displayListValueForKey(key: string, value: string) {
  if (key !== 'tags') return value;
  return normalizeListValueForKey(key, value);
}

function uniqueListValues(values: string[]) {
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

function formatLabel(key: string) {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function isRequiredLifecycleKey(key: string) {
  return key === 'name' || key === 'created' || key === 'updated';
}

function parseDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameDate(left: Date, right: Date | null) {
  return right != null
    && left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

export function openAddPropertyPalette(view: EditorView) {
  const trigger = view.dom.querySelector<HTMLButtonElement>('[data-property-add-trigger="true"]');
  if (!trigger) return false;

  trigger.click();
  return true;
}

export const propertiesExtension = StateField.define<DecorationSet>({
  create(state) {
    return buildPropertiesDecorations(state);
  },
  update(decorations, tr) {
    if (tr.docChanged) {
      return buildPropertiesDecorations(tr.state);
    }
    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field)
});
