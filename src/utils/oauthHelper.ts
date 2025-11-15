import axios from 'axios';
import { UserOAuthToken } from '../types/database';

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string[];
}

const DISCORD_OAUTH_TOKEN_URL = 'https://discord.com/api/oauth2/token';

export class OAuthHelper {
  private static ensureCredentials(): { clientId: string; clientSecret: string } {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('DISCORD_CLIENT_ID ou DISCORD_CLIENT_SECRET manquant pour la gestion OAuth.');
    }
    return { clientId, clientSecret };
  }

  static needsRefresh(token: UserOAuthToken): boolean {
    return token.expiresAt.getTime() - Date.now() < 60000;
  }

  static async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    const { clientId, clientSecret } = this.ensureCredentials();
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    const response = await axios.post(DISCORD_OAUTH_TOKEN_URL, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const data = response.data;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresIn: data.expires_in ?? 3600,
      scope: typeof data.scope === 'string' ? data.scope.split(' ') : []
    };
  }
}

