// Content script for YT Audio Ripper
// This script runs on YouTube pages to extract video information

// Get video information from the YouTube page
function getVideoInfo() {
  try {
    // Get video title
    const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string') ||
                         document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
                         document.querySelector('h1.title') ||
                         document.querySelector('[itemprop="name"]');
    
    const title = titleElement?.textContent?.trim() || 
                  document.title.replace(' - YouTube', '').trim() ||
                  'YouTube Video';
    
    // Get channel name
    const channelElement = document.querySelector('#channel-name a') ||
                           document.querySelector('ytd-channel-name a') ||
                           document.querySelector('.ytd-video-owner-renderer a') ||
                           document.querySelector('[itemprop="author"] [itemprop="name"]');
    
    const channel = channelElement?.textContent?.trim() || 'Unknown Channel';
    
    // Get video duration
    const durationElement = document.querySelector('.ytp-time-duration') ||
                            document.querySelector('[itemprop="duration"]');
    
    let duration = durationElement?.textContent?.trim() || '--:--';
    
    // If duration is in ISO 8601 format (PT1H2M3S), convert it
    if (duration.startsWith('PT')) {
      duration = parseISODuration(duration);
    }
    
    // Get video ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    
    // Get thumbnail
    const thumbnail = videoId 
      ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      : '';
    
    return {
      title,
      channel,
      duration,
      thumbnail,
      videoId,
      url: window.location.href
    };
  } catch (error) {
    console.error('Error getting video info:', error);
    return null;
  }
}

// Parse ISO 8601 duration format (PT1H2M3S)
function parseISODuration(duration) {
  const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  
  if (!matches) return '--:--';
  
  const hours = parseInt(matches[1]) || 0;
  const minutes = parseInt(matches[2]) || 0;
  const seconds = parseInt(matches[3]) || 0;
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getVideoInfo') {
    const info = getVideoInfo();
    sendResponse(info);
  }
  return true;
});

// Optional: Add a floating download button to YouTube pages
function injectDownloadButton() {
  // Check if we're on a video page
  if (!window.location.pathname.includes('/watch')) return;
  
  // Check if button already exists
  if (document.getElementById('yt-audio-ripper-btn')) return;
  
  // Wait for the action buttons to be available
  const checkForActions = setInterval(() => {
    const actionsContainer = document.querySelector('#actions #actions-inner') ||
                             document.querySelector('#top-level-buttons-computed') ||
                             document.querySelector('ytd-menu-renderer');
    
    if (actionsContainer) {
      clearInterval(checkForActions);
      
      // Create download button
      const btn = document.createElement('button');
      btn.id = 'yt-audio-ripper-btn';
      btn.className = 'yt-audio-ripper-download-btn';
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3V16M12 16L7 11M12 16L17 11" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3 20H21" stroke-linecap="round"/>
        </svg>
        <span>MP3</span>
      `;
      
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Open extension popup (can't do directly, so show a message)
        chrome.runtime.sendMessage({ 
          action: 'quickDownload',
          videoInfo: getVideoInfo()
        });
        
        // Visual feedback
        btn.classList.add('clicked');
        setTimeout(() => btn.classList.remove('clicked'), 300);
      });
      
      // Insert button
      actionsContainer.insertBefore(btn, actionsContainer.firstChild);
    }
  }, 1000);
  
  // Stop checking after 10 seconds
  setTimeout(() => clearInterval(checkForActions), 10000);
}

// Run when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectDownloadButton);
} else {
  injectDownloadButton();
}

// Re-inject button when navigating between videos (YouTube is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    // Small delay to let YouTube update the page
    setTimeout(injectDownloadButton, 1500);
  }
}).observe(document.body, { subtree: true, childList: true });

