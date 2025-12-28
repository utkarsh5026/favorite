/**
 * Changes the page favicon to the specified URL
 *
 * How it works:
 * 1. Removes all existing favicon link elements from the DOM
 * 2. Creates a new link element with the icon URL
 * 3. Appends it to the document head
 *
 * @param iconUrl - URL of the icon to use as favicon
 */
function changeFavicon(iconUrl: string): void {
    const existingIcons = document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]');
    existingIcons.forEach((icon: HTMLLinkElement) => icon.remove());

    const newFavicon = document.createElement('link');
    newFavicon.rel = 'icon';
    newFavicon.type = 'image/png';
    newFavicon.href = iconUrl;

    document.head.appendChild(newFavicon);
}


/**
 * Saves the original favicon URL for later restoration
 * This function runs once during initialization
 */
function saveOriginalFavicon(): void {
    if (state.originalFavicon !== null) return;

    const existingFavicon = document.querySelector<HTMLLinkElement>('link[rel*="icon"]');
    if (existingFavicon?.href) {
        state.originalFavicon = existingFavicon.href;
        console.log('Flaticon Favicon Preview: Original favicon saved');
    }
}


/**
 * Extracts the icon URL from a Flaticon element
 *
 * Flaticon uses multiple approaches to display icons:
 * 1. CSS background-image
 * 2. img tags with src
 * 3. Data attributes (data-png, data-src)
 * 4. Lazy-loaded images
 *
 * We try each method in order until we find a valid URL
 *
 * @param element - The DOM element to extract the icon from
 * @returns The icon URL if found, null otherwise
 */
function getIconUrl(element: Element): string | null {
    const bgImage = window.getComputedStyle(element).backgroundImage;
    if (bgImage && bgImage !== 'none') {
        // Extract URL from CSS url() function using regex
        // Matches: url("...") or url('...') or url(...)
        const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch?.[1]) {
            return urlMatch[1];
        }
    }

    const img = element.querySelector<HTMLImageElement>('img');
    if (img?.src) {
        return img.src;
    }

    const htmlElement = element as HTMLElement;
    if (htmlElement.dataset?.png) {
        return htmlElement.dataset.png;
    }

    if (htmlElement.dataset?.src) {
        return htmlElement.dataset.src;
    }

    const svgImg = element.querySelector<HTMLImageElement>('img[src*=".svg"]');
    if (svgImg?.src) {
        return svgImg.src;
    }

    const picture = element.querySelector('picture source');
    if (picture instanceof HTMLSourceElement && picture.srcset) {
        const firstUrl = picture.srcset.split(',')[0]?.trim().split(' ')[0];
        if (firstUrl) {
            return firstUrl;
        }
    }

    return null;
}


/**
 * Finds the closest icon container element
 *
 * @param target - The element that triggered the event
 * @returns The icon container element or null
 */
function findIconElement(target: Element): Element | null {
    const selector = CONFIG.iconSelectors.join(', ');
    return target.closest(selector);
}
