<p align="center">
  <img src="icons/icon128.png" alt="Flaticon Favicon Preview" width="128" height="128">
</p>

<h1 align="center">Flaticon Favicon Preview</h1>

<p align="center">
  <b>Preview Flaticon icons as your browser favicon on hover</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/manifest-v3-green" alt="Manifest V3">
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178c6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/license-Apache%202.0-orange" alt="License">
</p>

---

## About

A lightweight Chrome extension that lets you preview any icon on [Flaticon.com](https://flaticon.com) as your browser's favicon simply by hovering over it. Perfect for quickly visualizing how an icon would look in your browser tab before downloading.

## Features

- **Instant Preview** — Hover over any icon to see it as your favicon in real-time
- **Smart Debouncing** — Prevents flickering during quick mouse movements
- **Auto Restore** — Original favicon automatically restores when you move away
- **Multiple Format Support** — Works with PNG, SVG, lazy-loaded images, and CSS backgrounds
- **Zero Configuration** — Just install and start browsing

## How It Works

1. Browse icons on Flaticon.com
2. Hover over any icon you're interested in
3. Watch your browser tab favicon change instantly
4. Move away to restore the original favicon

## Installation

1. Clone this repo
   ```bash
   git clone https://github.com/prtk-87/favorite.git
   ```

2. Install dependencies and build
   ```bash
   cd favorite
   npm install
   npm run build
   ```

3. Open Chrome and navigate to
   ```
   chrome://extensions/
   ```

4. Enable **Developer mode** (toggle in top-right corner)

5. Click **Load unpacked** and select the cloned `favorite` folder

## Development

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Watch for changes during development
npm run watch

# Clean build files
npm run clean
```

## Tech Stack

- TypeScript
- Chrome Extension Manifest V3

## License

[Apache 2.0](LICENSE)
