import { useState, useEffect, useCallback } from 'react';
import { getItem, setItem } from '@/extension/storage';
import type { StorageType } from '@/extension/storage';

export function useChromeStorage<T>(
  key: string,
  defaultValue: T,
  storageType: StorageType = 'local'
): [T, (value: T) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getItem<T>(key, defaultValue, storageType).then((v) => {
      setValue(v);
      setIsLoading(false);
    });

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === storageType && key in changes) {
        setValue(changes[key].newValue ?? defaultValue);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [key, storageType, defaultValue]);

  const setStoredValue = useCallback(
    async (newValue: T) => {
      setValue(newValue);
      await setItem(key, newValue, storageType);
    },
    [key, storageType]
  );

  return [value, setStoredValue, isLoading];
}
