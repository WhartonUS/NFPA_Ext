/*
 * NFPA Publications Extension - Popup Interface
 * 
 * Manages the extension popup UI including:
 * - Loading and displaying recent/pinned publications
 * - Sliding gesture interactions for pin/delete actions
 * - Event handling for publication management
 * - Storage operations for user preferences
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the popup interface
    loadRecentNfpaPublications();
    setupSlidingEffects();
});

/**
 * Toggle pin state for a publication
 * @param {HTMLElement} slot - The publication slot element
 * @param {HTMLElement} link - The publication link element
 */
function togglePin(slot, link) {
    const codeBase = extractCodeBaseFromUrl(link.href);
    if (!codeBase) return;
    
    chrome.storage.local.get(['pinnedNfpaPublications'], function(result) {
        let pinnedCodes = result.pinnedNfpaPublications || [];
        const isCurrentlyPinned = pinnedCodes.some(code => code.codeBase === codeBase);
        
        if (isCurrentlyPinned) {
            // Unpin: remove from pinned list
            pinnedCodes = pinnedCodes.filter(code => code.codeBase !== codeBase);
            slot.classList.remove('pinned');
        } else {
            // Pin: add to pinned list
            const pinnedCode = {
                codeBase: codeBase,
                title: link.textContent,
                url: link.href,
                timestamp: Date.now()
            };
            pinnedCodes.push(pinnedCode);
            slot.classList.add('pinned');
        }
        
        chrome.storage.local.set({pinnedNfpaPublications: pinnedCodes}, function() {
            loadRecentNfpaPublications(); // Refresh display
        });
    });
}

/**
 * Set up mouse-based sliding gesture detection for publication slots
 */
function setupSlidingEffects() {
    const container = document.querySelector('.nfpapublications-overlay');
    if (!container) return;
    
    const items = container.querySelectorAll('.overlay-slot');
    
    items.forEach((item) => {
        const itemContent = item.querySelector('.item-content');
        if (!itemContent) return;
        
        // Remove existing event listeners to avoid duplicates
        item.removeEventListener('mousemove', item._mouseMoveHandler);
        item.removeEventListener('mouseleave', item._mouseLeaveHandler);
        
        // Mouse move handler for edge detection
        item._mouseMoveHandler = (e) => {
            const rect = item.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const width = rect.width;
            const edgeZone = 60; // 60px edge detection zone
            
            // Clear previous slide states
            item.classList.remove('slide-left', 'slide-right');
            
            if (x <= edgeZone) {
                // Left edge: show pin/unpin button
                item.classList.add('slide-right');
            } else if (x >= width - edgeZone) {
                // Right edge: show delete button
                item.classList.add('slide-left');
            }
        };
        
        // Mouse leave handler to reset state
        item._mouseLeaveHandler = () => {
            item.classList.remove('slide-left', 'slide-right');
            
            // Brief delay before re-enabling link clicks
            item._linkClickDisabled = true;
            setTimeout(() => {
                item._linkClickDisabled = false;
            }, 150);
        };
        
        // Attach event listeners
        item.addEventListener('mousemove', item._mouseMoveHandler);
        item.addEventListener('mouseleave', item._mouseLeaveHandler);
        
        // Set up button click handlers
        const pinBtn = item.querySelector('.pin-btn');
        const deleteBtn = item.querySelector('.delete-btn');
        const link = item.querySelector('.content-layer .nav-link');
        
        if (pinBtn && link) {
            pinBtn.removeEventListener('click', pinBtn._clickHandler);
            pinBtn._clickHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!link.classList.contains('disabled')) {
                    togglePin(item, link);
                }
            };
            pinBtn.addEventListener('click', pinBtn._clickHandler);
        }
        
        if (deleteBtn && link) {
            deleteBtn.removeEventListener('click', deleteBtn._clickHandler);
            deleteBtn._clickHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!link.classList.contains('disabled')) {
                    deleteItem(link);
                }
            };
            deleteBtn.addEventListener('click', deleteBtn._clickHandler);
        }
    });
}

/**
 * Extract publication code base from URL for storage key matching
 * @param {string} url - Publication URL
 * @returns {string|null} - Code base (e.g., "NFPA-2-2023") or null
 */
function extractCodeBaseFromUrl(url) {
    // Handle both standard and free-access URL patterns
    const standardMatch = url.match(/https:\/\/link\.nfpa\.org\/publications\/([^\/]+)\/([^\/\?]+)/);
    const freeAccessMatch = url.match(/https:\/\/link\.nfpa\.org\/free-access\/publications\/([^\/]+)\/([^\/\?]+)/);
    
    const match = standardMatch || freeAccessMatch;
    if (match) {
        return `NFPA-${match[1]}-${match[2]}`;
    }
    return null;
}

/**
 * Delete a publication from both recent and pinned lists
 * @param {HTMLElement} link - The publication link element
 */
function deleteItem(link) {
    const codeBase = extractCodeBaseFromUrl(link.href);
    if (!codeBase) return;
    
    chrome.storage.local.get(['recentNfpaPublications', 'pinnedNfpaPublications'], function(result) {
        let recentPages = result.recentNfpaPublications || [];
        let pinnedPages = result.pinnedNfpaPublications || [];
        
        // Remove from both lists
        recentPages = recentPages.filter(page => page.codeBase !== codeBase);
        pinnedPages = pinnedPages.filter(page => page.codeBase !== codeBase);
        
        chrome.storage.local.set({
            recentNfpaPublications: recentPages,
            pinnedNfpaPublications: pinnedPages
        }, function() {
            loadRecentNfpaPublications(); // Refresh display
        });
    });
}

/**
 * Clear all saved publications with user confirmation
 */
function clearAllItems() {
    if (confirm('Clear all recent and pinned NFPA Publications items?')) {
        chrome.storage.local.remove(['recentNfpaPublications', 'pinnedNfpaPublications'], function() {
            loadRecentNfpaPublications(); // Refresh display
        });
    }
}

/**
 * Load and display recent/pinned publications in the popup
 */
function loadRecentNfpaPublications() {
    chrome.storage.local.get(['recentNfpaPublications', 'pinnedNfpaPublications'], function(result) {
        const recentPages = result.recentNfpaPublications || [];
        const pinnedPages = result.pinnedNfpaPublications || [];
        
        // Get UI elements
        const overlay = document.querySelector('.nfpapublications-overlay');
        const emptyState = overlay.querySelector('.overlay-empty');
        const availableSlots = overlay.querySelectorAll('.overlay-slot');
        
        // Reset all slots
        availableSlots.forEach((item) => {
            item.style.display = 'none';
            item.classList.remove('show', 'pinned');
            
            const link = item.querySelector('.content-layer .nav-link');
            if (link) {
                link.textContent = '';
                link.href = '#';
                link.removeAttribute('target');
                link.removeAttribute('rel');
                link.classList.add('disabled');
                link.title = '';
            }
        });
        
        // Combine pinned and recent (pinned first, max 5 total)
        const allPages = [...pinnedPages, ...recentPages.filter(page => 
            !pinnedPages.some(pinned => pinned.codeBase === page.codeBase)
        )].slice(0, 5);
        
        // Show empty state or populate slots
        if (allPages.length === 0) {
            if (emptyState) {
                emptyState.style.display = '';
                emptyState.classList.remove('hidden');
            }
        } else {
            if (emptyState) {
                emptyState.style.display = 'none';
                emptyState.classList.add('hidden');
            }
            
            // Populate publication slots
            allPages.forEach((page, index) => {
                const slot = availableSlots[index];
                if (!slot) return;
                
                const link = slot.querySelector('.content-layer .nav-link');
                if (link) {
                    link.textContent = page.title;
                    link.href = page.url;
                    link.target = '_blank';
                    link.rel = 'noopener';
                    link.classList.remove('disabled');
                    link.title = page.title;
                }
                
                // Mark pinned items
                const isPinned = pinnedPages.some(pinned => pinned.codeBase === page.codeBase);
                if (isPinned) {
                    slot.classList.add('pinned');
                }
                
                // Show the slot
                slot.style.display = '';
                slot.classList.add('show');
            });
        }
        
        // Re-setup interactions after content update
        setTimeout(() => setupSlidingEffects(), 100);
        setupEventHandlers();
    });
}

/**
 * Set up global event handlers using event delegation
 */
function setupEventHandlers() {
    // Pin button clicks
    if (!window.pinHandlerAttached) {
        window.pinHandlerAttached = true;
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('pin-btn') || e.target.closest('.pin-btn')) {
                e.preventDefault();
                e.stopPropagation();
                
                const button = e.target.closest('.pin-btn');
                const slot = button.closest('.overlay-slot');
                const link = slot ? slot.querySelector('.content-layer .nav-link') : null;
                
                if (link && !link.classList.contains('disabled')) {
                    togglePin(slot, link);
                }
            }
        });
    }
    
    // Delete button clicks
    if (!window.deleteHandlerAttached) {
        window.deleteHandlerAttached = true;
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('delete-btn') || e.target.closest('.delete-btn')) {
                e.preventDefault();
                e.stopPropagation();
                
                const button = e.target.closest('.delete-btn');
                const slot = button.closest('.overlay-slot');
                const link = slot ? slot.querySelector('.content-layer .nav-link') : null;
                
                if (link && !link.classList.contains('disabled')) {
                    deleteItem(link);
                }
            }
        });
    }
    
    // Publication link clicks
    if (!window.linkHandlerAttached) {
        window.linkHandlerAttached = true;
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('nav-link') && e.target.closest('.overlay-slot')) {
                const slot = e.target.closest('.overlay-slot');
                const link = e.target;
                
                // Prevent navigation during sliding or if disabled
                if (slot.classList.contains('slide-left') || 
                    slot.classList.contains('slide-right') || 
                    slot._linkClickDisabled ||
                    link.classList.contains('disabled')) {
                    e.preventDefault();
                    return false;
                }
                
                // Close popup after navigation
                setTimeout(() => window.close(), 100);
            }
        });
    }
    
    // Clear all button
    if (!window.clearHandlerAttached) {
        window.clearHandlerAttached = true;
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('clear-all-btn')) {
                e.preventDefault();
                e.stopPropagation();
                clearAllItems();
            }
        });
    }
    
    // Main link clicks (close popup)
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('nav-link') && e.target.closest('.overlay-main-link')) {
            setTimeout(() => window.close(), 100);
        }
    });
}
