import { InjectedServices } from '../../types';
import { ConnectionData, ConnectionType } from '../../types/connection.types';
import { InputConfig } from '../../types/input-config.types';

export function createOAuth2Connection(args: CreateOAuth2ConnectionArgs) {
  return {
    ...args,
    connectionType: 'oauth2' as ConnectionType,
  };
}

export type CreateOAuth2ConnectionArgs = {
  id: string;
  name: string;
  description: string;
  authorizeUrl: string;
  tokenUrl: string;
  getClientId: () => string | undefined;
  getClientSecret: () => string | undefined;
  /**
   * After the token exchange, we can call an API to get more information about the user.
   * Then we will store that information in the connection metadata.
   */
  afterTokenExchange?: (
    args: AfterTokenExchangeArgs,
  ) => Promise<AfterTokenExchangeResponse>;
  scopes: string[];
  /**
   * Default's to a comma.
   * Override the string to change the delimiter.
   */
  scopeDelimiter?: string;
  inputConfig?: InputConfig;
  authorizationMethod?: OAuth2AuthorizationMethod;
  pkce?: boolean;
  /**
   * If you need to add extra params to the authorize url add them here.
   */
  extraAuthParams?: Record<string, string>;
  /**
   * If you need to add extra heads to the authorize request add them here.
   */
  extraAuthHeaders?: Record<string, string>;
  /**
   * If you need to add extra params to the token url when refreshing
   */
  extraRefreshParams?: Record<string, string>;
  /**
   * By default we'll use process.env['NGROK_TUNNEL_URL'] with ngrok
   * But there are some platforms like microsoft that only allow one subdomain
   * and since prod is already using the api subdomain, we cant use the tunnel subdomain.
   * So we'll use localhost
   */
  redirectToLocalHostInDevelopment?: boolean;
};

export type AfterTokenExchangeArgs = {
  accessToken: ConnectionData['accessToken'];
  refreshToken: ConnectionData['refreshToken'];
  http: InjectedServices['http'];
  workspaceId: string;
};

export type AfterTokenExchangeResponse =
  | {
      [key: string]: any;
    }
  | undefined;

/**
 * Most APIs use the body to send the authorization token
 * but some use the header to pass the client id and secret.
 *
 * For example, the Notion API uses the header to pass the client id and secret
 */
export type OAuth2AuthorizationMethod = 'body' | 'header';
