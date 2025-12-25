#!/usr/bin/env python3
"""
YT Audio Ripper - Local Server
A simple Flask server that downloads YouTube audio using yt-dlp
"""

import os
import re
import uuid
import threading
from pathlib import Path
from flask import Flask, request, jsonify, send_file, after_this_request
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app)  # Enable CORS for Chrome extension

# Configuration
DOWNLOAD_DIR = Path(__file__).parent / 'downloads'
DOWNLOAD_DIR.mkdir(exist_ok=True)

# Store download progress
downloads = {}


def sanitize_filename(title):
    """Remove invalid characters from filename"""
    # Remove invalid characters
    title = re.sub(r'[<>:"/\\|?*]', '', title)
    # Replace multiple spaces with single space
    title = re.sub(r'\s+', ' ', title)
    # Limit length
    return title.strip()[:200]


def progress_hook(d):
    """Track download progress"""
    if d['status'] == 'downloading':
        download_id = d.get('info_dict', {}).get('id', 'unknown')
        total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
        downloaded = d.get('downloaded_bytes', 0)
        
        if total > 0:
            percent = int((downloaded / total) * 100)
            downloads[download_id] = {
                'status': 'downloading',
                'percent': percent,
                'speed': d.get('speed', 0),
                'eta': d.get('eta', 0)
            }
    elif d['status'] == 'finished':
        download_id = d.get('info_dict', {}).get('id', 'unknown')
        downloads[download_id] = {
            'status': 'processing',
            'percent': 100,
            'message': 'Converting to MP3...'
        }


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'YT Audio Ripper server is running'})


@app.route('/api/info', methods=['GET'])
def get_video_info():
    """Get video information without downloading"""
    video_id = request.args.get('v')
    url = request.args.get('url')
    
    if not video_id and not url:
        return jsonify({'error': 'Missing video ID or URL'}), 400
    
    if video_id:
        url = f'https://www.youtube.com/watch?v={video_id}'
    
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            return jsonify({
                'success': True,
                'info': {
                    'id': info.get('id'),
                    'title': info.get('title'),
                    'channel': info.get('uploader') or info.get('channel'),
                    'duration': info.get('duration'),
                    'duration_string': info.get('duration_string'),
                    'thumbnail': info.get('thumbnail'),
                    'view_count': info.get('view_count'),
                }
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/download', methods=['GET', 'POST'])
def download_audio():
    """Download video as MP3"""
    if request.method == 'POST':
        data = request.json or {}
        video_id = data.get('videoId') or data.get('v')
        quality = data.get('quality', 192)
    else:
        video_id = request.args.get('v') or request.args.get('videoId')
        quality = request.args.get('quality', 192, type=int)
    
    if not video_id:
        return jsonify({'error': 'Missing video ID'}), 400
    
    url = f'https://www.youtube.com/watch?v={video_id}'
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())[:8]
    output_template = str(DOWNLOAD_DIR / f'{unique_id}_%(title)s.%(ext)s')
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': str(quality),
        }],
        'outtmpl': output_template,
        'quiet': True,
        'no_warnings': True,
        'progress_hooks': [progress_hook],
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract info first to get the title
            info = ydl.extract_info(url, download=False)
            video_title = info.get('title', 'audio')
            
            # Update progress
            downloads[video_id] = {'status': 'starting', 'percent': 0}
            
            # Download
            ydl.download([url])
            
            # Find the downloaded file
            sanitized_title = sanitize_filename(video_title)
            # yt-dlp creates the file with the template, find it
            mp3_files = list(DOWNLOAD_DIR.glob(f'{unique_id}_*.mp3'))
            
            if not mp3_files:
                return jsonify({'error': 'Download failed - file not found'}), 500
            
            mp3_path = mp3_files[0]
            
            # Clean up progress tracking
            downloads[video_id] = {'status': 'complete', 'percent': 100}
            
            @after_this_request
            def cleanup(response):
                """Delete the file after sending"""
                def remove_file():
                    try:
                        if mp3_path.exists():
                            mp3_path.unlink()
                    except Exception as e:
                        print(f'Error cleaning up file: {e}')
                
                # Delay cleanup slightly to ensure file is sent
                timer = threading.Timer(5.0, remove_file)
                timer.start()
                return response
            
            # Send the file
            download_name = f'{sanitized_title}.mp3'
            return send_file(
                mp3_path,
                as_attachment=True,
                download_name=download_name,
                mimetype='audio/mpeg'
            )
            
    except yt_dlp.utils.DownloadError as e:
        error_msg = str(e)
        if 'Video unavailable' in error_msg:
            return jsonify({'error': 'Video is unavailable or private'}), 404
        elif 'age' in error_msg.lower():
            return jsonify({'error': 'Age-restricted video - cannot download'}), 403
        else:
            return jsonify({'error': f'Download error: {error_msg}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/progress/<video_id>', methods=['GET'])
def get_progress(video_id):
    """Get download progress for a video"""
    progress = downloads.get(video_id, {'status': 'unknown', 'percent': 0})
    return jsonify(progress)


@app.route('/api/formats', methods=['GET'])
def get_formats():
    """Get available audio formats for a video"""
    video_id = request.args.get('v')
    
    if not video_id:
        return jsonify({'error': 'Missing video ID'}), 400
    
    url = f'https://www.youtube.com/watch?v={video_id}'
    
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            audio_formats = []
            for f in info.get('formats', []):
                if f.get('acodec') != 'none' and f.get('vcodec') == 'none':
                    audio_formats.append({
                        'format_id': f.get('format_id'),
                        'ext': f.get('ext'),
                        'abr': f.get('abr'),
                        'acodec': f.get('acodec'),
                        'filesize': f.get('filesize'),
                    })
            
            return jsonify({
                'success': True,
                'formats': audio_formats
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print('=' * 50)
    print('🎵 YT Audio Ripper Server')
    print('=' * 50)
    print(f'📁 Download directory: {DOWNLOAD_DIR}')
    print('🌐 Starting server on http://localhost:5000')
    print('=' * 50)
    
    app.run(host='127.0.0.1', port=5000, debug=True)

