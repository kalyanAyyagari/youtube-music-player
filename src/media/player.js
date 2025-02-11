(function() {
    // Get VS Code webview API
    const vscode = acquireVsCodeApi();
    
    // DOM Elements
    const playButton = document.getElementById('play');
    const previousButton = document.getElementById('previous');
    const nextButton = document.getElementById('next');
    const volumeSlider = document.getElementById('volume');
    const progressBar = document.getElementById('progress');
    const currentTimeSpan = document.getElementById('current-time');
    const durationSpan = document.getElementById('duration');
    
    // State
    let isPlaying = false;
    let currentTrack = null;
    
    // Event Listeners
    playButton.addEventListener('click', () => {
        vscode.postMessage({
            command: isPlaying ? 'pause' : 'play'
        });
    });
    
    previousButton.addEventListener('click', () => {
        vscode.postMessage({ command: 'previous' });
    });
    
    nextButton.addEventListener('click', () => {
        vscode.postMessage({ command: 'next' });
    });
    
    volumeSlider.addEventListener('input', (e) => {
        vscode.postMessage({
            command: 'volumeChange',
            volume: parseInt(e.target.value)
        });
    });
    
    progressBar.parentElement.addEventListener('click', (e) => {
        const rect = progressBar.parentElement.getBoundingClientRect();
        const position = (e.clientX - rect.left) / rect.width;
        vscode.postMessage({
            command: 'seekTo',
            position: position
        });
    });
    
    // Handle messages from extension
    window.addEventListener('message', (event) => {
        const message = event.data;
        
        switch (message.type) {
            case 'updatePlayerState':
                updatePlayerState(message.data);
                break;
        }
    });
    
    function updatePlayerState(state) {
        isPlaying = state.isPlaying;
        currentTrack = state.currentTrack;
        
        // Update UI
        playButton.querySelector('i').className = 
            `codicon codicon-${isPlaying ? 'pause' : 'play'}`;
            
        if (currentTrack) {
            document.getElementById('track-title').textContent = currentTrack.title;
            document.getElementById('track-artist').textContent = currentTrack.artist;
            document.getElementById('thumbnail').src = currentTrack.thumbnail;
            durationSpan.textContent = formatTime(currentTrack.duration);
        }
    }
    
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
})();