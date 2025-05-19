import { generateMock } from '@anatine/zod-mock';
import { QueryClient } from '@tanstack/react-query';
import axios, { AxiosResponse } from 'axios';
import { z } from 'zod';

import {
  ApiLibrary,
  ApiLibraryConfig,
  api,
  appQueryClient,
} from './api-library';

const MOCK_API_CALLS = import.meta.env.VITE_MOCK_API_CALLS === 'true';
const LOG_API_CALLS = import.meta.env.VITE_LOG_API_CALLS === 'true';

export abstract class ApiLibraryHelper {
  constructor(_args: {
    library: ApiLibrary;
    version?: number;
    queryClient?: QueryClient;
  }) {
    this.#version = _args.version ?? 1;
  }

  /**
   * @description The schema for the data that is returned from the api. Used for mocking data.
   */
  protected abstract schema: z.ZodObject<any> | null;

  /**
   * @description Name of the service in the ApiLibrary
   */
  protected abstract serviceName: keyof ApiLibrary;

  /**
   * @description Base url path for the api endpoint
   */
  protected abstract path: string;

  /**
   * @description Gets the data dynamically from the api based on the auth headers. For example,
   * the users/me endpoint would return the user that is currently logged in. The /workspaces/me
   * would return the active workspace for the user.
   */
  protected _getMe<T>({ config }: { config?: ApiLibraryConfig }) {
    return this.apiFetch<T>({
      path: `${this.path}/me`,
      httpMethod: 'get',
      config,
      mockConfig: {
        schema: this.schema!,
      },
    });
  }

  /**
   * @description Gets a list of items from the api
   */
  protected _getList<T>({ config }: { config?: ApiLibraryConfig }) {
    return this.apiFetch<T>({
      path: this.path,
      httpMethod: 'get',
      config,
      mockConfig: {
        isArray: true,
        schema: this.schema!,
      },
    });
  }

  /**
   *  @description Gets a single item by id from the api
   */
  protected _getById<T>({
    id,
    config,
  }: {
    id: string;
    config?: ApiLibraryConfig;
  }) {
    return this.apiFetch<T>({
      path: `${this.path}/${id}`,
      httpMethod: 'get',
      config,
      mockConfig: {
        schema: this.schema!,
      },
    });
  }

  /**
   * @description Creates a new item in the api
   */
  protected _create<T>({
    data,
    config,
  }: {
    data: any;
    config?: ApiLibraryConfig;
  }) {
    return this.apiFetch<T>({
      path: this.path,
      httpMethod: 'post',
      data: data,
      config,
      mockConfig: {
        schema: this.schema!,
      },
      onSuccess: async () => {
        await appQueryClient.invalidateQueries({
          queryKey: [this.serviceName, 'getList'],
        });
      },
    });
  }

  /**
   * @description Updates an item in the api
   */
  protected _update<T>({
    id,
    data,
    config,
  }: {
    id: string;
    data: any;
    config?: ApiLibraryConfig;
  }) {
    //We'll except services that use PUT to create their own update method
    return this.apiFetch<T>({
      path: `${this.path}/${id}`,
      httpMethod: 'patch',
      data: data,
      config,
      mockConfig: {
        schema: this.schema!,
      },
      onSuccess: async () => {
        await Promise.allSettled([
          appQueryClient.invalidateQueries({
            queryKey: [this.serviceName, 'getList'],
          }),
          appQueryClient.invalidateQueries({
            queryKey: [this.serviceName, 'getById', id],
          }),
        ]);
      },
    });
  }

  /**
   * @description Deletes an item in the api. The server will handle soft deletes if applicable.
   */
  protected async _delete<T>({
    id,
    config,
  }: {
    id: string;
    config?: ApiLibraryConfig;
  }) {
    return this.apiFetch<T>({
      path: `${this.path}/${id}`,
      httpMethod: 'delete',
      config,
      mockConfig: {
        schema: null,
        doNotMock: false,
      },
      onSuccess: async () => {
        await appQueryClient.invalidateQueries({
          queryKey: [this.serviceName, 'getList'],
        });
      },
    });
  }

  /**
   * @description Every api call will go through this function. It will handle the axios call, mock the data if needed, and handle errors.
   */
  protected async apiFetch<T>({
    path,
    httpMethod,
    data,
    config,
    mockConfig,
    onSuccess,
  }: {
    /**
     * @description The path of the api endpoint
     */
    path: string;
    /**
     * @description The http method of the api call
     */
    httpMethod: 'get' | 'post' | 'put' | 'patch' | 'delete';
    /**
     * @description The data to send to the api
     */
    data?: any;
    /**
     * @description The configuration for the api call. These include query params, headers, etc.
     */
    config?: ApiLibraryConfig;
    /**
     * @description The configuration for mocking the api call. These include the schema for the mock data, if it should be an array, etc.
     */
    mockConfig: MockConfig;
    /**
     * @description A function that will run if the api call is successful
     * @param data The data that is returned from the api call
     */
    onSuccess?: (data: T) => Promise<void>;
  }): Promise<ApiLibraryResponse<T>> {
    const url = this.#getFullPath(path);

    this.#prepareConfig(config);

    const requestParams = {
      url,
      httpMethod,
      data,
      config,
    };

    let response;

    if (MOCK_API_CALLS && !mockConfig.doNotMock) {
      response = await this.#handleMockFetch<T>({ mockConfig });
    } else {
      const request = this.#prepareRequest(requestParams);
      response = await this.#handleRegularFetch<T>(request, requestParams, 0);
    }

    if (LOG_API_CALLS) {
      const logData: any = {
        url,
        httpMethod: httpMethod.toUpperCase(),
      };

      if (data) {
        logData.payload = data;
      }

      if (requestParams.config?.params) {
        logData.query = requestParams.config.params;
      }

      if (response.data) {
        logData.response = response.data;
        if (response.pagination) {
          logData.pagination = response.pagination;
        }
      } else if (response.error) {
        logData.error = response.error;
      }
      console.info(logData);
    }

    //The onSuccess that was passed through the config options will run here
    if (response.data && config?.options?.additionalOnSuccess) {
      await (config.options as any).additionalOnSuccess(response.data);
    }

    if (response.data && onSuccess) {
      //The onSuccess function will only run if the response is successful
      await onSuccess(response.data);
    }

    return response;
  }

  async #handleRegularFetch<T>(
    request: Promise<AxiosResponse<any, any>>,
    requestParams: PrepareRequestParams,
    retryInstance: number,
  ): Promise<ApiLibraryResponse<T>> {
    const response = await request.catch((err) => {
      return err.response;
    });

    if (!response) {
      return {
        error: 'Server could not be reached',
        isError: true,
      };
    }

    //If response status is in 200s
    if (response.status >= 200 && response.status < 300) {
      const responseObj: ApiLibraryResponse<T> = { data: response.data };

      if (response.pagination) {
        responseObj.pagination = response.pagination;
      }

      return responseObj;
    } else {
      return await this.#handleErrorStatus<T>(
        response,
        requestParams,
        retryInstance,
      );
    }
  }

  async #handleMockFetch<T>({
    mockConfig,
  }: {
    mockConfig: MockConfig;
  }): Promise<ApiLibraryResponse<T>> {
    if (mockConfig.doNotMock) {
      throw new Error(
        'Should never get in here because handleMockFetch should only be called if doNotMock is true',
      );
    }

    //Fake waiting between 0 and 3 seconds
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 1000 * 1),
    );

    if (mockConfig.schema === null && mockConfig.mockData === undefined) {
      //True is just a truthy value I'm returning, but it's not really being used.
      return { data: true as T };
    }

    if (mockConfig.isArray) {
      const numItems = Math.floor(
        mockConfig.numItems
          ? Math.random() * mockConfig.numItems
          : Math.random() * 100,
      );

      const mockedData = {
        pagination: {
          page: 1,
          limit: 1000,
          total: numItems,
          totalPages: Math.ceil(numItems / 1000),
          sortBy: null,
          sortDir: null,
        },
        data: Array.from(
          {
            length: numItems,
          },
          () => (mockConfig.mockData as T) ?? generateMock(mockConfig.schema!),
        ) as T,
      };

      //Deep iterate of all the items in the array and any property that ends with "At", replace with a Date.now()
      (mockedData.data as any).forEach((item: any) => {
        for (const key in item) {
          if (key.endsWith('At')) {
            item[key] = new Date();
          }
        }
      });

      return mockedData;
    } else {
      const mockedData = {
        data:
          (mockConfig.mockData as T) ?? (generateMock(mockConfig.schema!) as T),
      };

      for (const key in mockedData.data) {
        if (key.endsWith('At')) {
          (mockedData.data as any)[key] = new Date();
        }
      }

      return mockedData;
    }
  }

  // async #handleQueryFetch(
  //   request: Promise<AxiosResponse<any, any>>,
  //   { path, config }: { path: string; config?: ApiLibraryConfig },
  // ) {
  //   if (!this.#queryClient) {
  //     return this.#handleRegularFetch(request);
  //   }

  //   const response = await this.#queryClient!.fetchQuery({
  //     queryKey: [path, config],
  //     queryFn: () => request,
  //   });

  //   //If response status is in 200s
  //   if (response.status >= 200 && response.status < 300) {
  //     return response.data;
  //   }

  //   return null;
  // }

  async #handleErrorStatus<T>(
    response: any,
    requestParams: PrepareRequestParams,
    retryInstance: number,
  ): Promise<ApiLibraryResponse<T>> {
    //If it's a 401, try to refresh the token, if that fails, redirect to login.
    if (response.status === 401) {
      if (await this._refreshToken()) {
        //This retry wasn't working because the request headers are using the old tokens.
        //We need to make a new copy of this request but use the updated accessToken from local storage
        const request = this.#prepareRequest(requestParams);

        if (retryInstance > 2) {
          await api.auth.logout();
          return {
            error: response.data.message,
            isError: true,
          };
        }

        return this.#handleRegularFetch(
          request,
          requestParams,
          retryInstance + 1,
        );
      } else {
        await api.auth.logout();
      }
    }

    return {
      error: response.data.message,
      isError: true,
    };
  }

  protected async _refreshToken() {
    try {
      if (!localStorage.getItem('refreshToken')) {
        return false;
      }

      //Axios call
      const url = `${import.meta.env.VITE_SERVER_URL}/auth/refresh-token`;
      const response = await axios.post(url, {
        refreshToken: localStorage.getItem('refreshToken'),
      });

      //If response status is in 200s
      if (response.status >= 200 && response.status < 300) {
        //Update the access token
        localStorage.setItem('accessToken', response.data.access_token);
        //Return true to retry the request
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  #getFullPath(path: string) {
    let fullPath = `${import.meta.env.VITE_SERVER_URL}`;

    if (this.#version > 1) {
      //We're not using this. Once we go to version 2 and on, we'll add it?
      fullPath += `/v${this.#version}`;
    }

    fullPath += path;

    return fullPath;
  }

  async #prepareRequest({
    url,
    httpMethod,
    data,
    config,
  }: PrepareRequestParams) {
    let request: Promise<AxiosResponse<any, any>>;

    const headers: Record<string, any> = {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    };

    const requestConfig = {
      headers,
      params: config?.params,
      signal: config?.signal,
    };

    if (httpMethod === 'get' || httpMethod === 'delete') {
      //GET AND DELETE DONT USE DATA
      request = axios[httpMethod](url, requestConfig);
    } else {
      request = axios[httpMethod](url, data ?? {}, requestConfig);
    }

    return request;
  }

  async #prepareConfig(config?: ApiLibraryConfig) {
    Object.entries(config?.params ?? {}).forEach(([key, value]) => {
      switch (key) {
        case 'includeType':
          if (Array.isArray(value)) {
            config!.params![key] = value.join(',');
          } else {
            throw new Error('includeType must be an array');
          }
          break;
        case 'expansion':
          if (Array.isArray(value)) {
            config!.params![key] = value.join(',');
          } else {
            throw new Error('expansion must be an array');
          }
          break;
        case 'filterBy':
          if (Array.isArray(value)) {
            config!.params![key] = value.join(',');
          } else {
            throw new Error('filterBy must be an array');
          }
          break;
        default:
          if (Array.isArray(value)) {
            value = value.join(',');
          }
          break;
      }
    });
  }

  /**
   * useApiQuery runs this same function to generate a key.
   * We're using this here so that our methods can generate the same key for invalidating the react query cache.
   *
   * Note - This is very fragile and could lead to bugs, but I can't think of a different solution at the moment.
   * It's fragile, because it relies on the order of the properties in the args. But since it's using the same args object,
   * the order should always be the same.
   *
   * Not really required if you only have one id type in the args object
   */
  protected getQueryKeyFromArgIds(args: Record<string, any>) {
    const queryKey: any[] = [];

    Object.keys(args).forEach((key) => {
      if (key.endsWith('Id') || key === 'id') {
        queryKey.push(args[key]);
      }
    });

    //Sorting the ids so that when we invalidate the cache, the ids are in the same order
    //This is because we can't rely on the argument order that is passed.
    queryKey.sort();

    return queryKey;
  }

  #version: number;
}

export type ApiLibraryResponse<Data = unknown> = {
  data?: Data;
  pagination?: PaginationData;
  error?: string;
  isError?: boolean;
};

type PaginationData = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sortBy: string | null;
  sortDir: 'asc' | 'desc' | null;
};

type PrepareRequestParams = {
  url: string;
  httpMethod: 'get' | 'post' | 'put' | 'patch' | 'delete';
  data?: any;
  config?: ApiLibraryConfig;
};

type MockConfigSchema = z.ZodObject<any> | null;

interface MockConfig {
  schema: MockConfigSchema;
  doNotMock?: boolean;
  isArray?: boolean;
  numItems?: number;
  //The actualy response if you just want to mock a single response
  mockData?: any;
}
