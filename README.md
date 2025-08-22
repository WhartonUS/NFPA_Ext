# NFPA Family of Solutions Chrome Extension

A Chrome browser extension that provides unified access to National Fire Protection Association's digital services with intelligent NFPA Codes & Standards tracking functionality.

## 🔧 Technical Overview

### Architecture
- **Extension Type**: Chrome Extension (Manifest V3)
- **Target Platform**: Chromium-based browsers
- **Permissions**: `activeTab`, `storage`
- **Content Script Domain**: `https://link.nfpa.org/codes-and-standards/all-codes-and-standards/codes-and-standards/*`

### Core Components

```
NFPA_Ext/
├── manifest.json          # Extension configuration & permissions
├── popup.html            # Main UI interface
├── popup.js              # UI logic & storage management  
├── content-tracker.js    # NFPA Codes visit tracking
├── styles.css            # UI styling & animations
└── icons/               # Extension icons & branding
```

## 📋 Features

### 1. Navigation Hub
Quick access menu to NFPA's primary digital services:
- **NFPA**: Main website (`nfpa.org`)
- **myNFPA**: User portal (`my.nfpa.org`)
- **NFPA Codes & Standards**: Code documents with smart tracking
- **Catalog**: Publications (`catalog.nfpa.org`)
- **Training**: Training and events (`nfpa.org/training-and-events`)
- **Support**: Help center (`nfpa.org/help`)

### 2. NFPA Codes & Standards Tracking System

#### Automatic Visit Detection
```javascript
// URL Pattern Matching
const match = url.match(/detail\?id=([^&]+)/);
// Extracts: NFPA1 from https://link.nfpa.org/codes-and-standards/all-codes-and-standards/codes-and-standards/detail?id=NFPA1
```

#### Data Structure
```javascript
{
  codeBase: "NFPA1",                    // Extracted identifier
  title: "NFPA 1: Fire Code",         // Document title
  url: "https://link.nfpa.org/codes-and-standards/all-codes-and-standards/codes-and-standards/detail?id=NFPA1",
  timestamp: 1692633600000              // Visit time
}
```

#### Storage Management
- **Recent Codes**: FIFO queue (max 10 stored, 5 displayed)
- **Pinned Codes**: User favorites (unlimited)
- **Priority Display**: Pinned items shown first
- **Persistence**: Chrome `storage.local` API

### 3. Interactive UI Elements

#### Swipe Actions
- **Left Swipe**: Reveals delete button
- **Right Swipe**: Reveals pin/unpin button
- **Visual Feedback**: Colored action areas (red/yellow/red)

#### State Management
- **Pinned Items**: Green left border indicator
- **Recent Items**: Standard appearance
- **Empty State**: Instructional message when no codes visited

## 🛠️ Technical Implementation

### Content Script (`content-tracker.js`)
```javascript
// Automatic tracking on NFPA Codes pages
(function() {
    const url = window.location.href;
    const match = url.match(/detail\?id=([^&]+)/);
    
    if (match) {
        const codeBase = match[1];
        const pageTitle = document.title;
        
        // Store visit data
        const recentPage = {
            codeBase: codeBase,
            title: pageTitle,
            url: url,
            timestamp: Date.now()
        };
        
        // Update storage with deduplication
        chrome.storage.local.get(['recentNfpaCodes'], function(result) {
            let recentPages = result.recentNfpaCodes || [];
            recentPages = recentPages.filter(page => page.codeBase !== codeBase);
            recentPages.unshift(recentPage);
            recentPages = recentPages.slice(0, 10);
            
            chrome.storage.local.set({recentNfpaCodes: recentPages});
        });
    }
})();
```

### Popup Interface (`popup.js`)
```javascript
// Load and display recent/pinned codes
function loadRecentNfpaCodes() {
    chrome.storage.local.get(['recentNfpaCodes', 'pinnedNfpaCodes'], function(result) {
        const recentPages = result.recentNfpaCodes || [];
        const pinnedPages = result.pinnedNfpaCodes || [];
        
        // Combine with priority: pinned first, then recent (max 5 total)
        const allPages = [...pinnedPages, ...recentPages.filter(page => 
            !pinnedPages.some(pinned => pinned.codeBase === page.codeBase)
        )].slice(0, 5);
        
        // Populate UI slots
        populateUISlots(allPages);
    });
}
```

### UI Styling (`styles.css`)
```css
/* NFPA Brand Colors */
:root {
    --nfpa-primary: #cc092f;
    --nfpa-secondary: #7a0019;
    --nfpa-accent: #ff6b35;
}

/* Sliding Animation System */
.overlay-slot.slide-right .content-layer {
    transform: translateX(80px);
}

.overlay-slot.slide-left .content-layer {
    transform: translateX(-80px);
}

/* Action Button Areas */
.overlay-slot .pin-action {
    background: #cc092f; /* Red for pin */
}

.overlay-slot.pinned .pin-action {
    background: #ffc107; /* Yellow for unpin */
}

.overlay-slot .delete-action {
    background: #dc3545; /* Red for delete */
}
```

## 📱 User Interface Specifications

### Popup Dimensions
- **Width**: 300px
- **Height**: 372px (with 28px disclaimer footer)
- **Layout**: Fixed overlay system

### Interaction Patterns
- **Menu Navigation**: Single-click access to services
- **Submenu Toggle**: Sliding overlay for NFPA Codes & Standards
- **Item Management**: Swipe gestures for pin/delete actions
- **Context Awareness**: Highlights current active service

### Visual States
- **Default**: NFPA red color scheme
- **Hover**: Subtle background changes
- **Active**: Bold highlighting for current service
- **Pinned**: Green left border + light red background
- **Actions**: Colored reveal areas during swipe

## 🔒 Security & Permissions

### Minimal Permissions Model
```json
{
  "permissions": [
    "activeTab",    // Access current tab URL for context
    "storage"       // Local data persistence
  ]
}
```

### Data Privacy
- **Local Storage Only**: No external API calls
- **Domain Restricted**: Only monitors NFPA Codes & Standards
- **User Controlled**: All data management via UI
- **No Tracking**: No analytics or user identification

## 🚀 Performance Characteristics

### Content Script
- **Lightweight**: ~2KB minified
- **Non-blocking**: Runs at `document_idle`
- **Efficient**: Single execution per page load
- **Minimal DOM**: No UI modifications to host page

### Popup Interface
- **Fast Load**: <100ms typical startup time
- **Memory Efficient**: ~5MB RAM usage
- **Smooth Animations**: 60fps CSS transitions
- **Responsive**: Event delegation for dynamic content

## 🔧 Development Setup

### Prerequisites
- Chrome/Chromium browser (version 88+)
- Manifest V3 support
- Developer mode enabled

### Installation
1. Clone repository
2. Open Chrome Extensions (`chrome://extensions/`)
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select project directory

### File Structure Explained
```javascript
manifest.json          // Extension metadata & configuration
├── permissions        // activeTab, storage
├── content_scripts    // NFPA Codes page monitoring
├── action            // Popup configuration
└── icons             // Extension branding

popup.html             // Main interface template
├── NFPA brand colors  // CSS custom properties
├── Navigation menu    // Primary services list
├── NFPA Codes         // Expandable submenu
└── Development banner // Version indicator

popup.js              // User interface logic
├── Menu highlighting  // Current service detection
├── Storage management // Recent/pinned data handling
├── UI interactions    // Swipe gestures & animations
└── Event delegation   // Dynamic content handling

content-tracker.js    // Background page monitoring
├── URL pattern match  // NFPA Codes detection
├── Data extraction    // Title & identifier parsing
├── Storage updates    // Recent visits tracking
└── Deduplication      // Prevent duplicate entries

styles.css            // Visual presentation
├── NFPA color scheme  // Brand consistency
├── Sliding animations // Smooth transitions
├── Swipe interactions // Touch-like gestures
└── Responsive layout  // Fixed popup dimensions
```

## 🐛 Known Limitations

### Current Constraints
- **Browser Support**: Chrome/Chromium only (Manifest V3)
- **Domain Scope**: Only tracks NFPA Codes & Standards pages
- **Storage Limit**: Chrome storage quotas apply
- **UI Size**: Fixed 300×372px popup window

### Future Enhancements
- [ ] Firefox compatibility (Manifest V2 fallback)
- [ ] Keyboard navigation support
- [ ] Export/import functionality for bookmarks
- [ ] Advanced filtering and search capabilities

## 📊 Storage Schema

### Recent NFPA Codes
```javascript
chrome.storage.local.recentNfpaCodes = [
  {
    codeBase: "NFPA1",
    title: "NFPA 1: Fire Code",
    url: "https://link.nfpa.org/codes-and-standards/all-codes-and-standards/codes-and-standards/detail?id=NFPA1",
    timestamp: 1692633600000
  },
  // ... up to 10 entries
];
```

### Pinned NFPA Codes
```javascript
chrome.storage.local.pinnedNfpaCodes = [
  {
    codeBase: "NFPA101", 
    title: "NFPA 101: Life Safety Code",
    url: "https://link.nfpa.org/codes-and-standards/all-codes-and-standards/codes-and-standards/detail?id=NFPA101",
    timestamp: 1692633600000
  },
  // ... unlimited entries
];
```

## 🔄 Version History

### v0.0.1 (Development)
- Initial implementation
- Core navigation functionality
- NFPA Codes & Standards tracking system
- Swipe gesture interactions
- Pin/unpin functionality

---

**Development Status**: Not for public release  
**Maintained by**: WhartonUS  
**License**: Internal NFPA Development
