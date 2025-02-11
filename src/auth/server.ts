import express from 'express';
import { Server } from 'http';

export class AuthServer {
    private server: Server | null = null;
    private authCode: string | null = null;

    async startServer(): Promise<string> {
        return new Promise((resolve, reject) => {
            const app = express();
            
            app.get('/callback', (req, res) => {
                const code = req.query.code as string;
                
                if (code) {
                    this.authCode = code;
                    res.send(`
                        <html>
                            <body>
                                <h1>Authentication Successful!</h1>
                                <p>You can close this window and return to VS Code.</p>
                                <script>window.close();</script>
                            </body>
                        </html>
                    `);
                    
                    this.stopServer();
                    resolve(code);
                } else {
                    reject(new Error('No authorization code received'));
                }
            });

            this.server = app.listen(3000, () => {
                console.log('Auth server running on port 3000');
            });

            // Timeout after 5 minutes
            setTimeout(() => {
                this.stopServer();
                reject(new Error('Authentication timed out'));
            }, 300000);
        });
    }

    stopServer() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}