/**
 * Gets an HTML element by its ID with type safety
 * @param id - The ID of the element to retrieve
 * @returns The element cast to the specified type, or null if not found
 */
export function byID<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Gets all HTML elements matching a CSS selector with type safety
 * @param selector - The CSS selector to match elements
 * @param container - Optional container to scope the search (defaults to document)
 * @returns An array of elements cast to the specified type
 */
export function all<T extends HTMLElement>(selector: string, container?: Element | Document): T[] {
  const searchContainer = container || document;
  return Array.from(searchContainer.querySelectorAll(selector)) as T[];
}

/**
 * Loads an image from a URL with crossOrigin set to 'anonymous'
 * @param url - The URL of the image to load
 * @param onLoad - Callback when image loads successfully
 * @param onError - Optional callback when image fails to load
 */
export function loadImage(
  url: string,
  onLoad: (img: HTMLImageElement) => void,
  onError?: (error: Error) => void
): HTMLImageElement {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => onLoad(img);
  img.onerror = () => onError?.(new Error('Failed to load image'));
  img.src = url;
  return img;
}

/**
 * Downloads an image from a URL and returns it as an HTMLImageElement
 * @param url - The URL of the image to download
 * @returns Promise that resolves to the loaded image element
 * @throws Error if the image fails to load
 */
export async function downloadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    loadImage(url, resolve, reject);
  });
}

/**
 * Creates and configures a canvas element with specified dimensions
 * @param width - The width of the canvas in pixels
 * @param height - The height of the canvas in pixels
 * @returns The configured canvas element
 */
export function setupCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Retrieves the currently active tab in the browser
 * @returns Promise that resolves to the active tab object
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

/**
 * Toggle multiple classes on an element based on a state object
 * @param element - The element to toggle classes on
 * @param classes - Object mapping class names to boolean values (true = add, false = remove)
 * @example
 * toggleClasses(element, { hidden: false, active: true, disabled: false });
 */
export function toggleClasses(element: HTMLElement | null, classes: Record<string, boolean>): void {
  if (!element) return;

  Object.entries(classes).forEach(([className, shouldAdd]) => {
    element.classList.toggle(className, shouldAdd);
  });
}

/**
 * Set element visibility using the 'hidden' class
 * @param element - The element to show/hide
 * @param visible - Whether the element should be visible
 */
export function setVisible(element: HTMLElement | null, visible: boolean): void {
  if (!element) return;
  element.classList.toggle('hidden', !visible);
}

/**
 * Set element as active/inactive using the 'active' class
 * @param element - The element to set active state on
 * @param active - Whether the element should be active
 */
export function setActive(element: HTMLElement | null, active: boolean): void {
  if (!element) return;
  element.classList.toggle('active', active);
}

/**
 * Set text content on an element with null safety
 * @param element - The element to set text on
 * @param text - The text content to set
 */
export function setText(element: HTMLElement | null, text: string): void {
  if (!element) return;
  element.textContent = text;
}

/**
 * Set disabled state on an interactive element
 * @param element - The element to disable/enable
 * @param disabled - Whether the element should be disabled
 */
export function setDisabled(
  element: HTMLButtonElement | HTMLInputElement | null,
  disabled: boolean
): void {
  if (!element) return;

  if (disabled) {
    element.setAttribute('disabled', 'true');
    element.style.opacity = '0.5';
    element.style.cursor = 'not-allowed';
  } else {
    element.removeAttribute('disabled');
    element.style.opacity = '';
    element.style.cursor = '';
  }
}
type errorHandler = string | ((error: unknown) => void);
type execFn<T> = () => Promise<T>;

/**
 * Executes an async function with try-catch error handling
 * @param fn - The async function to execute
 * @param onErr - Error message string or error handler function that receives the error
 * @param defaultValue - Optional default value to return on error
 * @param onFinally - Optional cleanup function to execute after try-catch completes
 * @returns Promise resolving to the result of executeFn or defaultValue if error occurs
 */
export async function tryCatchAsync<T>(
  fn: execFn<T>,
  onErr: errorHandler,
  defaultValue: T,
  onFinally?: () => void | Promise<void>
): Promise<T>;
export async function tryCatchAsync<T>(
  fn: execFn<T>,
  onErr: errorHandler,
  defaultValue?: undefined,
  onFinally?: () => void | Promise<void>
): Promise<T | undefined>;
export async function tryCatchAsync<T>(
  fn: execFn<T>,
  onErr: errorHandler,
  defaultValue?: T,
  onFinally?: () => void | Promise<void>
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    if (typeof onErr === 'string') {
      console.error(onErr, error);
    } else {
      onErr(error);
    }
    return defaultValue;
  } finally {
    if (onFinally) {
      await onFinally();
    }
  }
}

// Helper function
type ElementConfig = {
  textContent?: string;
  innerHTML?: string;
  id?: string;
  title?: string;
  dataset?: Record<string, string>;
  style?: Partial<CSSStyleDeclaration>;
  attributes?: Record<string, string>;
  disabled?: boolean;
  htmlFor?: string;
  children?: (HTMLElement | string)[];
};

/**
 * Creates an HTML element with optional class name and configuration
 * @template K - The HTML element tag name from the HTMLElementTagNameMap
 * @param tag - The HTML tag name to create
 * @param className - Optional CSS class name(s) to apply to the element
 * @param config - Optional configuration object for additional element properties
 * @returns The created and configured HTML element with proper type safety
 */
export function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  config?: ElementConfig
): HTMLElementTagNameMap[K];
export function createEl(tag: string, className?: string, config?: ElementConfig): HTMLElement;
export function createEl(tag: string, className?: string, config?: ElementConfig): HTMLElement {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (config) setEl(el, config);
  return el;
}

/**
 * Updates an existing HTML element with configuration options
 * @param el - The element to update
 * @param config - Configuration object for element properties
 * @returns The updated element for chaining
 */
export function setEl<T extends HTMLElement>(el: T, config: ElementConfig): T {
  if (config.id) el.id = config.id;
  if (config.title) el.title = config.title;
  if (config.textContent) el.textContent = config.textContent;
  if (config.innerHTML) el.innerHTML = config.innerHTML;
  if (config.disabled != null) (el as unknown as HTMLButtonElement).disabled = config.disabled;
  if (config.htmlFor) (el as unknown as HTMLLabelElement).htmlFor = config.htmlFor;

  if (config.dataset) {
    for (const [key, value] of Object.entries(config.dataset)) {
      el.dataset[key] = value;
    }
  }

  if (config.style) Object.assign(el.style, config.style);

  if (config.attributes) {
    for (const [key, value] of Object.entries(config.attributes)) {
      el.setAttribute(key, value);
    }
  }

  if (config.children) {
    el.append(...config.children);
  }

  return el;
}

/**
 * Creates an SVG element with optional attributes
 * @param tag - The SVG tag name (rect, path, circle, etc.)
 * @param attrs - Optional attributes to set on the element
 * @returns The created SVG element
 */
export function createSvgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>
): SVGElementTagNameMap[K] {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const el = document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
  }
  return el;
}

/**
 * Add multiple event listeners to an element
 * @param el - The element to attach listeners to
 * @param events - Object mapping event names to handlers
 * @returns Cleanup function to remove all listeners
 */
export function addListeners<T extends HTMLElement | Document>(
  el: T | null,
  events: { [K in keyof HTMLElementEventMap]?: (e: HTMLElementEventMap[K]) => void }
): () => void {
  if (!el) return () => { };

  const entries = Object.entries(events) as [keyof HTMLElementEventMap, EventListener][];

  entries.forEach(([event, handler]) => {
    el.addEventListener(event, handler as EventListener);
  });

  return () => {
    entries.forEach(([event, handler]) => {
      el.removeEventListener(event, handler as EventListener);
    });
  };
}

/*
 * Clears a timeout if the provided timeout ID is not null
 */
export function clearTimeoutIfExists(timeoutId: ReturnType<typeof window.setTimeout> | null): void {
  if (timeoutId !== null) {
    window.clearTimeout(timeoutId);
  }
}
