/*
 * NFPA Publications Extension - Content Tracker
 * 
 * Automatically tracks visits to NFPA publication pages and saves them
 * to local storage for quick access via the extension popup.
 * 
 * Supported URL patterns:
 * - Standard: https://link.nfpa.org/publications/{id}/{year}
 * - Free Access: https://link.nfpa.org/free-access/publications/{id}/{year}
 * 
 * Features:
 * - URL-based title generation (no DOM dependencies)
 * - Handles single-page application navigation
 * - Context invalidation error handling
 * - Deduplication by publication code
 */

function trackNFPAPage() {
    const url = window.location.href;
    
    // Extract publication ID from NFPA URL patterns
    const standardMatch = url.match(/https:\/\/link\.nfpa\.org\/publications\/([^\/]+)\/([^\/\?]+)/);
    const freeAccessMatch = url.match(/https:\/\/link\.nfpa\.org\/free-access\/publications\/([^\/]+)\/([^\/\?]+)/);
    
    const match = standardMatch || freeAccessMatch;
    
    if (match) {
        const publicationId = match[1];
        const year = match[2];
        const codeBase = `NFPA-${publicationId}-${year}`;
        
        // Validate Chrome extension context
        if (!chrome || !chrome.storage || !chrome.storage.local) {
            console.error('NFPA Tracker: Chrome storage API not available');
            return;
        }
        
        try {
            if (!chrome.runtime.id) {
                console.log('NFPA Tracker: Extension context invalidated, skipping save');
                return;
            }
        } catch (e) {
            console.log('NFPA Tracker: Extension context invalidated, skipping save');
            return;
        }
        
        // Generate title with free-access indicator
        const isFreeAccess = url.includes('/free-access/');
        const pageTitle = isFreeAccess ? `${year} NFPA ${publicationId} (FA)` : `${year} NFPA ${publicationId}`;
        
        const pageData = {
            url: url,
            title: pageTitle,
            publicationId: publicationId,
            year: year,
            codeBase: codeBase,
            isFreeAccess: isFreeAccess,
            timestamp: Date.now(),
            visitDate: new Date().toISOString().split('T')[0]
        };
        
        // Save to local storage with error handling
        chrome.storage.local.get(['recentNfpaPublications'], (result) => {
            if (chrome.runtime.lastError) {
                console.error('NFPA Tracker: Storage read error:', chrome.runtime.lastError);
                
                if (chrome.runtime.lastError.message && 
                    chrome.runtime.lastError.message.includes('context invalidated')) {
                    console.log('NFPA Tracker: Context invalidated - will retry on next navigation');
                    return;
                }
                return;
            }
            
            let recentVisits = result.recentNfpaPublications || [];
            
            // Remove existing entry for same publication (deduplication)
            recentVisits = recentVisits.filter(item => item.codeBase !== codeBase);
            
            // Add new visit to beginning of array
            recentVisits.unshift(pageData);
            
            // Keep only most recent 50 visits
            recentVisits = recentVisits.slice(0, 50);
            
            // Save back to storage
            chrome.storage.local.set({ recentNfpaPublications: recentVisits }, () => {
                if (chrome.runtime.lastError) {
                    console.error('NFPA Tracker: Storage write error:', chrome.runtime.lastError);
                    
                    if (chrome.runtime.lastError.message && 
                        chrome.runtime.lastError.message.includes('context invalidated')) {
                        console.log('NFPA Tracker: Context invalidated during save - will retry on next navigation');
                    }
                } else {
                    console.log('NFPA Tracker: Successfully saved publication:', pageTitle);
                }
            });
        });
    }
}

// Initialize tracking
console.log('NFPA Tracker: Content script loaded');
trackNFPAPage();

// Watch for URL changes in single-page applications
let currentUrl = location.href;
const urlWatcher = setInterval(() => {
    if (location.href !== currentUrl) {
        currentUrl = location.href;
        trackNFPAPage();
    }
}, 1000);
