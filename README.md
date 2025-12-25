# YT Audio Ripper 🎵

A Chrome extension to download MP3 audio from YouTube videos using your own local server - no third-party APIs needed!

![Version](https://img.shields.io/badge/version-1.0.0-ff3366)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- 🎧 **One-Click Download** - Extract MP3 audio from any YouTube video
- 🎚️ **Quality Selection** - Choose between 128, 192, or 320 kbps
- 🔒 **Privacy-Focused** - Uses your own local server, no data sent to third parties
- 🎨 **Beautiful UI** - Modern, dark-themed interface with smooth animations
- 📺 **Video Info Display** - See thumbnail, title, channel, and duration
- ⚡ **Fast & Reliable** - Powered by yt-dlp, the best YouTube downloader

## Prerequisites

Before using this extension, you need:

1. **Python 3.8+** - [Download Python](https://www.python.org/downloads/)
2. **ffmpeg** - Required for audio conversion
   ```bash
   # macOS
   brew install ffmpeg
   
   # Ubuntu/Debian
   sudo apt install ffmpeg
   
   # Windows
   # Download from https://ffmpeg.org/download.html
   ```

## Installation

### 1. Set Up the Local Server

```bash
# Navigate to the server directory
cd yt-downloader/server

# Option A: Use the start script (macOS/Linux)
chmod +x start.sh
./start.sh

# Option B: Manual setup
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

The server will start on `http://localhost:5000`

### 2. Install the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `yt-downloader` folder (not the `server` folder)
5. Pin the extension for easy access

## Usage

1. **Start the local server** (keep it running in a terminal)
2. **Navigate to a YouTube video**
3. **Click the extension icon** in Chrome
4. **Select audio quality** (128, 192, or 320 kbps)
5. **Click "Download MP3"**
6. **Choose where to save** the file

## Project Structure

```
yt-downloader/
├── manifest.json       # Extension configuration
├── popup.html          # Extension popup UI
├── popup.css           # Popup styles
├── popup.js            # Popup logic
├── background.js       # Service worker
├── content.js          # YouTube page integration
├── content.css         # Injected button styles
├── icons/              # Extension icons
├── README.md           # This file
└── server/
    ├── server.py       # Flask API server
    ├── requirements.txt # Python dependencies
    ├── start.sh        # Start script
    └── downloads/      # Temporary download folder
```

## API Endpoints

The local server provides these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Check if server is running |
| `/api/info?v=VIDEO_ID` | GET | Get video information |
| `/api/download?v=VIDEO_ID&quality=192` | GET | Download video as MP3 |
| `/api/progress/VIDEO_ID` | GET | Get download progress |
| `/api/formats?v=VIDEO_ID` | GET | List available formats |

## Troubleshooting

### "Server not running" error
- Make sure the Python server is running: `cd server && python server.py`
- Check the terminal for any error messages

### Download fails
- Ensure `ffmpeg` is installed: `ffmpeg -version`
- Check if the video is available (not private/deleted)
- Some videos may be geo-restricted

### Extension not loading
- Make sure you loaded the correct folder (the one with `manifest.json`)
- Try clicking the refresh button on `chrome://extensions/`

### Audio quality
- Higher quality = larger file size
- 128 kbps: Good for speech/podcasts
- 192 kbps: Good balance for music
- 320 kbps: Best quality, largest files

## How It Works

1. **Extension** detects YouTube video and shows video info
2. **Extension** sends download request to local server
3. **Server** uses `yt-dlp` to download audio from YouTube
4. **Server** uses `ffmpeg` to convert to MP3
5. **Server** streams the MP3 back to the extension
6. **Chrome** saves the file to your chosen location

## Privacy & Legal

- ✅ All processing happens locally on your machine
- ✅ No data is sent to third-party servers
- ✅ Download history stored only in your browser
- ⚠️ Only download content you have the right to download
- ⚠️ Respect YouTube's Terms of Service

## License

MIT License - feel free to modify and distribute.

---

**Made with ❤️ for music lovers**
