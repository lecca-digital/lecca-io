import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createTogetherAI } from '@ai-sdk/togetherai';
import { createXai } from '@ai-sdk/xai';
import { ConnectionData } from '@lecca-io/toolkit';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Connection } from '@prisma/client';
import { EmbeddingModel, LanguageModelV1 } from 'ai';
import { createOllama } from 'ollama-ai-provider';

import { ServerConfig } from '../../../config/server.config';
import { CryptoService } from '../crypto/crypto.service';
import { HttpService } from '../http/http.service';
import { PrismaService } from '../prisma/prisma.service';

import { DEFAULT_PROVIDERS } from './ai-provider-defaults';
import {
  getOllamaModelsWithDetails,
  ollamaIsRunning,
} from './utils/ollama-utils';

@Injectable()
export class AiProviderService {
  constructor(
    private readonly cryptoService: CryptoService,
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
  ) {
    this.providers = {
      ...DEFAULT_PROVIDERS,
    };

    Object.keys(this.providers).forEach((provider: AiProvider) => {
      switch (provider) {
        case 'ollama':
          ollamaIsRunning().then((isRunning) => {
            if (isRunning) {
              getOllamaModelsWithDetails().then((models) => {
                models.forEach((model) => {
                  this.providers.ollama.languageModels[model.model] = {
                    //Just going to assume true for vision and tools for now.
                    vision: true,
                    tools: true,
                    canStreamText: true,
                    //Ollama does not support streaming tools.
                    //Even with the ollama-ai-provider I couldn't really get it to work.
                    canStreamTools: true,
                    creditConversionData: {
                      //This doesn't really matter, since it's only on local host at the moment.
                      //And credits are not being used locally for the community.
                      input: 4000,
                      output: 1000,
                    },
                  };
                });
              });
              this.providers[provider].platformCredentialsEnabled = true;
            } else {
              delete this.providers.ollama;
            }
          });
          break;
        default:
          /**
           * If the proper environment variables are set, then the user can use the platform credentials.
           * Otherwise, they will have to add their own credentials. If platformCredentialsEnabled is set to true,
           * then all the models need to have `creditConversionData` or else an error will be thrown.
           */
          if (!process.env[this.providers[provider].platformCredentialEnvVar]) {
            this.providers[provider].platformCredentialsEnabled = false;
          } else {
            this.providers[provider].platformCredentialsEnabled = true;
          }
          break;
      }
    });
  }

  providers: AiProviders;

  getAiLlmProviderClient = ({
    aiProvider,
    llmModel,
    llmConnection,
    workspaceId,
  }: {
    aiProvider: AiProvider;
    llmModel: string;
    llmConnection:
      | Pick<Connection, 'id' | 'apiKey' | 'connectionId'>
      | undefined;
    workspaceId: string;
  }): LanguageModelV1 => {
    if (!llmModel) {
      throw new BadRequestException('LLM Model is required');
    }

    if (!aiProvider) {
      throw new BadRequestException('AI Provider is required');
    }

    if (!this.providers[aiProvider]) {
      throw new BadRequestException(
        `The ${aiProvider} provider is not supported`,
      );
    }

    let apiKey: string | null;
    if (llmConnection) {
      //We'll use their model and api key if they have it.

      if (!llmConnection.apiKey) {
        throw new BadRequestException(
          'The LLM Connection does not contain an API key',
        );
      }

      this.decryptCredentials({
        data: llmConnection,
      });

      apiKey = llmConnection.apiKey;
    } else {
      //We'll use our own model and api key if they don't have it. (We'll use their credits)
      apiKey = process.env[this.providers[aiProvider].platformCredentialEnvVar];
      const platformCredentialsEnabled =
        this.providers[aiProvider].platformCredentialsEnabled;

      if (!platformCredentialsEnabled) {
        throw new BadRequestException(
          `This AI provider (${aiProvider}) requires you to add your own credentials. In the advanced settings, select your own connection from the dropdown.`,
        );
      }

      if (!apiKey && aiProvider !== 'ollama') {
        throw new BadRequestException(
          `The ${aiProvider} provider does not have the proper environment variables set up to use the platform credentials.`,
        );
      }
    }

    switch (aiProvider) {
      case 'openai':
        return createOpenAI({
          compatibility: 'strict', //Use `compatible` - when using 3rd party providers. but stream options won't exist
          apiKey,
        })(llmModel, {
          user: workspaceId,
        });
      case 'anthropic':
        return createAnthropic({
          apiKey,
        })(llmModel);
      case 'gemini':
        return createGoogleGenerativeAI({
          apiKey,
        })(llmModel, {
          structuredOutputs: false,
        });
      case 'together-ai':
        return createTogetherAI({
          apiKey,
        })(llmModel, {
          user: workspaceId,
        });
      case 'perplexity-ai':
        return createOpenAI({
          compatibility: 'compatible',
          apiKey,
          baseURL: 'https://api.perplexity.ai',
        })(llmModel, {
          user: workspaceId,
        });
      case 'deepseek':
        return createDeepSeek({
          apiKey,
        })(llmModel, {
          user: workspaceId,
        }) as any;
      case 'xai':
        return createXai({
          apiKey,
        })(llmModel, {
          user: workspaceId,
        }) as any;
      case 'ollama': {
        return createOllama({
          baseURL: ServerConfig.OLLAMA_BASE_URL,
        })(llmModel, {
          experimentalStreamTools: true,
        });
      }
    }
  };

  getAiEmbeddingProviderClient = ({
    aiProvider,
    embeddingModel,
    llmConnection,
    workspaceId,
    requestedDimensionSize,
  }: {
    aiProvider: AiProvider;
    embeddingModel: string;
    llmConnection:
      | Pick<Connection, 'id' | 'apiKey' | 'connectionId'>
      | undefined;
    workspaceId: string;
    requestedDimensionSize: number;
  }): EmbeddingModel<string> => {
    if (!embeddingModel) {
      throw new BadRequestException('Embedding Model is required');
    }

    if (!aiProvider) {
      throw new BadRequestException('AI Provider is required');
    }

    let apiKey: string | null;
    if (llmConnection) {
      //We'll use their model and api key if they have it.

      if (!llmConnection.apiKey) {
        throw new BadRequestException(
          'The LLM Connection does not contain an API key',
        );
      }

      this.decryptCredentials({
        data: llmConnection,
      });

      apiKey = llmConnection.apiKey;
    } else {
      //We'll use our own model and api key if they don't have it. (We'll use their credits)
      switch (aiProvider) {
        case 'openai':
          apiKey = ServerConfig.OPENAI_API_KEY;
          if (!apiKey) {
            throw new BadRequestException('OPENAI_API_KEY is missing.');
          }
          break;
        case 'ollama':
          apiKey = null;
          break;
        default:
          throw new BadRequestException(
            `The ${aiProvider} provider is not supported as an embedding provider`,
          );
      }
    }

    const embeddingModelData = this.getEmbeddingModelData({
      aiProvider,
      modelName: embeddingModel,
    });

    const allowsCustomDim = embeddingModelData.dimensionOptions.allowsCustomDim;
    const defaultDimensionSize = embeddingModelData.dimensionOptions.defaultDim;

    if (!allowsCustomDim) {
      if (defaultDimensionSize !== requestedDimensionSize) {
        throw new BadRequestException(
          `The requested dimension size for this knowledge notebook is ${requestedDimensionSize}. That dimension size is not supported for model ${embeddingModel}. The default dimension size for model ${embeddingModel} is ${defaultDimensionSize} and cannot be customized.`,
        );
      }
    } else {
      if (
        requestedDimensionSize <
          embeddingModelData.dimensionOptions.minCustomDim ||
        requestedDimensionSize >
          embeddingModelData.dimensionOptions.maxCustomDim
      ) {
        throw new BadRequestException(
          `The requested dimension size for this knowledge notebook is ${requestedDimensionSize}. That dimension size is not supported for model ${embeddingModel}. The supported dimension sizes for model ${embeddingModel} are between ${embeddingModelData.dimensionOptions.minCustomDim} and ${embeddingModelData.dimensionOptions.maxCustomDim}.`,
        );
      }
    }

    switch (aiProvider) {
      case 'openai':
        return createOpenAI({
          compatibility: 'strict', //Use `compatible` - when using 3rd party providers. but stream options won't exist
          apiKey,
        }).textEmbeddingModel(embeddingModel, {
          dimensions: allowsCustomDim ? requestedDimensionSize : undefined,
          user: workspaceId,
        });
      case 'ollama': {
        return createOllama({
          baseURL: ServerConfig.OLLAMA_BASE_URL,
        }).textEmbeddingModel(embeddingModel);
      }
    }
  };

  getEmbeddingModelData = ({
    aiProvider,
    modelName,
  }: {
    aiProvider: AiProvider;
    modelName: string;
  }) => {
    if (!modelName) {
      throw new BadRequestException('Model name is required');
    }

    if (!aiProvider) {
      throw new BadRequestException('AI Provider is required');
    }

    return this.providers[aiProvider]?.embeddingModels[modelName];
  };

  getLanguageModelData = ({
    aiProvider,
    modelName,
  }: {
    aiProvider: AiProvider;
    modelName: string;
  }) => {
    if (!modelName) {
      throw new BadRequestException('Model name is required');
    }

    if (!aiProvider) {
      throw new BadRequestException('AI Provider is required');
    }

    return this.providers[aiProvider]?.languageModels[modelName];
  };

  getLanguageModelsByProviderAndConnectionId = async ({
    aiProvider,
    connectionId,
  }: {
    aiProvider: AiProvider;
    connectionId: string;
  }) => {
    if (!this.providers[aiProvider]) {
      throw new BadRequestException(
        `The ${aiProvider} provider is not supported`,
      );
    }

    if (connectionId === 'credits' || !connectionId) {
      return this.providers[aiProvider].languageModels;
    } else if (this.providers[aiProvider].fetchLanguageModels) {
      const connection = await this.prisma.connection.findFirst({
        where: {
          id: connectionId,
        },
        select: {
          apiKey: true,
          FK_workspaceId: true,
        },
      });

      this.decryptCredentials({
        data: connection,
      });

      try {
        return await this.providers[aiProvider].fetchLanguageModels({
          connection,
          http: this.http,
          workspaceId: connection.FK_workspaceId,
        });
      } catch {
        throw new BadRequestException(
          `Failed to fetch language models for ${aiProvider} provider`,
        );
      }
    } else {
      return this.providers[aiProvider].languageModels;
    }
  };

  async checkWorkspaceUserHasAccessToConnection({
    workspaceId,
    workspaceUserId,
    connectionId,
  }: {
    workspaceId: string;
    workspaceUserId: string;
    connectionId: string;
  }) {
    const connection = await this.prisma.connection.findFirst({
      where: {
        AND: [
          {
            id: connectionId,
          },
          {
            FK_workspaceId: workspaceId,
          },
        ],
      },
      select: {
        project: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!connection?.project) {
      //If the connection does not belong to a project,
      //then it belongs to the workspace.
      return true;
    } else {
      const userBelongsToProject = await this.prisma.project.findFirst({
        where: {
          AND: [
            {
              id: connection.project.id,
            },
            {
              workspaceUsers: {
                some: {
                  id: workspaceUserId,
                },
              },
            },
          ],
        },
      });

      return !!userBelongsToProject;
    }
  }

  decryptCredentials({ data }: { data: ConnectionData }) {
    try {
      if (data.accessToken) {
        data.accessToken = this.cryptoService.decrypt(data.accessToken);
      }

      if (data.refreshToken) {
        data.refreshToken = this.cryptoService.decrypt(data.refreshToken);
      }

      if (data.apiKey) {
        data.apiKey = this.cryptoService.decrypt(data.apiKey);
      }

      if (data.username) {
        data.username = this.cryptoService.decrypt(data.username);
      }

      if (data.password) {
        data.password = this.cryptoService.decrypt(data.password);
      }

      if (data.privateKey) {
        data.privateKey = this.cryptoService.decrypt(data.privateKey);
      }

      if (data.publicKey) {
        data.publicKey = this.cryptoService.decrypt(data.publicKey);
      }
    } catch {
      throw new ForbiddenException('Invalid credentials');
    }
  }
}

export type AiProvider =
  | 'openai'
  | 'ollama'
  | 'anthropic'
  | 'gemini'
  | 'together-ai'
  | 'perplexity-ai'
  | 'deepseek'
  | 'xai';

export type AiProviders = {
  [key in AiProvider]: AiProviderData;
};

export type AiProviderData = {
  appConnectionId: string | null;
  languageModels: { [key: string]: AiLanguageModelData };
  embeddingModels: { [key: string]: AiEmbeddingModelData };

  /**
   * If you want to allow the user to use the platform credentials,
   * then set the environment variable name here.
   */
  platformCredentialEnvVar: string | undefined;

  /**
   * This is set at runtime to determine if proper the platform credentials are setup
   * so that the user doesn't have to add their own credentials to use this provider.
   */
  platformCredentialsEnabled?: boolean | undefined;

  fetchLanguageModels?: (args: {
    http: HttpService;
    workspaceId: string;
    connection: ConnectionData;
  }) => Promise<{ [key: string]: AiLanguageModelData }>;

  /**
   * Validates and modifies the configuration for the model if needed.
   *
   * For example, perplexity needs a frequency_penalty to be greater than 0. So we can return 0.01 if it's less than 0.
   * Or if there's something really wrong, we can throw a descriptive error to help the user know how to fix their configuration.
   */
  validateConfiguration?: (args: { frequency_penalty?: number | null }) => {
    frequency_penalty?: number | null;
  };
};

export type AiLanguageModelData = {
  canStreamText: boolean;
  canStreamTools: boolean;
  vision: boolean;
  tools: boolean;
  creditConversionData: {
    input: number;
    output: number;
  } | null;

  /**
   * Some models don't support temperature.
   * If set to false, the temperature value will not be passed into the ai request.
   */
  canUseTemperature?: boolean;
};

export type AiEmbeddingModelData = {
  creditConversionData: {
    perEmbedding: number;
  } | null;
  dimensionOptions: {
    /**
     * If default dimension is unknown, we will try the
     * dimension size of the knowledge notebook dimension size
     * if the allowsCustomDim property is true.
     */
    defaultDim: number | undefined;
    allowsCustomDim: boolean;
    minCustomDim: number | null;
    maxCustomDim: number | null;
  };
};
