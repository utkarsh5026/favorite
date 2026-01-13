import { state } from '@/extension';
import { ImageLocker } from '@/lock';

/**
 * Central state management for content script
 * Encapsulates all global state variables in a class
 */
export class ContentScriptState {
  private _isCurrentSiteDisabled = false;
  private _isGloballyDisabled = false;
  private _customFaviconUrl: string | null = null;
  private _lastBroadcast = 0;
  private _currentHostname: string | null = null;

  get isCurrentSiteDisabled(): boolean {
    return this._isCurrentSiteDisabled;
  }

  setCurrentSiteDisabled(value: boolean): void {
    this._isCurrentSiteDisabled = value;
  }

  get isGloballyDisabled(): boolean {
    return this._isGloballyDisabled;
  }

  setGloballyDisabled(value: boolean): void {
    this._isGloballyDisabled = value;
  }

  get customFaviconUrl(): string | null {
    return this._customFaviconUrl;
  }

  setCustomFaviconUrl(url: string | null): void {
    this._customFaviconUrl = url;
  }

  get lastBroadcast(): number {
    return this._lastBroadcast;
  }

  updateLastBroadcast(timestamp: number): void {
    this._lastBroadcast = timestamp;
  }

  get currentHostname(): string | null {
    return this._currentHostname;
  }

  setCurrentHostname(hostname: string | null): void {
    this._currentHostname = hostname;
  }

  /**
   * Resets all state to initial values
   */
  reset(): void {
    this._isCurrentSiteDisabled = false;
    this._isGloballyDisabled = false;
    this._customFaviconUrl = null;
    this._lastBroadcast = 0;
    this._currentHostname = null;
  }
}

// Singleton instance for use across all content script modules
export const scriptState = new ContentScriptState();

// ImageLocker instance for managing locked favicon state
export const imageLocker = new ImageLocker(state);
