import * as vscode from 'vscode';
import { google } from 'googleapis';
import { Track, Playlist } from '../types/playlist';

export class PlaylistProvider implements vscode.TreeDataProvider<PlaylistItem> {
    // Event emitter for refreshing the tree view
    private _onDidChangeTreeData = new vscode.EventEmitter<PlaylistItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private youtube: any;

    constructor(
        private context: vscode.ExtensionContext,
        private authClient: any
    ) {
        // Initialize YouTube API client
        this.youtube = google.youtube({
            version: 'v3',
            auth: authClient
        });
    }

    // Required by TreeDataProvider interface - returns the tree item
    getTreeItem(element: PlaylistItem): vscode.TreeItem {
        return element;
    }

    // Required by TreeDataProvider interface - returns children of an element
    async getChildren(element?: PlaylistItem): Promise<PlaylistItem[]> {
        try {
            if (!element) {
                // Root level - fetch playlists
                return await this.getPlaylists();
            } else {
                // Child level - fetch tracks in playlist
                return await this.getPlaylistTracks(element.id);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to fetch items: ${error.message}`);
            return [];
        }
    }

    // Fetch user's playlists from YouTube Music
    private async getPlaylists(): Promise<PlaylistItem[]> {
        try {
            const response = await this.youtube.playlists.list({
                part: ['snippet', 'contentDetails'],
                mine: true,
                maxResults: 50
            });

            return response.data.items.map((playlist: any) => {
                return new PlaylistItem(
                    playlist.snippet.title,
                    playlist.id,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    {
                        type: 'playlist',
                        trackCount: playlist.contentDetails.itemCount,
                        thumbnail: playlist.snippet.thumbnails.default.url
                    }
                );
            });
        } catch (error: any) {
            throw new Error(`Failed to fetch playlists: ${error.message}`);
        }
    }

    // Fetch tracks in a specific playlist
    private async getPlaylistTracks(playlistId: string): Promise<PlaylistItem[]> {
        try {
            const response = await this.youtube.playlistItems.list({
                part: ['snippet', 'contentDetails'],
                playlistId: playlistId,
                maxResults: 50
            });

            return response.data.items.map((item: any) => {
                return new PlaylistItem(
                    item.snippet.title,
                    item.contentDetails.videoId,
                    vscode.TreeItemCollapsibleState.None,
                    {
                        type: 'track',
                        artist: item.snippet.videoOwnerChannelTitle,
                        thumbnail: item.snippet.thumbnails.default.url,
                        duration: 0 // Duration requires additional API call
                    }
                );
            });
        } catch (error: any) {
            throw new Error(`Failed to fetch playlist tracks: ${error.message}`);
        }
    }

    // Refresh the tree view
    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    // Get track details for playback
    async getTrackDetails(trackId: string): Promise<Track> {
        try {
            const response = await this.youtube.videos.list({
                part: ['snippet', 'contentDetails'],
                id: trackId
            });

            const video = response.data.items[0];
            return {
                id: video.id,
                title: video.snippet.title,
                artist: video.snippet.channelTitle,
                duration: this.parseDuration(video.contentDetails.duration),
                thumbnail: video.snippet.thumbnails.default.url
            };
        } catch (error: any) {
            throw new Error(`Failed to fetch track details: ${error.message}`);
        }
    }

    // Convert YouTube duration format to seconds
    private parseDuration(duration: string): number {
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        const hours = (parseInt(match?.[1] ?? '0') || 0);
        const minutes = (parseInt(match?.[2] ?? '0') || 0);
        const seconds = (parseInt(match?.[3] ?? '0') || 0);
        return hours * 3600 + minutes * 60 + seconds;
    }
}

// Extended PlaylistItem class with additional features
class PlaylistItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        private readonly itemData: {
            type: 'playlist' | 'track';
            trackCount?: number;
            artist?: string;
            thumbnail: string;
            duration?: number;
        }
    ) {
        super(label, collapsibleState);

        // Set icon and description based on type
        if (itemData.type === 'playlist') {
            this.iconPath = new vscode.ThemeIcon('list-unordered');
            this.description = `${itemData.trackCount} tracks`;
            this.contextValue = 'playlist';
        } else {
            this.iconPath = new vscode.ThemeIcon('music');
            this.description = itemData.artist;
            this.contextValue = 'track';
        }

        // Add tooltip with detailed information
        this.tooltip = new vscode.MarkdownString();
        if (itemData.type === 'playlist') {
            this.tooltip.appendMarkdown(`**${label}**\n\n${itemData.trackCount} tracks`);
        } else {
            this.tooltip.appendMarkdown(`**${label}**\n\n${itemData.artist}`);
            if (itemData.duration) {
                this.tooltip.appendMarkdown(`\n\nDuration: ${this.formatDuration(itemData.duration)}`);
            }
        }

        // Add command for track items
        if (itemData.type === 'track') {
            this.command = {
                command: 'ytmusic.playTrack',
                title: 'Play Track',
                arguments: [this]
            };
        }
    }

    private formatDuration(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}
