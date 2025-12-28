/**
 * Configuration for the extension behavior
 */
interface ExtensionConfig {
  /** Delay in milliseconds before changing favicon on hover */
  readonly hoverDelay: number;
  /** Delay in milliseconds before restoring original favicon */
  readonly restoreDelay: number;
  /** CSS selectors for icon container elements */
  readonly iconSelectors: readonly string[];
}

/**
 * State management for the extension
 */
interface ExtensionState {
  /** Original favicon URL to restore later */
  originalFavicon: string | null;
  /** Timeout ID for hover delay */
  currentHoverTimeout: number | null;
  /** Timeout ID for restore delay */
  currentRestoreTimeout: number | null;
  /** Whether the extension has been initialized */
  isInitialized: boolean;
}
