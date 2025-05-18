import openai from 'openai';

import { AiLanguageModelData, AiProviders } from './ai-provider.service';

export const DEFAULT_PROVIDERS: AiProviders = {
  openai: {
    appConnectionId: 'openai_connection_api-key',
    languageModels: {
      'gpt-4.1': {
        vision: true,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: {
          input: 500, // $2 per million tokens = 500,000 tokens per credit
          output: 125, // $8 per million tokens = 125,000 tokens per credit
        },
      },
      'gpt-4.1-mini': {
        vision: true,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: {
          input: 2500, // $0.40 per million tokens = 2,500,000 tokens per credit
          output: 625, // $1.60 per million tokens = 625,000 tokens per credit
        },
      },
      'gpt-4.1-nano': {
        vision: true,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: {
          input: 10000, // $0.10 per million tokens = 10,000,000 tokens per credit
          output: 2500, // $0.40 per million tokens = 2,500,000 tokens per credit
        },
      },
      'gpt-4o': {
        vision: true,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: {
          input: 240,
          output: 60,
        },
      },
      'gpt-4o-mini': {
        vision: true,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: {
          input: 4000,
          output: 1000,
        },
      },
      'o4-mini': {
        vision: true,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: {
          input: 6667, // $0.15 per million tokens = 6,666,667 tokens per credit
          output: 1667, // $0.60 per million tokens = 1,666,667 tokens per credit
        },
      },
      'o3-mini': {
        vision: true,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: {
          input: 200,
          output: 50,
        },
      },
      o1: {
        vision: true,
        tools: false,
        canStreamText: true,
        canStreamTools: false,
        creditConversionData: {
          input: 40,
          output: 10,
        },
      },
      'o1-preview': {
        vision: true,
        tools: false,
        canStreamText: true,
        canStreamTools: false,
        creditConversionData: {
          input: 40,
          output: 10,
        },
      },
      'o1-mini': {
        vision: true,
        tools: false,
        canStreamText: true,
        canStreamTools: false,
        creditConversionData: {
          input: 200,
          output: 50,
        },
      },
    },
    embeddingModels: {
      'text-embedding-ada-002': {
        creditConversionData: {
          perEmbedding: 0.1,
        },
        dimensionOptions: {
          defaultDim: 1536,
          allowsCustomDim: false,
          maxCustomDim: null,
          minCustomDim: null,
        },
      },
      'text-embedding-3-large': {
        creditConversionData: {
          perEmbedding: 0.2,
        },
        dimensionOptions: {
          defaultDim: 512,
          allowsCustomDim: true,
          maxCustomDim: 3072,
          minCustomDim: 0,
        },
      },
      'text-embedding-3-small': {
        creditConversionData: {
          perEmbedding: 0.1,
        },
        dimensionOptions: {
          defaultDim: 1024,
          allowsCustomDim: true,
          maxCustomDim: 1536,
          minCustomDim: 0,
        },
      },
    },
    platformCredentialEnvVar: 'OPENAI_API_KEY',
    fetchLanguageModels: async ({ connection }) => {
      const OPEN_AI = new openai({
        apiKey: connection.apiKey,
        maxRetries: 1,
        timeout: 60000,
      });

      const { data } = await OPEN_AI.models.list();

      if (!data) {
        throw new Error('Failed to fetch models from OpenAI');
      }

      //Turn the models array into a { [modelId]: model } object
      return data.reduce(
        (acc, model) => {
          const modelData: AiLanguageModelData = {
            //There is currently no way to actually determine this from the API
            //So we will set everything to true and let the user figure it out
            canStreamText: true,
            canStreamTools: true,
            tools: true,
            vision: true,
            creditConversionData: null,
          };

          acc[model.id] = modelData;
          return acc;
        },
        {} as Record<string, AiLanguageModelData>,
      );
    },
  },
  anthropic: {
    appConnectionId: 'anthropic_connection_api-key',
    languageModels: {
      'claude-3-7-sonnet-latest': {
        vision: true,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: {
          input: 200, // $3 per million tokens
          output: 40, // $15 per million tokens
        },
      },
      'claude-3-7-haiku-latest': {
        vision: true,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: {
          input: 600, // $0.80 per million tokens
          output: 120, // $4 per million tokens
        },
      },
      'claude-3-5-sonnet-latest': {
        vision: true,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: {
          input: 200,
          output: 40,
        },
        //8192 output
      },
      'claude-3-5-haiku-latest': {
        vision: false,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: {
          //1 third of sonnet
          input: 120,
          output: 600,
        },
        //8192 output
      },
      'claude-3-opus-latest': {
        vision: true,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: {
          input: 8,
          output: 40,
        },
        //4096
      },
      'claude-3-haiku-20240307': {
        vision: true,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: {
          input: 2400,
          output: 480,
        },
      },
    },
    embeddingModels: {},
    platformCredentialEnvVar: 'ANTHROPIC_API_KEY',
  },
  gemini: {
    appConnectionId: 'gemini_connection_api-key',
    languageModels: {
      'gemini-2.0-flash-exp': {
        vision: true,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: {
          input: 4000,
          output: 1000,
        },
        //8192 output
      },
      'gemini-1.5-flash': {
        vision: true,
        tools: false,
        canStreamText: true,
        canStreamTools: false,
        creditConversionData: {
          input: 4000,
          output: 1000,
        },
        //8192 output
      },
      'gemini-1.5-pro': {
        vision: true,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: {
          input: 240,
          output: 60,
        },
        //8192 output
      },
    },
    embeddingModels: {},
    platformCredentialEnvVar: 'GEMINI_API_KEY',
  },
  'together-ai': {
    appConnectionId: 'together-ai_connection_api-key',
    languageModels: {
      // Will be set at runtime
    },
    embeddingModels: {
      // Will be set at runtime
    },
    platformCredentialEnvVar: 'TOGETHER_AI_API_KEY',
    fetchLanguageModels: async ({ http, workspaceId, connection }) => {
      const response = await http.request({
        method: 'GET',
        url: `https://api.together.xyz/v1/models`,
        headers: {
          Authorization: `Bearer ${connection.apiKey}`,
        },
        workspaceId,
      });

      const models = response.data.filter((model) => model.type === 'chat');

      //Turn the models array into a { [modelId]: model } object
      return models.reduce(
        (acc, model) => {
          const modelData: AiLanguageModelData = {
            //There is currently no way to actually determine this from the API
            //So we will set everything to true and let the user figure it out
            canStreamText: true,
            canStreamTools: true,
            tools: true,
            vision: true,
            creditConversionData: null,
          };

          acc[model.id] = modelData;
          return acc;
        },
        {} as Record<string, AiLanguageModelData>,
      );
    },
  },
  'perplexity-ai': {
    appConnectionId: 'perplexity-ai_connection_api-key',
    languageModels: {
      'sonar-pro': {
        vision: false,
        tools: false,
        canStreamText: false,
        canStreamTools: false,
        creditConversionData: null,
        //200k context length
      },
      sonar: {
        vision: false,
        tools: false,
        canStreamText: false,
        canStreamTools: false,
        creditConversionData: null,
        //127k context length
      },
    },
    embeddingModels: {},
    platformCredentialEnvVar: 'PERPLEXITY_AI_API_KEY',
    validateConfiguration: (args) => {
      if (args.frequency_penalty <= 0) {
        args.frequency_penalty = 0.01;
      }

      return args;
    },
  },
  deepseek: {
    appConnectionId: 'deepseek_connection_api-key',
    languageModels: {
      'deepseek-chat': {
        vision: false,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: null,
      },
      'deepseek-reasoner': {
        vision: false,
        tools: false,
        canStreamText: false,
        canStreamTools: false,
        creditConversionData: null,
      },
    },
    embeddingModels: {},
    platformCredentialEnvVar: 'DEEPSEEK_API_KEY',
  },
  ollama: {
    appConnectionId: null,
    languageModels: {
      // Will be set at runtime
    },
    embeddingModels: {
      // Will be set at runtime
    },
    platformCredentialEnvVar: undefined,
  },
  xai: {
    appConnectionId: 'xai_connection_api-key',
    languageModels: {
      'grok-2-1212': {
        vision: false,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: null,
      },
      'grok-2': {
        vision: false,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: null,
      },
      'grok-2-latest': {
        vision: false,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: null,
      },
      'grok-beta': {
        vision: false,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: null,
      },
      'grok-2-vision-1212': {
        vision: true,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: null,
      },
      'grok-2-vision': {
        vision: true,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: null,
      },
      'grok-2-vision-latest': {
        vision: true,
        tools: true,
        canStreamText: true,
        canStreamTools: true,
        creditConversionData: null,
      },
      'grok-vision-beta': {
        vision: true,
        tools: false,
        canStreamText: false,
        canStreamTools: false,
        creditConversionData: null,
      },
    },
    embeddingModels: {},
    platformCredentialEnvVar: 'XAI_API_KEY',
  },
};
