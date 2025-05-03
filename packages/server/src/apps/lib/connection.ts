import {
  AfterTokenExchangeArgs,
  AfterTokenExchangeResponse,
  InputConfig,
} from '@lecca-io/toolkit';
import { BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';

import { ServerConfig } from '../../config/server.config';

import { App } from './app';

export class Connection {
  constructor(args: ConnectionConstructorArgs) {
    this.app = args.app;
    this.id = args.id;
    this.name = args.name;
    this.description = args.description;
    this.inputConfig = args.inputConfig;
    this.connectionType = args.connectionType;
  }

  app: App;
  id: string;
  name: string;
  description: string;
  inputConfig: InputConfig;
  connectionType: ConnectionType;

  async connectApp(args: {
    workspaceId: string;
    configValue: any;
    res: Response;
    req: Request;
  }) {
    switch (this.connectionType) {
      case 'apiKey':
        return await (this as unknown as ApiKeyConnection).connectApiKeyApp(
          args,
        );
      case 'basic':
        return await (
          this as unknown as BasicAuthConnection
        ).connectBasicAuthApp(args);
      case 'keyPair':
        return await (this as unknown as KeyPairConnection).connectKeyPairApp(
          args,
        );
      case 'oauth2':
        return await (this as unknown as OAuth2Connection).sendAuthorizeUrl(
          args,
        );
    }
  }

  hasValidServerConfig() {
    switch (this.connectionType) {
      case 'apiKey':
        return true;
      case 'basic':
        return true;
      case 'keyPair':
        return true;
      case 'oauth2': {
        const connection = this as unknown as OAuth2Connection;
        // If the connection is an OAuth2 connection, check if the client ID and secret are set
        // If they are not set, the ServerConfig is not configured with the necessary values
        // to make this a valid connection.
        return !!connection.clientId && !!connection.clientSecret;
      }
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      inputConfig: (this.inputConfig ?? []).map((c) => c),
      connectionType: this.connectionType,
      valid: this.hasValidServerConfig(),
    };
  }
}

export class OAuth2Connection extends Connection {
  constructor(args: OAuth2ConnectionConstructorArgs) {
    super(args);

    this.authorizeUrl = args.authorizeUrl;
    this.tokenUrl = args.tokenUrl;
    this.clientId = args.clientId;
    this.clientSecret = args.clientSecret;
    this.scopes = args.scopes || [];
    this.scopeDelimiter = args.scopeDelimiter || ',';
    this.authorizationMethod = args.authorizationMethod || 'body';
    this.grantType = args.grantType || 'authorization_code';
    this.redirectToLocalHostInDevelopment =
      args.redirectToLocalHostInDevelopment ?? false;
    this.extraAuthParams = args.extraAuthParams || null;
    this.extraRefreshParams = args.extraRefreshParams || null;
    this.extraAuthHeaders = args.extraAuthHeaders || null;
    this.pkce = args.pkce || false;

    if (args.afterTokenExchange) {
      this.afterTokenExchange = args.afterTokenExchange;
    }

    this.connectionType = 'oauth2';
  }

  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  scopeDelimiter: string;

  /**
   * Most APIs use the body to send the authorization token
   * but some use the header to pass the client id and secret.
   *
   * For example, the Notion API uses the header to pass the client id and secret
   */
  authorizationMethod: OAuth2AuthorizationMethod;

  grantType: OAuth2GrantType;

  /**
   * By default we'll use ServerConfig.NGROK_TUNNEL_URL with ngrok
   * But there are some platforms like microsoft that only allow one subdomain
   * and since prod is already using the api subdomain, we cont use the tunnel subdomain.
   * So we'll use localhost
   */
  redirectToLocalHostInDevelopment: boolean;

  /**
   * If you need to add extra params to the authorize url add them here.
   */
  extraAuthParams: Record<string, string> | null;

  /**
   * If you need to add extra params to the refresh token url add them here
   */
  extraRefreshParams: Record<string, string> | null;

  /**
   * If you need to add extra heads to the authorize request add them here.
   */
  extraAuthHeaders: Record<string, string> | null;

  pkce: boolean;

  afterTokenExchange?: (
    args: AfterTokenExchangeArgs,
  ) => Promise<AfterTokenExchangeResponse>;

  async generateAuthorizeUrl(args: GenerateAuthorizeUrlArgs): Promise<string> {
    if (ServerConfig.ENVIRONMENT === 'development') {
      if (!ServerConfig.NGROK_TUNNEL_URL) {
        throw new Error(
          'NGROK_TUNNEL_URL environment variable is required for OAuth2 connections in development. This is because most OAuth2 providers require a public URL for the callback, not localhost.',
        );
      }
    }

    const statePayload: OAuth2CallbackState = {
      name: args.configValue?.name,
      appId: this.app.id,
      connectionId: this.id,
      description: args.configValue?.description,
      workspaceId: args.workspaceId,
      // projectId: args.configValue?.projectId,
    };

    // Create a URL object from this.authUrl() to handle possible existing query params
    const authorizeUrl = new URL(this.authorizeUrl);
    const params = authorizeUrl.searchParams;

    if (this.pkce) {
      const codeChallenge = Date.now().toString();

      statePayload.codeVerifier = codeChallenge;

      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'plain');
    }

    const encryptedPayload = this.#encryptCallbackState(statePayload);
    const state = JSON.stringify(encryptedPayload);

    const scopes = this.scopes;

    // Add required query parameters
    params.set('client_id', this.clientId);
    if (scopes.length) {
      params.set('scope', scopes.join(this.scopeDelimiter));
    }
    params.set('state', state);
    params.set('response_type', 'code');
    params.set(
      'redirect_uri',
      this.redirectToLocalHostInDevelopment
        ? this.app.redirectUrlLocalHostInDevelopment
        : this.app.redirectUrlNgrokTunnelInDevelopment,
    );

    const extraParams = this.extraAuthParams;
    if (extraParams && typeof extraParams === 'object') {
      // Append each extra param to the URL's search parameters
      Object.entries(extraParams).forEach(([key, value]) => {
        params.set(key, value);
      });
    }

    return authorizeUrl.toString(); // Return the final constructed URL
  }

  async handleCallback(args: {
    res: Response;
    req: Request;
  }): Promise<unknown> {
    const code = args.req.query.code as string;

    let stateToken: string | undefined;

    try {
      stateToken = JSON.parse(
        this.#decodeCallbackState(args.req.query.state as string),
      );
    } catch {
      stateToken = this.#decodeCallbackState(args.req.query.state as string);
    }

    const state = this.#decryptCallbackState(stateToken);
    const url = this.tokenUrl;
    const data = new URLSearchParams();

    data.append('grant_type', this.grantType);
    data.append(
      'redirect_uri',
      this.redirectToLocalHostInDevelopment
        ? this.app.redirectUrlLocalHostInDevelopment
        : this.app.redirectUrlNgrokTunnelInDevelopment,
    );
    data.append('code', code);

    if (this.pkce && state.codeVerifier) {
      data.append('code_verifier', state.codeVerifier);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...this.extraAuthHeaders,
    };

    if (this.authorizationMethod === 'header') {
      headers['Authorization'] = `Basic ${Buffer.from(
        `${this.clientId}:${this.clientSecret}`,
      ).toString('base64')}`;
    } else if (this.authorizationMethod === 'body') {
      data.append('client_id', this.clientId);
      data.append('client_secret', this.clientSecret);
    } else {
      throw new Error(
        `Invalid authorization method: ${this.authorizationMethod}`,
      );
    }

    const result = await this.app.http.request({
      method: 'POST',
      url,
      data,
      headers,
      workspaceId: undefined, //We could track when they authenticate, but not gonna worry about this now
    });

    let tokenData = result.data;

    if (
      typeof result.data === 'string' &&
      result.data.includes('access_token=')
    ) {
      // Handle GitHub's URL-encoded response format
      // There may be other auth flows that return a string.
      const params = new URLSearchParams(result.data);
      tokenData = {};
      for (const [key, value] of params.entries()) {
        tokenData[key] = value;
      }
    }

    const { access_token, refresh_token, ...metadata } = tokenData;

    if (access_token) {
      // If there's an afterTokenExchange function, call it to get additional metadata
      if (this.afterTokenExchange) {
        try {
          const additionalMetadata = await this.afterTokenExchange({
            accessToken: access_token,
            refreshToken: refresh_token,
            http: this.app.http,
            workspaceId: state.workspaceId,
          });

          // Merge the additional metadata with the existing metadata
          if (additionalMetadata) {
            Object.assign(metadata, additionalMetadata);
          }
        } catch (error) {
          console.error('Error in afterTokenExchange:', error);
          // Continue even if afterTokenExchange fails? Or should we throw an error for the user?
          // Currently, if it fails some webhook events may not be sent because we need that metadata.
        }
      }

      return await this.connectOAuth2App({
        res: args.res,
        state,
        tokens: {
          accessToken: access_token,
          refreshToken: refresh_token,
        },
        metadata: metadata,
      });
    } else {
      throw new BadRequestException(
        `Could not connect to app: ${this.app.name}`,
      );
    }
  }

  async refreshAccessToken(args: {
    connection: {
      id: string;
      refreshToken: string;
    };
    workspaceId: string;
  }): Promise<void> {
    if (!args.connection.refreshToken) {
      throw new Error('No refresh token found, cannot refresh access token');
    }

    const url = this.tokenUrl;

    // Use URLSearchParams to handle the required parameters
    const data = new URLSearchParams();
    data.append('grant_type', 'refresh_token');
    data.append('refresh_token', args.connection.refreshToken);

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (this.authorizationMethod === 'header') {
      headers['Authorization'] = `Basic ${Buffer.from(
        `${this.clientId}:${this.clientSecret}`,
      ).toString('base64')}`;
    } else if (this.authorizationMethod === 'body') {
      data.append('client_id', this.clientId);
      data.append('client_secret', this.clientSecret);
    } else {
      throw new Error(
        `Invalid authorization method: ${this.authorizationMethod}`,
      );
    }

    // Add extra parameters if needed (you can make this more dynamic)
    const extraParams = this.extraRefreshParams;
    if (extraParams && typeof extraParams === 'object') {
      Object.entries(extraParams).forEach(([key, value]) => {
        data.append(key, value);
      });
    }

    // Make the POST request to refresh the token
    const result = await this.app.http.request({
      method: 'POST',
      url,
      data,
      headers,
      workspaceId: args.workspaceId,
    });

    // Extract the access_token, refresh_token, and any additional metadata
    const { access_token, refresh_token, ...metadata } = result.data;

    // If there's an afterTokenExchange function, call it to get additional metadata
    if (this.afterTokenExchange && access_token) {
      try {
        const additionalMetadata = await this.afterTokenExchange({
          accessToken: access_token,
          refreshToken: refresh_token,
          http: this.app.http,
          workspaceId: args.workspaceId,
        });
        
        // Merge the additional metadata with the existing metadata
        if (additionalMetadata) {
          Object.assign(metadata, additionalMetadata);
        }
      } catch (error) {
        console.error('Error in afterTokenExchange during token refresh:', error);
        // Continue even if afterTokenExchange fails
      }
    }

    // Update the connection with the new access token, refresh token, and metadata
    await this.app.connection.update({
      connectionId: args.connection.id,
      data: {
        accessToken: access_token,
        refreshToken: refresh_token,
        metadata,
      },
    });

    return;
  }

  async sendAuthorizeUrl(args: {
    workspaceId: string;
    configValue: OAuth2ConfigValues;
    res: Response;
    req: Request;
  }) {
    const authorizeUrl = await this.generateAuthorizeUrl(args);

    return args.res.status(200).json({
      authorizeUrl,
    });
  }

  async connectOAuth2App({
    res,
    state,
    tokens,
    metadata,
  }: {
    res: Response;
    state: OAuth2CallbackState;
    tokens: {
      accessToken: string;
      refreshToken?: string;
    };
    metadata: unknown;
  }) {
    await this.app.connection.create({
      data: {
        name: state.name,
        description: state.description,
        workflowAppId: this.app.id,
        connectionId: this.id,
        FK_workspaceId: state.workspaceId,
        FK_projectId: state.projectId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        metadata,
      },
    });

    return res.send(`
      <script>
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage('authSuccess', '${ServerConfig.CLIENT_URL}');
        }
        window.close();
      </script>
    `);
  }

  #encryptCallbackState(state: OAuth2CallbackState) {
    return this.app.jwt.sign(state);
  }

  #decodeCallbackState(state: string) {
    return decodeURIComponent(state);
  }

  #decryptCallbackState(token: string) {
    return this.app.jwt.verify<OAuth2CallbackState>(token);
  }
}

export class ApiKeyConnection extends Connection {
  constructor(args: ConnectionConstructorArgs) {
    super(args);
    this.connectionType = 'apiKey';
  }

  async connectApiKeyApp(args: {
    workspaceId: string;
    configValue: ApiKeyConfigValues;
    res: Response;
    req: Request;
  }) {
    await this.app.connection.create({
      data: {
        name: args.configValue.name,
        description: args.configValue.description,
        workflowAppId: this.app.id,
        connectionId: this.id,
        FK_workspaceId: args.workspaceId,
        FK_projectId: args.configValue.projectId,
        apiKey: args.configValue.apiKey,
      },
    });

    return args.res.status(200).json({
      data: true,
    });
  }
}

export class BasicAuthConnection extends Connection {
  constructor(args: ConnectionConstructorArgs) {
    super(args);
    this.connectionType = 'basic';
  }

  async connectBasicAuthApp(args: {
    workspaceId: string;
    configValue: BasicAuthConfigValues;
    res: Response;
    req: Request;
  }) {
    await this.app.connection.create({
      data: {
        name: args.configValue.name,
        description: args.configValue.description,
        workflowAppId: this.app.id,
        connectionId: this.id,
        FK_workspaceId: args.workspaceId,
        FK_projectId: args.configValue.projectId,
        username: args.configValue.username,
        password: args.configValue.password,
      },
    });

    return args.res.status(200).json({
      data: true,
    });
  }
}

export class KeyPairConnection extends Connection {
  constructor(args: ConnectionConstructorArgs) {
    super(args);
    this.connectionType = 'keyPair';
  }

  async connectKeyPairApp(args: {
    workspaceId: string;
    configValue: KeyPairConfigValues;
    res: Response;
    req: Request;
  }) {
    await this.app.connection.create({
      data: {
        name: args.configValue.name,
        description: args.configValue.description,
        workflowAppId: this.app.id,
        connectionId: this.id,
        FK_workspaceId: args.workspaceId,
        FK_projectId: args.configValue.projectId,
        privateKey: args.configValue.privateKey,
        publicKey: args.configValue.publicKey,
      },
    });

    return args.res.status(200).json({
      data: true,
    });
  }
}

export type ConnectionConstructorArgs = {
  app: App;
  id: string;
  name: string;
  description: string;
  inputConfig: InputConfig;
  connectionType: ConnectionType;
};

export type OAuth2ConnectionConstructorArgs = ConnectionConstructorArgs & {
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string | undefined;
  clientSecret: string | undefined;
  afterTokenExchange?: (
    args: AfterTokenExchangeArgs,
  ) => Promise<AfterTokenExchangeResponse>;
  scopes: string[];
  scopeDelimiter?: string;
  authorizationMethod?: OAuth2AuthorizationMethod;
  grantType?: OAuth2GrantType;
  redirectToLocalHostInDevelopment?: boolean;
  extraAuthParams?: Record<string, string> | null;
  extraRefreshParams?: Record<string, string> | null;
  extraAuthHeaders?: Record<string, string> | null;
  pkce?: boolean;
};

export type ApiKeyConnectionConstructorArgs = ConnectionConstructorArgs;

export type BasicAuthConnectionConstructorArgs = ConnectionConstructorArgs;

export type KeyPairConnectionConstructorArgs = ConnectionConstructorArgs;

export type OAuth2CallbackState = {
  name: string;
  appId: string;
  connectionId: string;
  description?: string;
  workspaceId: string;
  projectId?: string;
  codeVerifier?: string;
};

export type OAuth2ConfigValues = {
  name: string;
  description?: string;
  projectId?: string;
};

export type ApiKeyConfigValues = {
  name: string;
  description?: string;
  apiKey: string;
  projectId?: string;
};

export type BasicAuthConfigValues = {
  name: string;
  description?: string;
  username: string;
  password: string;
  projectId?: string;
};

export type KeyPairConfigValues = {
  name: string;
  description?: string;
  publicKey: string;
  privateKey: string;
  projectId?: string;
};

export type ConnectionType = 'oauth2' | 'basic' | 'apiKey' | 'keyPair';

export type HandleCallbackArgs = {
  res: Response;
  req: Request;
};

export type GenerateAuthorizeUrlArgs = {
  workspaceId: string;
  configValue: OAuth2ConfigValues;
  res: Response;
  req: Request;
};

export type OAuth2AuthorizationMethod = 'body' | 'header';

export type OAuth2GrantType =
  | 'authorization_code'
  | 'client_credentials'
  | 'refresh_token';
