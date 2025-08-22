// Content script to track NFPA Publications page visits
(function() {
    console.log('NFPA Content script running on:', window.location.href);
    
    // Extract publication ID from NFPA URL (e.g., "2" and "2023" from https://link.nfpa.org/publications/2/2023)
    const url = window.location.href;
    const match = url.match(/https:\/\/link\.nfpa\.org\/publications\/([^\/]+)\/([^\/\?]+)/);
    
    console.log('URL match result:', match);
    console.log('Current URL being tracked:', url);
    
    if (match) {
        const publicationId = match[1];
        const year = match[2];
        const codeBase = `NFPA-${publicationId}-${year}`;
        
        console.log('Publication ID:', publicationId);
        console.log('Year:', year);
        console.log('Code base:', codeBase);
        
        // Function to save the page data
        function savePage() {
            let pageTitle = document.title;
            
            // Clean up the title by removing the "NFPA LiNK® - " prefix
            if (pageTitle.startsWith('NFPA LiNK® - ')) {
                pageTitle = pageTitle.replace('NFPA LiNK® - ', '');
            }
            
            console.log('NFPA Tracker: Saving page with cleaned title:', pageTitle);
            
            const pageData = {
                url: url,
                title: pageTitle,
                publicationId: publicationId,
                year: year,
                codeBase: codeBase,
                timestamp: Date.now(),
                visitDate: new Date().toISOString().split('T')[0]
            };

            // Get existing visits and update
            chrome.storage.local.get(['recentNfpaPublications'], (result) => {
                let recentVisits = result.recentNfpaPublications || [];
                
                // Remove any existing entry for this same page
                recentVisits = recentVisits.filter(item => item.codeBase !== codeBase);
                
                // Add to the beginning of the array
                recentVisits.unshift(pageData);
                
                // Keep only the most recent 50 visits
                recentVisits = recentVisits.slice(0, 50);
                
                // Save back to storage
                chrome.storage.local.set({
                    recentNfpaPublications: recentVisits
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Error saving NFPA page data:', chrome.runtime.lastError);
                    } else {
                        console.log('NFPA page data saved successfully:', pageData);
                    }
                });
            });
        }
        
        // Function to check and save the page
        function checkAndSavePage() {
    console.log('NFPA Tracker: Checking page title...');
    
    // Check both document.title and the title element directly
    const titleElement = document.querySelector('title');
    const currentTitle = document.title;
    const elementTitle = titleElement ? titleElement.textContent : '';
    
    console.log('NFPA Tracker: document.title:', currentTitle);
    console.log('NFPA Tracker: title element text:', elementTitle);
    console.log('NFPA Tracker: title element attributes:', titleElement ? titleElement.attributes : 'none');
    
    // Use whichever title is more complete
    const bestTitle = elementTitle.length > currentTitle.length ? elementTitle : currentTitle;
    
    // Check if we have a meaningful title (not just the generic NFPA LiNK)
    if (bestTitle && 
        bestTitle !== 'NFPA LiNK®' && 
        !bestTitle.startsWith('NFPA LiNK® - Loading') &&
        bestTitle.includes('NFPA') &&
        (bestTitle.includes('NFPA-') || bestTitle.match(/\d{4}/))) { // Look for NFPA- or year pattern
        
        console.log('NFPA Tracker: Found meaningful title, saving page...');
        savePage();
        return true; // Success
    }
    
    console.log('NFPA Tracker: Title not ready yet, will retry...');
    return false; // Not ready yet
}
        
        // Initial check
        if (checkAndSavePage()) {
            console.log('NFPA Tracker: Page saved immediately');
        } else {
            // Set up polling with reduced frequency since we also have mutation observer
            let attempts = 0;
            const maxAttempts = 20; // 10 seconds
            
            const pollInterval = setInterval(() => {
                attempts++;
                console.log(`NFPA Tracker: Polling attempt ${attempts}/${maxAttempts}`);
                
                if (checkAndSavePage() || attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    if (attempts >= maxAttempts) {
                        console.log('NFPA Tracker: Max polling attempts reached');
                    }
                }
            }, 500);
        }

        // Also watch for title changes using MutationObserver (better for React)
        const titleObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.target.tagName === 'TITLE') {
                    console.log('NFPA Tracker: Title element content changed via mutation');
                    checkAndSavePage();
                }
            });
        });

        // Observe the title element for changes
        const titleElement = document.querySelector('title');
        if (titleElement) {
            titleObserver.observe(titleElement, {
                childList: true,
                subtree: true,
                characterData: true
            });
            console.log('NFPA Tracker: Set up title mutation observer');
        }

        // Also observe the head for title attribute changes (React Helmet)
        const headObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    mutation.target.tagName === 'TITLE' && 
                    mutation.attributeName === 'data-react-helmet') {
                    console.log('NFPA Tracker: React Helmet title updated');
                    setTimeout(checkAndSavePage, 100); // Small delay for React to finish
                }
            });
        });

        if (titleElement) {
            headObserver.observe(titleElement, {
                attributes: true,
                attributeFilter: ['data-react-helmet']
            });
            console.log('NFPA Tracker: Set up React Helmet observer');
        }
        
    } else {
        console.log('URL does not match expected NFPA publications pattern');
        console.log('Expected pattern: https://link.nfpa.org/publications/{id}/{year}');
    }
})();
