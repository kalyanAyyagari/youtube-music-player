import * as vscode from 'vscode';

interface Track {
    id: string;
    title: string;
    artist: string;
    duration: number;
    thumbnail: string;
}

export class MusicPlayerProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ytmusic-player';
    private _view?: vscode.WebviewView;
    private currentTrack?: Track;
    private isPlaying: boolean = false;

    constructor(private readonly context: vscode.ExtensionContext) {}

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        // Configure webview
        webviewView.webview.options = {
            enableScripts: true,  // Allow JavaScript in webview
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'media')  // Allow loading resources from media folder
            ]
        };

        // Set initial HTML
        webviewView.webview.html = this.getPlayerHtml();

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'play':
                    await this.handlePlay();
                    break;
                    
                case 'pause':
                    await this.handlePause();
                    break;
                    
                case 'next':
                    await this.handleNext();
                    break;
                    
                case 'previous':
                    await this.handlePrevious();
                    break;
                    
                case 'seekTo':
                    await this.handleSeek(message.position);
                    break;
                    
                case 'volumeChange':
                    await this.handleVolumeChange(message.volume);
                    break;
            }
        });
    }

    private async handlePlay() {
        if (!this.currentTrack) {
            vscode.window.showInformationMessage('No track selected');
            return;
        }
        
        this.isPlaying = true;
        await this.updatePlayerState();
        // Implement actual playback logic here
    }

    private async handlePause() {
        this.isPlaying = false;
        await this.updatePlayerState();
        // Implement actual pause logic here
    }

    private async handleNext() {
        // Implement next track logic
        await this.updatePlayerState();
    }

    private async handlePrevious() {
        // Implement previous track logic
        await this.updatePlayerState();
    }

    private async handleSeek(position: number) {
        // Implement seek logic
        await this.updatePlayerState();
    }

    private async handleVolumeChange(volume: number) {
        // Implement volume change logic
        await this.updatePlayerState();
    }

    private async updatePlayerState() {
        if (!this._view) {
            return;
        }

        await this._view.webview.postMessage({
            type: 'updatePlayerState',
            data: {
                currentTrack: this.currentTrack,
                isPlaying: this.isPlaying
            }
        });
    }

    public async setTrack(track: Track) {
        this.currentTrack = track;
        await this.updatePlayerState();
    }

    private getPlayerHtml() {
        // Get path to style and script resources
        const styleUri = this.getResourceUri('styles.css');
        const scriptUri = this.getResourceUri('player.js');
        const codiconsUri = this.getResourceUri('codicons.css');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${codiconsUri}" rel="stylesheet" />
                <link href="${styleUri}" rel="stylesheet">
                <title>YouTube Music Player</title>
            </head>
            <body>
                <div class="player-container">
                    <div class="track-info">
                        <img id="thumbnail" src="" alt="Album Art" class="thumbnail">
                        <div class="track-details">
                            <h3 id="track-title">No track selected</h3>
                            <p id="track-artist"></p>
                        </div>
                    </div>
                    
                    <div class="progress-bar">
                        <span id="current-time">0:00</span>
                        <div class="progress-bar-container">
                            <div id="progress" class="progress"></div>
                        </div>
                        <span id="duration">0:00</span>
                    </div>
                    
                    <div class="player-controls">
                        <button id="previous" class="control-button">
                            <i class="codicon codicon-chevron-left"></i>
                        </button>
                        <button id="play" class="control-button primary">
                            <i class="codicon codicon-play"></i>
                        </button>
                        <button id="next" class="control-button">
                            <i class="codicon codicon-chevron-right"></i>
                        </button>
                    </div>
                    
                    <div class="volume-control">
                        <i class="codicon codicon-unmute"></i>
                        <input type="range" id="volume" min="0" max="100" value="100">
                    </div>
                </div>
                <script src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }

    private getResourceUri(filename: string): vscode.Uri {
        return this._view!.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', filename)
        );
    }
}
