export interface TokenInfo {
    access_token: string;
    refresh_token: string;
    scope: string;
    token_type: string;
    expiry_date: number;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    client?: any;
}