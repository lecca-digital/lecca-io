import { HttpException, Injectable } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig, Method } from 'axios';

@Injectable()
export class HttpService {
  private axiosInstance: AxiosInstance;

  constructor() {
    // Create an Axios instance with default settings
    this.axiosInstance = axios.create({
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async loggedRequest(options: {
    method: Extract<
      Method,
      | 'GET'
      | 'DELETE'
      | 'POST'
      | 'PUT'
      | 'PATCH'
      | 'get'
      | 'delete'
      | 'post'
      | 'put'
      | 'patch'
    >;
    url: AxiosRequestConfig['url'];
    headers?: AxiosRequestConfig['headers'];
    params?: AxiosRequestConfig['params'];
    data?: AxiosRequestConfig['data'];
    /**
     * For logging purposes
     */
    workspaceId: string | undefined;
  }) {
    try {
      const response = await this.axiosInstance.request({
        method: options.method,
        url: options.url,
        params: options.params,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        data: options.data,
      });
      return response;
    } catch (error) {
      console.error({
        workspaceId: options.workspaceId || null,
        error: error.response?.data || error.message,
        status: error.response?.status || 500,
      });
      throw new HttpException(
        error.response?.data || 'Request failed',
        error.response?.status || 500,
      );
    }
  }
}