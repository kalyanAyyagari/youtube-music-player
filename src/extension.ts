import * as vscode from 'vscode';
import { YouTubeAuthManager } from './auth/index';
import { MusicPlayerProvider } from './providers/musicPlayerProvider';
import { PlaylistProvider } from './providers/playlistProvider';

export function activate(context: vscode.ExtensionContext) {

	const authManager = new YouTubeAuthManager(context);
    // Initialize state
    let currentUser: any = undefined;
    
    // Register providers
    let playlistProvider:PlaylistProvider;
    const musicPlayerProvider = new MusicPlayerProvider(context);
    
    // Register views
    vscode.window.registerWebviewViewProvider('ytmusic-player', musicPlayerProvider);
    
    // Register commands
    let loginCommand = vscode.commands.registerCommand('ytmusic.login', async () => {
		try {
			const authResponse = await authManager.authenticate();
            
            if (authResponse.success) {
				currentUser = authResponse.client;
				playlistProvider = new PlaylistProvider(context,currentUser);
				vscode.window.registerTreeDataProvider('ytmusic-playlists', playlistProvider);
                vscode.window.showInformationMessage(authResponse.message);
                await playlistProvider.refresh();
            } else {
                vscode.window.showErrorMessage(authResponse.message);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Login failed: ${error.message}`);
        }
    });

	let playTrackCommand = vscode.commands.registerCommand('ytmusic.playTrack', async (item: any) => {
        try {
            const trackDetails = await playlistProvider.getTrackDetails(item.id);
            // Send track to music player
            // ... implementation depends on your music player provider
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to play track: ${error.message}`);
        }
    });


    context.subscriptions.push(loginCommand, playTrackCommand);
}
