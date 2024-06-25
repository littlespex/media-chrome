import { MediaStateReceiverAttributes } from '../constants.js';
import { globalThis, document } from '../utils/server-safe-globals.js';
import type MediaController from '../media-controller.js';
import type MediaChromeOption from './media-chrome-option.js';

const checkIcon = /*html*/ `
<svg aria-hidden="true" viewBox="0 1 24 24" part="select-indicator indicator">
  <path d="m10 15.17 9.193-9.191 1.414 1.414-10.606 10.606-6.364-6.364 1.414-1.414 4.95 4.95Z"/>
</svg>`;

export function createOption(
  text: string,
  value: string,
  selected: boolean
): MediaChromeOption {
  const option = document.createElement(
    'media-chrome-option'
  ) as MediaChromeOption;
  option.part.add('option');
  option.value = value;
  option.selected = selected;

  const label = document.createElement('span');
  label.textContent = text;
  option.append(label);

  return option;
}

export function createIndicator(el: HTMLElement, name: string): Node {
  let customIndicator = el.querySelector(`:scope > [slot="${name}"]`);

  // Chaining slots
  if (customIndicator?.nodeName == 'SLOT')
    // @ts-ignore
    customIndicator = customIndicator.assignedElements({ flatten: true })[0];

  if (customIndicator) {
    // @ts-ignore
    customIndicator = customIndicator.cloneNode(true);
    customIndicator.removeAttribute('slot');
    return customIndicator;
  }

  const fallbackIndicator = el.shadowRoot.querySelector(
    `[name="${name}"] > svg`
  );
  return fallbackIndicator.cloneNode(true);
}

const template: HTMLTemplateElement = document.createElement('template');
template.innerHTML = /*html*/ `
<style>
  :host {
    font: var(--media-font,
      var(--media-font-weight, normal)
      var(--media-font-size, 15px) /
      var(--media-text-content-height, var(--media-control-height, 24px))
      var(--media-font-family, helvetica neue, segoe ui, roboto, arial, sans-serif));
    color: var(--media-text-color, var(--media-primary-color, rgb(238 238 238)));
    background: var(--media-listbox-background, var(--media-control-background, var(--media-secondary-color, rgb(20 20 30 / .8))));
    border-radius: var(--media-listbox-border-radius);
    display: inline-flex;
    flex-direction: column;
    position: relative;
    box-sizing: border-box;
  }

  ::slotted([slot="header"]) {
    padding: .4em 1.4em;
    border-bottom: 1px solid rgb(255 255 255 / .25);
  }

  #container {
    gap: var(--media-listbox-gap);
    display: flex;
    flex-direction: var(--media-listbox-flex-direction, column);
    overflow: hidden auto;
    padding-block: .5em;
  }

  media-chrome-option {
    padding-inline: .7em 1.4em;
  }

  media-chrome-option > span {
    margin-inline: .5ch;
  }

  [part~="indicator"] {
    fill: var(--media-option-indicator-fill, var(--media-icon-color, var(--media-primary-color, rgb(238 238 238))));
    height: var(--media-option-indicator-height, 1.25em);
    vertical-align: var(--media-option-indicator-vertical-align, text-top);
  }

  [part~="select-indicator"] {
    display: var(--media-option-select-indicator-display);
    visibility: hidden;
  }

  [aria-selected="true"] > [part~="select-indicator"] {
    visibility: visible;
  }
</style>
<style id="layout-row" media="width:0">

  ::slotted([slot="header"]) {
    padding: .4em .5em;
  }

  #container {
    gap: var(--media-listbox-gap, .25em);
    flex-direction: var(--media-listbox-flex-direction, row);
    padding-inline: .5em;
  }

  media-chrome-option {
    padding: .3em .24em;
  }

  media-chrome-option[aria-selected="true"] {
    background: var(--media-option-selected-background, rgb(255 255 255 / .2));
  }

  [part~="select-indicator"] {
    display: var(--media-option-select-indicator-display, none);
  }
</style>
<slot name="header"></slot>
<slot id="container"></slot>
<slot name="select-indicator" hidden>${checkIcon}</slot>
`;

/**
 * @extends {HTMLElement}
 *
 * @slot - Default slotted elements.
 * @slot header - An element shown at the top of the listbox.
 * @slot select-indicator - An icon element indicating a selected option.
 *
 * @attr {boolean} disabled - The Boolean disabled attribute makes the element not mutable or focusable.
 * @attr {string} mediacontroller - The element `id` of the media controller to connect to (if not nested within).
 *
 * @cssproperty --media-primary-color - Default color of text / icon.
 * @cssproperty --media-secondary-color - Default color of background.
 * @cssproperty --media-text-color - `color` of text.
 *
 * @cssproperty --media-control-background - `background` of control.
 * @cssproperty --media-listbox-layout - Set to `row` for a horizontal listbox design.
 * @cssproperty --media-listbox-flex-direction - `flex-direction` of listbox.
 * @cssproperty --media-listbox-gap - `gap` between listbox options.
 * @cssproperty --media-listbox-background - `background` of listbox.
 * @cssproperty --media-listbox-border-radius - `border-radius` of listbox.
 *
 * @cssproperty --media-font - `font` shorthand property.
 * @cssproperty --media-font-weight - `font-weight` property.
 * @cssproperty --media-font-family - `font-family` property.
 * @cssproperty --media-font-size - `font-size` property.
 * @cssproperty --media-text-content-height - `line-height` of text.
 *
 * @cssproperty --media-icon-color - `fill` color of icon.
 * @cssproperty --media-option-indicator-fill - `fill` color of indicator icon.
 * @cssproperty --media-option-indicator-height - `height` of option indicator.
 * @cssproperty --media-option-indicator-vertical-align - `vertical-align` of option indicator.
 * @cssproperty --media-option-select-indicator-display - `display` of select indicator.
 */
class MediaChromeListbox extends globalThis.HTMLElement {
  static get observedAttributes(): string[] {
    return ['disabled', 'style', MediaStateReceiverAttributes.MEDIA_CONTROLLER];
  }

  static formatOptionText(text: string): string {
    return text;
  }

  nativeEl: HTMLElement;
  container: HTMLSlotElement;

  #mediaController: MediaController | null = null;
  #keysSoFar: string = '';
  #clearKeysTimeout: ReturnType<typeof setTimeout> = null;
  #metaPressed: boolean = false;

  constructor(options: { slotTemplate?: HTMLTemplateElement } = {}) {
    super();

    if (!this.shadowRoot) {
      // Set up the Shadow DOM if not using Declarative Shadow DOM.
      this.attachShadow({ mode: 'open' });

      this.nativeEl = template.content.cloneNode(true) as HTMLElement;

      if (options.slotTemplate) {
        this.nativeEl.append(options.slotTemplate.content.cloneNode(true));
      }

      this.shadowRoot.append(this.nativeEl);
    }

    this.container = this.shadowRoot.querySelector(
      '#container'
    ) as HTMLSlotElement;

    this.container.addEventListener('slotchange', (event: Event) => {
      const target: HTMLSlotElement = event.target as HTMLSlotElement;
      for (const node of target.assignedNodes({ flatten: true })) {
        // Remove all whitespace text nodes so the unnamed slot shows its fallback content.
        if (node.nodeType === 3 && node.textContent.trim() === '') {
          (node as Element).remove();
        }
      }
    });
  }

  formatOptionText(text: string, data?: any): string;
  formatOptionText(text: string): string {
    return (this.constructor as typeof MediaChromeListbox).formatOptionText(
      text
    );
  }

  get options(): MediaChromeOption[] {
    // First query the light dom children for any options.

    /** @type NodeListOf<HTMLOptionElement> */
    let options = this.querySelectorAll('media-chrome-option');

    if (!options.length) {
      // Fallback to the options in the shadow dom.
      options = this.container?.querySelectorAll('media-chrome-option');
    }

    return Array.from(options) as MediaChromeOption[];
  }

  get selectedOptions(): MediaChromeOption[] {
    return this.options.filter((option) => option.selected);
  }

  get value(): string {
    return this.selectedOptions[0]?.value ?? '';
  }

  set value(newValue: string) {
    const option = this.options.find((option) => option.value === newValue);

    if (!option) return;

    this.#selectOption(option);
  }

  focus(): void {
    this.selectedOptions[0]?.focus();
  }

  #clickListener = (e: MouseEvent): void => {
    this.handleClick(e);
  };

  #handleKeyListener(e: KeyboardEvent): void {
    const { key } = e;

    if (key === 'Enter' || key === ' ') {
      this.handleSelection(
        e,
        this.hasAttribute('aria-multiselectable') &&
          this.getAttribute('aria-multiselectable') === 'true'
      );
    } else {
      this.handleMovement(e);
    }
  }

  // NOTE: There are definitely some "false positive" cases with multi-key pressing,
  // but this should be good enough for most use cases.
  #keyupListener = (e: KeyboardEvent): void => {
    const { key } = e;
    // only cancel on Escape
    if (key === 'Escape') {
      this.removeEventListener('keyup', this.#keyupListener);
      return;
    }

    if (key === 'Meta') {
      this.#metaPressed = false;
      return;
    }

    this.#handleKeyListener(e);
  };

  #keydownListener = (e: KeyboardEvent): void => {
    const { key, altKey } = e;

    if (altKey) {
      this.removeEventListener('keyup', this.#keyupListener);
      return;
    }

    if (key === 'Meta') {
      this.#metaPressed = true;
      return;
    }

    // only prevent default on used keys
    if (this.keysUsed.includes(key)) {
      e.preventDefault();
    }

    if (this.#metaPressed && this.keysUsed.includes(key)) {
      this.#handleKeyListener(e);
      return;
    }

    this.addEventListener('keyup', this.#keyupListener, { once: true });
  };

  enable(): void {
    this.addEventListener('click', this.#clickListener);
    this.addEventListener('keydown', this.#keydownListener);
  }

  disable(): void {
    this.removeEventListener('click', this.#clickListener);
    this.removeEventListener('keyup', this.#keyupListener);
  }

  attributeChangedCallback(
    attrName: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    if (attrName === 'style' && newValue !== oldValue) {
      this.#updateLayoutStyle();
    } else if (attrName === MediaStateReceiverAttributes.MEDIA_CONTROLLER) {
      if (oldValue) {
        this.#mediaController?.unassociateElement?.(this);
        this.#mediaController = null;
      }
      if (newValue && this.isConnected) {
        this.#mediaController = (
          this.getRootNode() as Document
        )?.getElementById(newValue) as MediaController;
        this.#mediaController?.associateElement?.(this);
      }
    } else if (attrName === 'disabled' && newValue !== oldValue) {
      if (newValue == null) {
        this.enable();
      } else {
        this.disable();
      }
    }
  }

  #updateLayoutStyle(): void {
    const layoutRowStyle = this.shadowRoot.querySelector('#layout-row');
    const isLayoutRow =
      getComputedStyle(this)
        .getPropertyValue('--media-listbox-layout')
        ?.trim() === 'row';

    layoutRowStyle.setAttribute('media', isLayoutRow ? '' : 'width:0');
  }

  connectedCallback(): void {
    this.#updateLayoutStyle();

    if (!this.hasAttribute('disabled')) {
      this.enable();
    }

    if (!this.hasAttribute('role')) {
      // set listbox role on the media-chrome-listbox element itself
      // this is to make sure that SRs announce options as being part
      // of a listbox when focused
      this.setAttribute('role', 'listbox');
    }

    const mediaControllerId = this.getAttribute(
      MediaStateReceiverAttributes.MEDIA_CONTROLLER
    );
    if (mediaControllerId) {
      this.#mediaController = (this.getRootNode() as Document)?.getElementById(
        mediaControllerId
      ) as MediaController;
      this.#mediaController?.associateElement?.(this);
    }
  }

  disconnectedCallback(): void {
    this.disable();

    // Use cached mediaController, getRootNode() doesn't work if disconnected.
    this.#mediaController?.unassociateElement?.(this);
    this.#mediaController = null;
  }

  get keysUsed(): string[] {
    return ['Enter', ' ', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
  }

  #getOption(e: Event): MediaChromeOption | undefined {
    const composedPath = e.composedPath() as HTMLElement[];
    const index = composedPath.findIndex(
      (el: Element) => el.nodeName === 'MEDIA-CHROME-OPTION'
    );

    return composedPath[index] as MediaChromeOption;
  }

  handleSelection(e: Event, toggle: boolean): void {
    const option = this.#getOption(e);

    if (!option) return;

    this.#selectOption(option, toggle);
  }

  #selectOption(option: MediaChromeOption, toggle?: boolean): void {
    const oldSelectedOptions = [...this.selectedOptions];

    if (
      !this.hasAttribute('aria-multiselectable') ||
      this.getAttribute('aria-multiselectable') !== 'true'
    ) {
      this.options.forEach((el) => (el.selected = false));
    }

    if (toggle) {
      option.selected = !option.selected;
    } else {
      option.selected = true;
    }

    if (this.selectedOptions.some((opt, i) => opt != oldSelectedOptions[i])) {
      this.dispatchEvent(
        new Event('change', { bubbles: true, composed: true })
      );
    }
  }

  handleMovement(e: KeyboardEvent): void {
    const { key } = e;
    const els = this.options;

    let currentOption = this.#getOption(e);
    if (!currentOption) {
      currentOption = els.filter(
        (el) => el.getAttribute('tabindex') === '0'
      )[0];
    }

    let nextOption;

    switch (key) {
      case 'ArrowDown':
        nextOption = currentOption.nextElementSibling;

        if (nextOption?.hasAttribute('disabled')) {
          nextOption = nextOption.nextElementSibling;
        }

        break;
      case 'ArrowUp':
        nextOption = currentOption.previousElementSibling;

        if (nextOption?.hasAttribute('disabled')) {
          nextOption = nextOption.previousElementSibling;
        }

        break;
      case 'Home':
        nextOption = els[0];
        break;
      case 'End':
        nextOption = els[els.length - 1];
        break;
      default:
        nextOption = this.#searchOption(key);
        break;
    }

    if (nextOption) {
      els.forEach((el) => el.setAttribute('tabindex', '-1'));
      nextOption.setAttribute('tabindex', '0');
      nextOption.focus();
    }
  }

  handleClick(e: MouseEvent): void {
    const option = this.#getOption(e);

    if (!option || option.hasAttribute('disabled')) return;

    this.options.forEach((el) => el.setAttribute('tabindex', '-1'));
    option.setAttribute('tabindex', '0');

    this.handleSelection(
      e,
      this.hasAttribute('aria-multiselectable') &&
        this.getAttribute('aria-multiselectable') === 'true'
    );
  }

  #searchOption(key: string): HTMLElement | undefined {
    this.#clearKeysOnDelay();

    const els = this.options;
    const activeIndex = els.findIndex(
      (el) => el.getAttribute('tabindex') === '0'
    );

    // always accumulate the key
    this.#keysSoFar += key;

    // if the same key is pressed, assume it's a repeated key
    // to skip to the same option that begings with that key
    // until the user presses another key and a better choice is available
    const repeatedKey = this.#keysSoFar.split('').every((k) => k === key);

    // if it's a repeat key, skip the current option
    const after = els
      .slice(activeIndex + (repeatedKey ? 1 : 0))
      .filter((el) => el.textContent.toLowerCase().startsWith(this.#keysSoFar));
    const before = els
      .slice(0, activeIndex - (repeatedKey ? 1 : 0))
      .filter((el) => el.textContent.toLowerCase().startsWith(this.#keysSoFar));

    let afterRepeated = [];
    let beforeRepeated = [];

    if (repeatedKey) {
      afterRepeated = els
        .slice(activeIndex + (repeatedKey ? 1 : 0))
        .filter((el) => el.textContent.startsWith(key));
      beforeRepeated = els
        .slice(0, activeIndex - (repeatedKey ? 1 : 0))
        .filter((el) => el.textContent.startsWith(key));
    }

    const returns = [...after, ...before, ...afterRepeated, ...beforeRepeated];

    return returns[0];
  }

  #clearKeysOnDelay(): void {
    clearTimeout(this.#clearKeysTimeout);
    this.#clearKeysTimeout = null;

    this.#clearKeysTimeout = setTimeout(() => {
      this.#keysSoFar = '';
      this.#clearKeysTimeout = null;
    }, 500);
  }
}

if (!globalThis.customElements.get('media-chrome-listbox')) {
  globalThis.customElements.define('media-chrome-listbox', MediaChromeListbox);
}

export { MediaChromeListbox };
export default MediaChromeListbox;
