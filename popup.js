document.addEventListener('DOMContentLoaded', function() {
    console.log('=== NFPA Publications Popup DOM loaded ===');
    
    // Debug: Check what's in storage immediately
    chrome.storage.local.get(['recentNfpaPublications', 'pinnedNfpaPublications'], function(result) {
        console.log('Initial storage check:', result);
    });
    
    // Load recent NFPA Publications pages
    loadRecentNfpaPublications();
    
    // Setup sliding effects and handlers
    setupSlidingEffects();
});

function togglePin(slot, link) {
    const codeBase = extractCodeBaseFromUrl(link.href);
    
    if (!codeBase) return;
    
    chrome.storage.local.get(['pinnedNfpaPublications'], function(result) {
        let pinnedCodes = result.pinnedNfpaPublications || [];
        const isCurrentlyPinned = pinnedCodes.some(code => code.codeBase === codeBase);
        const pinBtn = slot.querySelector('.pin-btn');
        
        if (isCurrentlyPinned) {
            // Unpin
            pinnedCodes = pinnedCodes.filter(code => code.codeBase !== codeBase);
            slot.classList.remove('pinned');
            if (pinBtn) pinBtn.classList.remove('pinned');
        } else {
            // Pin
            const pinnedCode = {
                codeBase: codeBase,
                title: link.textContent,
                url: link.href,
                timestamp: Date.now()
            };
            pinnedCodes.push(pinnedCode);
            slot.classList.add('pinned');
            if (pinBtn) pinBtn.classList.add('pinned');
        }
        
        chrome.storage.local.set({pinnedNfpaPublications: pinnedCodes}, function() {
            // Reload the submenu to reorder items
            loadRecentNfpaPublications();
        });
    });
}

function setupSlidingEffects() {
    console.log('Setting up sliding effects...');
    
    const container = document.querySelector('.nfpapublications-overlay');
    if (!container) {
        console.error('No container found for setupSlidingEffects');
        return;
    }
    
    const items = container.querySelectorAll('.overlay-slot');
    console.log('Found overlay slots:', items.length);
    
    items.forEach((item, index) => {
        console.log(`Setting up sliding for slot ${index}:`, item);
        
        const itemContent = item.querySelector('.item-content');
        if (!itemContent) {
            console.log(`No item-content found in slot ${index}`);
            return;
        }
        
        // Remove existing event listeners to avoid duplicates
        item.removeEventListener('mousemove', item._mouseMoveHandler);
        item.removeEventListener('mouseleave', item._mouseLeaveHandler);
        
        // Create and store event handlers
        item._mouseMoveHandler = (e) => {
            const rect = item.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const width = rect.width;
            const edgeZone = 60; // 60px from each edge
            
            console.log(`Mouse at ${x}px in ${width}px wide slot`);
            
            // Clear previous classes
            item.classList.remove('slide-left', 'slide-right');
            
            if (x <= edgeZone) {
                // Hovering left edge - show pin/unpin button
                item.classList.add('slide-right');
                console.log('Adding slide-right class (showing pin button)');
            } else if (x >= width - edgeZone) {
                // Hovering right edge - show delete button  
                item.classList.add('slide-left');
                console.log('Adding slide-left class (showing delete button)');
            }
        };
        
        item._mouseLeaveHandler = () => {
            item.classList.remove('slide-left', 'slide-right');
            console.log('Mouse left, removing slide classes');
            
            // Add a brief delay before re-enabling link clicks
            item._linkClickDisabled = true;
            setTimeout(() => {
                item._linkClickDisabled = false;
            }, 150);
        };
        
        // Add event listeners
        item.addEventListener('mousemove', item._mouseMoveHandler);
        item.addEventListener('mouseleave', item._mouseLeaveHandler);
        
        // Reattach button functionality
        const pinBtn = item.querySelector('.pin-btn');
        const deleteBtn = item.querySelector('.delete-btn');
        const link = item.querySelector('.content-layer .nav-link');
        
        if (pinBtn && link) {
            pinBtn.removeEventListener('click', pinBtn._clickHandler);
            pinBtn._clickHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Pin button clicked');
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
                console.log('Delete button clicked');
                if (!link.classList.contains('disabled')) {
                    deleteItem(link);
                }
            };
            deleteBtn.addEventListener('click', deleteBtn._clickHandler);
        }
        
        console.log(`Slot ${index} setup complete`);
    });
    
    console.log('Sliding effects setup complete for all slots');
}

function extractCodeBaseFromUrl(url) {
    // NFPA URL pattern: https://link.nfpa.org/publications/2/2023
    const match = url.match(/https:\/\/link\.nfpa\.org\/publications\/([^\/]+)\/([^\/\?]+)/);
    if (match) {
        return `NFPA-${match[1]}-${match[2]}`;
    }
    return null;
}

function deleteItem(link) {
    const codeBase = extractCodeBaseFromUrl(link.href);
    if (!codeBase) return;
    
    chrome.storage.local.get(['recentNfpaPublications', 'pinnedNfpaPublications'], function(result) {
        let recentPages = result.recentNfpaPublications || [];
        let pinnedPages = result.pinnedNfpaPublications || [];
        
        // Remove from both recent and pinned
        recentPages = recentPages.filter(page => page.codeBase !== codeBase);
        pinnedPages = pinnedPages.filter(page => page.codeBase !== codeBase);
        
        chrome.storage.local.set({
            recentNfpaPublications: recentPages,
            pinnedNfpaPublications: pinnedPages
        }, function() {
            loadRecentNfpaPublications();
        });
    });
}

function clearAllItems() {
    if (confirm('Clear all recent and pinned NFPA Publications items?')) {
        chrome.storage.local.remove(['recentNfpaPublications', 'pinnedNfpaPublications'], function() {
            loadRecentNfpaPublications();
        });
    }
}

function loadRecentNfpaPublications() {
    console.log('=== loadRecentNfpaPublications() called ===');
    
    chrome.storage.local.get(['recentNfpaPublications', 'pinnedNfpaPublications'], function(result) {
        const recentPages = result.recentNfpaPublications || [];
        const pinnedPages = result.pinnedNfpaPublications || [];
        
        console.log('Raw storage result:', result);
        console.log('Loading recent codes:', recentPages);
        console.log('Loading pinned codes:', pinnedPages);
        
        // Get empty state element and available slots
        const overlay = document.querySelector('.nfpapublications-overlay');
        const emptyState = overlay.querySelector('.overlay-empty');
        const availableSlots = overlay.querySelectorAll('.overlay-slot');
        
        console.log('Found overlay:', overlay);
        console.log('Found empty state:', emptyState);
        console.log('Found available slots:', availableSlots.length);
        
        // Hide all available slots initially
        availableSlots.forEach((item, index) => {
            console.log(`Resetting slot ${index}`);
            item.style.display = 'none';
            item.classList.remove('show');
            const link = item.querySelector('.content-layer .nav-link');
            
            if (link) {
                link.textContent = '';
                link.href = '#';
                link.removeAttribute('target');
                link.removeAttribute('rel');
                link.classList.add('disabled');
                link.title = '';
            }
            
            item.classList.remove('pinned');
        });
        
        // Combine pinned and recent pages, prioritizing pinned, limit to 5
        const allPages = [...pinnedPages, ...recentPages.filter(page => 
            !pinnedPages.some(pinned => pinned.codeBase === page.codeBase)
        )].slice(0, 5);
        
        console.log('Combined pages to display:', allPages);
        console.log('Available slots found:', availableSlots.length);
        
        // Show empty state if no pages, otherwise hide it
        if (allPages.length === 0) {
            console.log('Showing empty state - no pages found');
            if (emptyState) {
                emptyState.style.display = '';
                emptyState.classList.remove('hidden');
            }
        } else {
            console.log('Hiding empty state, showing', allPages.length, 'publications');
            if (emptyState) {
                emptyState.style.display = 'none';
                emptyState.classList.add('hidden');
            }
        }
        
        // Populate available slots with combined pages (up to 5)
        allPages.forEach((page, index) => {
            const slot = availableSlots[index];
            console.log(`Processing page ${index}:`, page);
            console.log(`Using slot ${index}:`, slot);
            
            if (slot) {
                const link = slot.querySelector('.content-layer .nav-link');
                const pinBtn = slot.querySelector('.pin-btn');
                
                console.log('Found elements in slot:', { link: !!link, pinBtn: !!pinBtn });
                
                if (link) {
                    link.textContent = page.title;
                    link.href = page.url;
                    link.target = '_blank';
                    link.rel = 'noopener';
                    link.classList.remove('disabled');
                    link.title = page.title;
                    
                    console.log(`Set link text to: "${page.title}"`);
                    console.log(`Set link href to: "${page.url}"`);
                }
                
                // Check if this page is pinned
                const isPinned = pinnedPages.some(pinned => pinned.codeBase === page.codeBase);
                if (isPinned) {
                    slot.classList.add('pinned');
                    if (pinBtn) pinBtn.classList.add('pinned');
                    console.log(`Slot ${index} marked as pinned`);
                } else {
                    slot.classList.remove('pinned');
                    if (pinBtn) pinBtn.classList.remove('pinned');
                    console.log(`Slot ${index} marked as unpinned`);
                }
                
                // Show this slot
                slot.style.display = '';
                slot.classList.add('show');
                console.log(`Slot ${index} populated and shown`);
            }
        });
        
        // Re-setup sliding effects after loading items
        setTimeout(() => setupSlidingEffects(), 100);
        
        // Setup event handlers
        setupEventHandlers();
        
        console.log(`=== Loaded ${allPages.length} publications (limit: 5) ===`);
    });
}

function setupEventHandlers() {
    console.log('Setting up event handlers...');
    
    // Handle pin button clicks - use event delegation for overlay slots
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
    
    // Handle delete button clicks - use event delegation for overlay slots
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
    
    // Handle nav-link clicks - prevent navigation when sliding
    if (!window.linkHandlerAttached) {
        window.linkHandlerAttached = true;
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('nav-link') && e.target.closest('.overlay-slot')) {
                const slot = e.target.closest('.overlay-slot');
                const link = e.target;
                
                // If we're sliding (showing action buttons), prevent link navigation
                if (slot.classList.contains('slide-left') || slot.classList.contains('slide-right') || slot._linkClickDisabled) {
                    e.preventDefault();
                    console.log('Link click prevented during/after sliding');
                    return false;
                }
                
                // If link is disabled, prevent navigation
                if (link.classList.contains('disabled')) {
                    e.preventDefault();
                    return false;
                }
                
                // Otherwise, allow normal link behavior and close popup
                console.log('Link click allowed:', link.href);
                setTimeout(() => {
                    window.close();
                }, 100);
            }
        });
    }
    
    // Handle clear all button click - use event delegation to avoid duplicates
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
    
    // Handle main link clicks to close popup
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('nav-link') && e.target.closest('.overlay-main-link')) {
            setTimeout(() => {
                window.close();
            }, 100);
        }
    });
}
