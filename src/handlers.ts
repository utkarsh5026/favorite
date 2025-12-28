/**
 * Handles mouseover events to change favicon on hover
 *
 * Uses event delegation pattern:
 * - Single listener on document instead of thousands on each icon
 * - Checks if the target is within an icon element
 * - Better performance and memory usage
 *
 * @param event - The mouseover event
 */
function handleIconHover(event: MouseEvent): void {
    clearHoverTimeout();
    clearRestoreTimeout();

    const target = event.target as Element;
    const iconElement = findIconElement(target);

    if (!iconElement) return;

    const iconUrl = getIconUrl(iconElement);

    if (iconUrl) {
        // Small delay to avoid changing favicon on quick mouse movements
        // This is debouncing - we wait to see if the user really wants to hover
        state.currentHoverTimeout = window.setTimeout(() => {
            changeFavicon(iconUrl);
            state.currentHoverTimeout = null;
        }, CONFIG.hoverDelay);
    }
}


/**
 * Handles mouseout events to restore original favicon
 *
 * @param event - The mouseout event
 */
function handleIconLeave(event: MouseEvent): void {
    const target = event.target as Element;
    const iconElement = findIconElement(target);

    if (!iconElement) return;

    // Check if mouse actually left the icon area
    // relatedTarget is where the mouse moved to
    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && iconElement.contains(relatedTarget)) {
        // Mouse is still within the icon element, don't restore
        return;
    }

    clearHoverTimeout();
    state.currentRestoreTimeout = window.setTimeout(() => {
        restoreOriginalFavicon();
        state.currentRestoreTimeout = null;
    }, CONFIG.restoreDelay);
}


/**
 * Clears any pending hover timeout
 */
function clearHoverTimeout(): void {
    if (state.currentHoverTimeout !== null) {
        clearTimeout(state.currentHoverTimeout);
        state.currentHoverTimeout = null;
    }
}

/**
 * Clears any pending restore timeout
 */
function clearRestoreTimeout(): void {
    if (state.currentRestoreTimeout !== null) {
        clearTimeout(state.currentRestoreTimeout);
        state.currentRestoreTimeout = null;
    }
}
