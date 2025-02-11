import * as vscode from 'vscode';
import { google } from 'googleapis';
import { AuthServer } from './server';
import { TokenInfo, AuthResponse } from './types';

export class YouTubeAuthManager {
    private oauth2Client: any;
    private context: vscode.ExtensionContext;
    private static readonly TOKEN_KEY = 'youtube-music-token';
    private static readonly SCOPES = [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl'
    ];

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.initializeOAuthClient();
    }

    private initializeOAuthClient() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.YOUTUBE_CLIENT_ID,
            process.env.YOUTUBE_CLIENT_SECRET,
            'http://localhost:3000/callback'
        );
    }

    async authenticate(): Promise<AuthResponse> {
        try {
            // Check for existing token
            const existingToken = await this.getStoredToken();
            
            if (existingToken) {
                this.oauth2Client.setCredentials(existingToken);
                
                if (this.isTokenExpired(existingToken)) {
                    await this.refreshToken(existingToken);
                }
                
                return {
                    success: true,
                    message: 'Authenticated using stored token',
                    client: this.oauth2Client
                };
            }

            // Start new authentication flow
            const authServer = new AuthServer();
            
            // Generate authentication URL
            const authUrl = this.oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: YouTubeAuthManager.SCOPES,
                prompt: 'consent'
            });

            // Open browser for authentication
            await vscode.env.openExternal(vscode.Uri.parse(authUrl));

            // Wait for authentication code
            const code = await authServer.startServer();

            // Exchange code for tokens
            const { tokens } = await this.oauth2Client.getToken(code);
            
            // Store tokens
            await this.storeToken(tokens);
            
            // Set credentials
            this.oauth2Client.setCredentials(tokens);

            return {
                success: true,
                message: 'Authentication successful',
                client: this.oauth2Client
            };

        } catch (error: any) {
            return {
                success: false,
                message: `Authentication failed: ${error.message}`
            };
        }
    }

    private async getStoredToken(): Promise<TokenInfo | undefined> {
        try {
            const tokenString = await this.context.secrets.get(YouTubeAuthManager.TOKEN_KEY);
            return tokenString ? JSON.parse(tokenString) : undefined;
        } catch (error) {
            console.error('Error retrieving stored token:', error);
            return undefined;
        }
    }

    private async storeToken(tokens: TokenInfo): Promise<void> {
        try {
            await this.context.secrets.store(
                YouTubeAuthManager.TOKEN_KEY,
                JSON.stringify(tokens)
            );
        } catch (error: any) {
            throw new Error(`Failed to store token: ${error.message}`);
        }
    }

    private isTokenExpired(token: TokenInfo): boolean {
        return token.expiry_date ? Date.now() >= token.expiry_date : true;
    }

    private async refreshToken(existingToken: TokenInfo): Promise<void> {
        try {
            this.oauth2Client.setCredentials({
                refresh_token: existingToken.refresh_token
            });

            const { credentials } = await this.oauth2Client.refreshAccessToken();
            await this.storeToken(credentials);
        } catch (error: any) {
            throw new Error(`Token refresh failed: ${error.message}`);
        }
    }

    async logout(): Promise<void> {
        try {
            await this.context.secrets.delete(YouTubeAuthManager.TOKEN_KEY);
            this.initializeOAuthClient();
        } catch (error: any) {
            throw new Error(`Logout failed: ${error.message}`);
        }
    }
}