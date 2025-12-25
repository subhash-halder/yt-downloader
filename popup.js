// DOM Elements
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const videoCard = document.getElementById('video-card');
const videoThumb = document.getElementById('video-thumb');
const videoDuration = document.getElementById('video-duration');
const videoTitle = document.getElementById('video-title');
const videoChannel = document.getElementById('video-channel');
const qualitySection = document.getElementById('quality-section');
const qualityBtns = document.querySelectorAll('.quality-btn');
const downloadBtn = document.getElementById('download-btn');
const btnContent = downloadBtn.querySelector('.btn-content');
const btnLoader = downloadBtn.querySelector('.btn-loader');
const progressSection = document.getElementById('progress-section');
const progressFill = document.getElementById('progress-fill');
const progressStatus = document.getElementById('progress-status');
const progressPercent = document.getElementById('progress-percent');
const progressText = document.getElementById('progress-text');
const errorSection = document.getElementById('error-section');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const notYoutube = document.getElementById('not-youtube');

// Configuration
const SERVER_URL = 'http://127.0.0.1:5000/yt-downloader';

// State
let currentVideoId = null;
let currentVideoInfo = null;
let selectedQuality = 192;
let isDownloading = false;
let currentTab = null;
let serverAvailable = false;

// Initialize popup
async function init() {
  try {
    // Check if server is running
    await checkServer();
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    
    // Check if it's a YouTube video page
    if (tab.url && isYouTubeVideoUrl(tab.url)) {
      currentVideoId = extractVideoId(tab.url);
      
      if (currentVideoId) {
        await fetchVideoInfo(currentVideoId, tab);
      } else {
        showNotYouTube();
      }
    } else {
      showNotYouTube();
    }
  } catch (error) {
    console.error('Init error:', error);
    showError('Failed to initialize extension');
  }
}

// Check if local server is running
async function checkServer() {
  try {
    const response = await fetch(`${SERVER_URL}/api/health`, {
      method: 'GET',
      mode: 'cors',
    });
    
    if (response.ok) {
      serverAvailable = true;
      console.log('Local server is running');
    } else {
      serverAvailable = false;
    }
  } catch (error) {
    serverAvailable = false;
    console.log('Local server not available, will show instructions');
  }
}

// Check if URL is a YouTube video
function isYouTubeVideoUrl(url) {
  return url.includes('youtube.com/watch') || url.includes('youtu.be/');
}

// Extract video ID from URL
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Fetch video information
async function fetchVideoInfo(videoId, tab) {
  updateStatus('Fetching video info...', 'loading');
  
  // Try to get info from local server first (more accurate)
  if (serverAvailable) {
    try {
      const response = await fetch(`${SERVER_URL}/api/info?v=${videoId}`);
      const data = await response.json();
      
      if (data.success && data.info) {
        currentVideoInfo = {
          title: data.info.title,
          channel: data.info.channel,
          thumbnail: data.info.thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          duration: formatDuration(data.info.duration),
          videoId: videoId
        };
        displayVideoInfo(currentVideoInfo);
        updateStatus('Ready to download', 'ready');
        return;
      }
    } catch (error) {
      console.log('Server info fetch failed, using fallback');
    }
  }
  
  // Try content script
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' });
    if (response && response.title) {
      currentVideoInfo = response;
      displayVideoInfo(response);
      updateStatus(serverAvailable ? 'Ready to download' : 'Server not running', serverAvailable ? 'ready' : 'error');
      return;
    }
  } catch (error) {
    console.log('Content script not responding');
  }
  
  // Fallback: Extract from tab title
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  let title = tab.title || 'YouTube Video';
  
  if (title.endsWith(' - YouTube')) {
    title = title.slice(0, -10);
  }
  
  currentVideoInfo = {
    title: title,
    channel: 'YouTube',
    thumbnail: thumbnailUrl,
    duration: '--:--',
    videoId: videoId
  };
  
  displayVideoInfo(currentVideoInfo);
  
  if (!serverAvailable) {
    updateStatus('Start the server first', 'error');
    showServerInstructions();
  } else {
    updateStatus('Ready to download', 'ready');
  }
}

// Format duration from seconds
function formatDuration(seconds) {
  if (!seconds) return '--:--';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

// Display video information in the popup
function displayVideoInfo(info) {
  videoThumb.src = info.thumbnail;
  videoTitle.textContent = info.title;
  videoChannel.textContent = info.channel;
  videoDuration.textContent = info.duration;
  
  videoCard.classList.remove('hidden');
  qualitySection.classList.remove('hidden');
  downloadBtn.classList.remove('hidden');
}

// Update status indicator
function updateStatus(text, state = 'loading') {
  statusText.textContent = text;
  statusIndicator.className = 'status-indicator';
  
  if (state === 'ready') {
    statusIndicator.classList.add('ready');
  } else if (state === 'error') {
    statusIndicator.classList.add('error');
  }
}

// Show not on YouTube message
function showNotYouTube() {
  document.getElementById('status-section').classList.add('hidden');
  notYoutube.classList.remove('hidden');
}

// Show server instructions
function showServerInstructions() {
  errorMessage.innerHTML = `
    <strong>Local server not running!</strong><br><br>
    Start the server with:<br>
    <code style="background:#1a1a25;padding:4px 8px;border-radius:4px;display:block;margin-top:8px;">
      cd server && python server.py
    </code>
  `;
  errorSection.classList.remove('hidden');
  retryBtn.textContent = 'Retry Connection';
}

// Show error message
function showError(message) {
  updateStatus('Error occurred', 'error');
  errorMessage.textContent = message;
  errorSection.classList.remove('hidden');
  progressSection.classList.add('hidden');
  resetDownloadButton();
}

// Hide error message
function hideError() {
  errorSection.classList.add('hidden');
  retryBtn.textContent = 'Try Again';
}

// Start download via local server
async function startDownload() {
  if (isDownloading || !currentVideoId) return;
  
  // Check server first
  await checkServer();
  
  if (!serverAvailable) {
    showServerInstructions();
    return;
  }
  
  isDownloading = true;
  hideError();
  
  // Update button state
  btnContent.classList.add('hidden');
  btnLoader.classList.remove('hidden');
  downloadBtn.disabled = true;
  
  // Show progress section
  progressSection.classList.remove('hidden');
  updateProgress(10, 'Connecting to server...');
  
  try {
    const videoId = currentVideoId;
    const quality = selectedQuality;
    const title = currentVideoInfo?.title || 'YouTube Video';
    
    // Sanitize filename
    const sanitizedTitle = title
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
    
    updateProgress(20, 'Starting download...');
    
    // Start polling for progress
    const progressInterval = startProgressPolling(videoId);
    
    // Request download from local server
    const downloadUrl = `${SERVER_URL}/api/download?v=${videoId}&quality=${quality}`;
    
    // Use Chrome downloads API to download from our server
    const downloadId = await chrome.downloads.download({
      url: downloadUrl,
      filename: `${sanitizedTitle}.mp3`,
      saveAs: true
    });
    
    if (!downloadId) {
      throw new Error('Failed to start download');
    }
    
    // Monitor the Chrome download
    monitorDownload(downloadId, progressInterval);
    
  } catch (error) {
    console.error('Download error:', error);
    showError(error.message || 'Failed to download. Is the server running?');
    isDownloading = false;
  }
}

// Poll server for download progress
function startProgressPolling(videoId) {
  let lastPercent = 20;
  
  const interval = setInterval(async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/progress/${videoId}`);
      const data = await response.json();
      
      if (data.status === 'downloading') {
        const adjustedPercent = 20 + (data.percent * 0.5); // 20-70%
        if (adjustedPercent > lastPercent) {
          lastPercent = adjustedPercent;
          updateProgress(Math.round(adjustedPercent), 'Downloading from YouTube...');
        }
      } else if (data.status === 'processing') {
        updateProgress(75, 'Converting to MP3...');
      }
    } catch (error) {
      // Server might be busy, ignore
    }
  }, 500);
  
  return interval;
}

// Monitor Chrome download progress
function monitorDownload(downloadId, progressInterval) {
  const checkInterval = setInterval(async () => {
    try {
      const [item] = await chrome.downloads.search({ id: downloadId });
      
      if (!item) {
        clearInterval(checkInterval);
        clearInterval(progressInterval);
        showError('Download not found');
        isDownloading = false;
        return;
      }
      
      if (item.state === 'complete') {
        clearInterval(checkInterval);
        clearInterval(progressInterval);
        updateProgress(100, 'Download complete!');
        
        // Save to history
        saveToHistory({
          videoId: currentVideoId,
          title: currentVideoInfo?.title || 'YouTube Video',
          quality: selectedQuality,
          timestamp: Date.now()
        });
        
        setTimeout(() => {
          resetDownloadButton();
          progressSection.classList.add('hidden');
        }, 2000);
        
        isDownloading = false;
        
      } else if (item.state === 'interrupted') {
        clearInterval(checkInterval);
        clearInterval(progressInterval);
        
        let errorMsg = 'Download was interrupted';
        if (item.error === 'SERVER_FAILED') {
          errorMsg = 'Server error - check if video is available';
        }
        
        showError(errorMsg);
        isDownloading = false;
        
      } else if (item.state === 'in_progress') {
        // File is being transferred from server
        if (item.bytesReceived && item.totalBytes && item.totalBytes > 0) {
          const percent = 75 + Math.round((item.bytesReceived / item.totalBytes) * 25);
          updateProgress(Math.min(percent, 99), 'Saving file...');
        } else {
          updateProgress(80, 'Processing...');
        }
      }
    } catch (error) {
      // Ignore errors during polling
    }
  }, 300);
  
  // Timeout after 10 minutes (for long videos)
  setTimeout(() => {
    clearInterval(checkInterval);
    clearInterval(progressInterval);
    if (isDownloading) {
      showError('Download timeout - please try again');
      isDownloading = false;
    }
  }, 600000);
}

// Save to local history
async function saveToHistory(item) {
  try {
    const result = await chrome.storage.local.get('downloadHistory');
    const history = result.downloadHistory || [];
    
    history.unshift(item);
    
    if (history.length > 50) {
      history.pop();
    }
    
    await chrome.storage.local.set({ downloadHistory: history });
  } catch (error) {
    console.error('Failed to save history:', error);
  }
}

// Update progress
function updateProgress(percent, status) {
  progressFill.style.width = `${percent}%`;
  progressPercent.textContent = `${percent}%`;
  progressStatus.textContent = status;
  progressText.textContent = status;
}

// Reset download button
function resetDownloadButton() {
  btnContent.classList.remove('hidden');
  btnLoader.classList.add('hidden');
  downloadBtn.disabled = false;
  isDownloading = false;
}

// Quality button click handler
qualityBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    qualityBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedQuality = parseInt(btn.dataset.quality);
  });
});

// Download button click handler
downloadBtn.addEventListener('click', startDownload);

// Retry button click handler
retryBtn.addEventListener('click', async () => {
  hideError();
  await checkServer();
  if (serverAvailable) {
    startDownload();
  } else {
    showServerInstructions();
  }
});

// Initialize when popup opens
init();
