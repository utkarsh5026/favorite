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
 * Downloads an image from a URL and returns it as an HTMLImageElement
 * @param url - The URL of the image to download
 * @returns Promise that resolves to the loaded image element
 * @throws Error if the image fails to load
 */
export async function downloadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });

  return img;
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

/**
 * Executes a synchronous function with try-catch error handling
 * @param executeFn - The function to execute
 * @param onErr - Error message string or error handler function that receives the error
 * @param defaultValue - Optional default value to return on error
 * @returns The result of executeFn or defaultValue if error occurs
 */
export function tryCatch<T>(
  executeFn: () => T,
  onErr: string | ((error: unknown) => void),
  defaultValue?: T
): T | undefined {
  try {
    return executeFn();
  } catch (error) {
    if (typeof onErr === 'string') {
      console.error(onErr, error);
    } else {
      onErr(error);
    }
    return defaultValue;
  }
}

type errorHandler = string | ((error: unknown) => void);
type execFn<T> = () => Promise<T>;

/**
 * Executes an async function with try-catch error handling
 * @param fn - The async function to execute
 * @param onErr - Error message string or error handler function that receives the error
 * @param defaultValue - Optional default value to return on error
 * @returns Promise resolving to the result of executeFn or defaultValue if error occurs
 */
export async function tryCatchAsync<T>(
  fn: execFn<T>,
  onErr: errorHandler,
  defaultValue: T
): Promise<T>;
export async function tryCatchAsync<T>(fn: execFn<T>, onErr: errorHandler): Promise<T | undefined>;
export async function tryCatchAsync<T>(
  fn: execFn<T>,
  onErr: errorHandler,
  defaultValue?: T
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
  }
}
