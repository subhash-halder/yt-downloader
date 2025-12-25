#!/bin/bash
# Start script for YT Audio Ripper Server

cd "$(dirname "$0")"

echo "🎵 YT Audio Ripper Server"
echo "========================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  ffmpeg is not installed. Audio conversion may fail."
    echo "   Install with: brew install ffmpeg"
    echo ""
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -q -r requirements.txt

# Start server
echo ""
echo "🚀 Starting server on http://localhost:5000"
echo "   Press Ctrl+C to stop"
echo ""
python server.py

