import type { PrismaClient } from '@prisma/client';
import { LanguageModelV1, Message } from 'ai';
import { AxiosRequestConfig, AxiosResponse, Method } from 'axios';

import { ConnectionData } from './connection.types';

export type InjectedServices = {
  http: {
    request: (args: HttpRequestArgs) => Promise<AxiosResponse<any, any>>;
  };
  prisma: PrismaClient;
  fileHandler: {
    downloadFile<T extends boolean>({
      url,
      maxSize,
      dataType,
    }: {
      url: string;
      maxSize?: number;
      dataType: 'blob' | 'buffer';
    }): Promise<
      T extends true
        ? { data: Buffer; contentType: string; filename: string }
        : {
            data: Blob;
            contentType: string;
            filename: string;
          }
    >;
    uploadMultiPartFormData(args: {
      url: string;
      blob: Blob;
      filename: string;
      headers: Record<string, string>;
    }): Promise<any>;
  };
  s3: {
    getSignedRetrievalUrl: (
      filePath: string,
      args: {
        expiresInMinutes: number;
      },
    ) => Promise<string>;
    uploadBufferFile: (args: {
      buffer: Buffer | ArrayBuffer;
      filePath: string;
      fileName: string;
    }) => Promise<string>;
    getPresignedPutUrl: (args: {
      filePath: string;
      fileName: string;
      options?: {
        ContentType?: string | null;
        ExpirationMinutes?: number;
        publicRead?: boolean;
      };
    }) => Promise<{
      presignedUrl: string;
      pathUrl: string;
    }>;
  };
  aiProviders: {
    providers: Record<string, any>;
    getAiLlmProviderClient: ({
      aiProvider,
      llmModel,
      llmConnection,
      workspaceId,
    }) => LanguageModelV1;
    decryptCredentials: (args: { data: ConnectionData }) => void;
  };
  credits: {
    checkIfWorkspaceHasLlmCredits: (args: {
      workspaceId: string;
      aiProvider: any; //TODO
      model: string;
      throwIfFalse?: boolean;
    }) => Promise<boolean>;
    transformLlmTokensToCredits: (args: {
      aiProvider: any; //TODO;
      model: string;
      data: {
        inputTokens: number;
        outputTokens: number;
      };
    }) => number;
    updateWorkspaceCredits: (
      args: UpdateWorkspaceCreditsData,
    ) => Promise<CreditUsageResponse>;
    checkIfWorkspaceHasEnoughCredits: (args: {
      workspaceId: string;
      usageType: UsageType;
      throwIfFalse?: boolean;
      overrideMinimumRequired?: number;
    }) => Promise<boolean>;
    transformCostToCredits: (args: {
      data: any; //TODO
      usageType: UsageType;
    }) => number;
  };
  task: {
    create: (args: {
      data: any & {
        /**
         * This is if the UI sends a uuid
         */
        id?: string;
      };
      agentId: string;
    }) => Promise<any>; //TODO
    messageTask: (args: MessageTaskProps) => Promise<any>; //TODO
  };
  knowledge: {
    create: (args: {
      data: any; //TODO
      workspaceId: string;
      expansion: Record<string, any>; //TODO
    }) => any; //TODO;
    queryKnowledge: (args: {
      query: string;
      workspaceId: string;
      knowledgeId: string;
      limit?: number;
    }) => Promise<string[]>;
    saveUploadedTextToKnowledge: (args: {
      data: any; //TODO
      knowledgeId: string;
      workspaceId: string;
    }) => Promise<boolean>;
    clearKnowledge: (args: {
      knowledgeId: string;
      workspaceId: string;
    }) => Promise<boolean>;
  };
  notification: {
    create: (args: {
      data: {
        link: string;
        title: string;
        message: string;
        workspaceUserId: string;
      };
    }) => Promise<void>;
  };
  execution: {
    manuallyExecuteWorkflow: (args: {
      workflowId: string;
      skipQueue?: boolean;
      inputData: any;
    }) => Promise<{ id: string }>;
  };
};

type MessageTaskProps = {
  taskId: string;
  messages: Message[];
  requestingWorkspaceUserId?: string;
  requestingWorkflowId?: string;
  requestingAgentId?: string;
  workspaceId: string;

  /**
   * `default: true`
   */
  shouldStream?: boolean;

  /**
   * `default: true`
   * If true, only the assistant response text will be returned.
   * If false, the entire repsonse message array including tools and text responses will be returned.
   */
  simpleResponse?: boolean;
};

type UsageType =
  | 'serper'
  | 'extract-dynamic-website-content'
  | 'extract-static-website-content'
  | 'vapi'
  | 'openai-text-embedding-ada-002'
  | 'workflow-execution'
  | 'ollama';

type UpdateWorkspaceCreditsData = {
  workspaceId: string;
  projectId: string | undefined;
  creditsUsed: number;
  data: {
    ref:
      | {
          workflowId?: string;
          executionId?: string;
          agentId?: string;
          taskId?: string;
          knowledgeId?: string;
        }
      | undefined;
    details: Record<string, any>;
  };
};

export type CreditUsageResponse = {
  originalallottedCredits: number;
  originalPurchasedCredits: number;
  originalTotalCredits: number;
  updatedallottedCredits: number;
  updatedPurchasedCredits: number;
  updatedTotalCredits: number;
  creditsUsed: number;
  creditsUpdatedAt: string;
};

type HttpRequestArgs = {
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
};
