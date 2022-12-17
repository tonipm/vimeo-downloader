# Vimeo Downloader

Script to download Vimeo videos.

Instructions:

1. Open the browser developer console on the tab with the video. Filter `master.json` on _Network_ dev tab.
2. Start the video.
3. Copy the full URL from `master.json`.
4. Run the script as described below.

Two arguments are required:

1. Output filename
2. `master.json` URL

Example:

```bash
node index.js VIDEO_NAME https://URL/master.json
```

---

Make an alias to use it everywhere.

```bash
mkdir -p $HOME/scripts/ && cp index.js $HOME/scripts/vimeo-downloader.js

# Add this line in your ~/.zshrc, ~/.bashrc or whatever you use
alias vimeo-downloader="node $HOME/scripts/vimeo-downloader.js $1 $2"
```
