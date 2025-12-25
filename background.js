// Background service worker for YT Audio Ripper
// This service worker handles extension lifecycle events

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('YT Audio Ripper installed');
    // Initialize storage
    chrome.storage.local.set({
      downloadHistory: [],
      settings: {
        defaultQuality: 192,
        autoDownload: false,
        showNotifications: true
      }
    });
  } else if (details.reason === 'update') {
    console.log('YT Audio Ripper updated to version', chrome.runtime.getManifest().version);
  }
});

// Listen for messages from content script (quick download button)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'quickDownload' && message.videoInfo) {
    // Open popup - we can't programmatically open popup, but we can show notification
    console.log('Quick download requested for:', message.videoInfo.title);
    
    // Store the video info for when popup opens
    chrome.storage.local.set({ pendingDownload: message.videoInfo });
    
    sendResponse({ success: true, message: 'Click the extension icon to download' });
  }
  return true;
});

// Listen for download state changes
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state) {
    console.log('Download state changed:', delta.id, delta.state.current);
    
    // Show notification on complete
    if (delta.state.current === 'complete') {
      chrome.downloads.search({ id: delta.id }, (items) => {
        if (items && items[0]) {
          console.log('Download completed:', items[0].filename);
        }
      });
    }
  }
});

// Keep service worker alive during downloads
chrome.downloads.onCreated.addListener((downloadItem) => {
  console.log('Download started:', downloadItem.id);
});

// Clean up old pending downloads on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.remove('pendingDownload');
});
