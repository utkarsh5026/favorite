/**
 * Chrome Storage Helper Functions
 * Provides simplified, type-safe wrappers around chrome.storage API
 */

import { tryCatchAsync } from '@/utils';

/**
 * Available Chrome storage types
 */
export type StorageType = 'local' | 'sync' | 'session' | 'managed';

/**
 * Get the appropriate chrome storage area based on type
 */
function getStorageArea(type: StorageType = 'local'): chrome.storage.StorageArea {
  return chrome.storage[type];
}

/**
 * Get a single value from chrome storage
 * @param key - Storage key
 * @param defaultValue - Optional default value if key doesn't exist
 * @param storageType - Type of storage to use (defaults to 'local')
 * @param errorMessage - Optional custom error message to log on failure
 * @returns The stored value, default value, or undefined on error
 */
export async function getItem<T>(
  key: string,
  defaultValue: T,
  storageType?: StorageType,
  errorMessage?: string
): Promise<T>;
export async function getItem<T>(
  key: string,
  defaultValue?: undefined,
  storageType?: StorageType,
  errorMessage?: string
): Promise<T | undefined>;
export async function getItem<T>(
  key: string,
  defaultValue?: T,
  storageType: StorageType = 'local',
  errorMessage?: string
): Promise<T | undefined> {
  return tryCatchAsync<T | undefined>(
    async () => {
      const result = await getStorageArea(storageType).get(key);
      const value = result[key] as T | undefined;
      return value ?? defaultValue;
    },
    errorMessage || `Failed to get item "${key}" from storage:`,
    defaultValue
  );
}

/**
 * Get multiple values from chrome storage at once
 * @param keys - Array of storage keys
 * @param storageType - Type of storage to use (defaults to 'local')
 * @param errorMessage - Optional custom error message to log on failure
 * @returns Object with key-value pairs, or empty object on error
 */
export async function getItems<T extends Record<string, any>>(
  keys: string[],
  storageType: StorageType = 'local',
  errorMessage?: string
): Promise<Partial<T>> {
  const defaultValue: Partial<T> = {};
  return tryCatchAsync<Partial<T>>(
    async () => (await getStorageArea(storageType).get(keys)) as Partial<T>,
    errorMessage || `Failed to get items from storage:`,
    defaultValue
  );
}

/**
 * Set a single value in chrome storage
 * @param key - Storage key
 * @param value - Value to store
 * @param storageType - Type of storage to use (defaults to 'local')
 * @param errorMessage - Optional custom error message to log on failure
 * @returns true if successful, false on error
 */
export async function setItem<T>(
  key: string,
  value: T,
  storageType: StorageType = 'local',
  errorMessage?: string
): Promise<boolean> {
  return tryCatchAsync(
    async () => {
      await getStorageArea(storageType).set({ [key]: value });
      return true;
    },
    errorMessage || `Failed to set item "${key}" in storage:`,
    false
  ) as Promise<boolean>;
}

/**
 * Set multiple values in chrome storage at once
 * @param items - Object with key-value pairs to store
 * @param storageType - Type of storage to use (defaults to 'local')
 * @param errorMessage - Optional custom error message to log on failure
 * @returns true if successful, false on error
 */
export async function setItems(
  items: Record<string, any>,
  storageType: StorageType = 'local',
  errorMessage?: string
): Promise<boolean> {
  return await tryCatchAsync(
    async () => {
      await getStorageArea(storageType).set(items);
      return true;
    },
    errorMessage || `Failed to set items in storage:`,
    false
  );
}

/**
 * Remove a single value from chrome storage
 * @param key - Storage key to remove
 * @param storageType - Type of storage to use (defaults to 'local')
 * @param errorMessage - Optional custom error message to log on failure
 * @returns true if successful, false on error
 */
export async function removeItem(
  key: string,
  storageType: StorageType = 'local',
  errorMessage?: string
): Promise<boolean> {
  return await tryCatchAsync(
    async () => {
      await getStorageArea(storageType).remove(key);
      return true;
    },
    errorMessage || `Failed to remove item "${key}" from storage:`,
    false
  );
}
