export const ServerConfig = {
  /**
   * Choose between 'development' or 'production'.
   * At the moment this is used for the following:
   *  1. Changes the callback URL for OAuth integrations.
   *  2. Changes the directory assets are saved to in the S3 bucket.
   *  3. Changes the knowledge notebook vector database used.
   *  4. Handles payments on the platform (Only relevant for the cloud version)
   *  6. Logs emails instead of sending them.
   */
  ENVIRONMENT: process.env.ENVIRONMENT,

  /**
   * The port the server will run on.
   */
  PORT: process.env.PORT,

  /**
   * Secret key used for signing and verifying JWT tokens.
   * This key should be a long, random string for security.
   */
  AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET,

  /**
   * The secret key used for encrypting and decrypting callback state.
   */
  APP_OAUTH_CALLBACK_STATE_SECRET: process.env.APP_OAUTH_CALLBACK_STATE_SECRET,

  /**
   * Used for the CryptoService to encrypt and decrypt connection data.
   * Must be 32 characters long.
   */
  CRYPTO_ENCRYPTION_KEY: process.env.CRYPTO_ENCRYPTION_KEY,

  /**
   * The Database URL for the platform.
   */
  DATABASE_URL: process.env.DATABASE_URL,

  /**
   * The URL for the server.
   */
  SERVER_URL: process.env.SERVER_URL,

  /**
   * Commercial key use some premium features.
   * You must have a commercial license to change this value.
   */
  COMMERCIAL_KEY: process.env.COMMERCIAL_KEY,

  /**
   * The name of the platform. This is used for white labeling the platform
   * You must have a commercial license to change this value.
   */
  PLATFORM_NAME: process.env.PLATFORM_NAME || 'Lecca.io',

  /**
   *
   * Used for the ngrok tunnel URL. This is used for testing integrations locally that don't support localhost.
   * Espcially Webhook. For the best experience, you should use the ngrok tunnel URL instead of localhost.
   *
   * Also used for local oauth2 callback. If you want to use any app like gmail, slack, notion, .etc
   * then you need to set this to the ngrok tunnel url so you can authenticate while developing locally.
   * If you are running a production build (docker image), then the SERVER_URL will be used instead.
   *
   * To run the tunnel configure your ngrok connection using the script they provide when creating an account.
   * Then use the following command: `pnpm start:tunnel`
   *
   * https://ngrok.com/
   */
  NGROK_TUNNEL_URL: process.env.NGROK_TUNNEL_URL,

  /**
   * The URL of the web app client
   */
  CLIENT_URL: process.env.CLIENT_URL,

  /**
   * The email options for the nodemailer mail service configuration.
   */
  MAIL_OPTIONS: {
    /**
     * The email service used for sending emails.
     * Currently only `gmail` has been used and tested.
     */
    MAIL_SERVICE: process.env.MAIL_SERVICE,

    /**
     * The name of the sender of the email.
     */
    MAIL_FROM_NAME: process.env.MAIL_FROM_NAME,

    /**
     * The email address of the sender of the email.
     */
    MAIL_FROM_EMAIL_ADDRESS: process.env.MAIL_FROM_EMAIL_ADDRESS,

    /**
     * The client ID for the email service.
     */
    MAIL_CLIENT_ID: process.env.MAIL_CLIENT_ID,

    /**
     * The client secret for the email service.
     */
    MAIL_CLIENT_SECRET: process.env.MAIL_CLIENT_SECRET,

    /**
     * The refresh token for the email service.
     * Used by nodemailer to refresh the token for you.
     */
    MAIL_REFRESH_TOKEN: process.env.MAIL_REFRESH_TOKEN,
  },

  /**
   * `Commercial Feature`
   * You must have a commercial license to enable tracing
   *
   * Enables tracing using open telemetry.
   *
   * If you enable tracing, make sure you have OTEL_EXPORTER_OTLP_HEADERS set in your environment variables.
   * This would look like this: `OTEL_EXPORTER_OTLP_HEADERS="signoz-ingestion-key=your-signoz-ingestion-key"`
   * This doesn't have to use Signoz, it can be any OpenTelemetry compatible service.
   */
  ENABLE_TRACING: process.env.ENABLE_TRACING === 'true',

  /**
   * The Google Login Client ID for the platform.
   * Used for authenticating users with Google.
   */
  GOOGLE_LOGIN_CLIENT_ID: process.env.GOOGLE_LOGIN_CLIENT_ID,

  /**
   * Used for the S3 Service. The S3 Service is currently used for the following:
   *  1. Storing profile pictures of workspace users.
   *  2. Storing workspace logo images.
   *  3. Storing uploaded files used for vector embedding references.
   *  4. Storing temporary files when workflow actions require downloading them.
   */
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,

  /**
   * Used with the S3_ACCESS_KEY_ID for the S3 Service.
   * View the S3_ACCESS_KEY_ID for more information.
   */
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,

  /**
   * The S3 Region for the S3 Service.
   * View the S3_ACCESS_KEY_ID for more information.
   */
  S3_REGION: process.env.S3_REGION,

  /**
   * The S3 Bucket ID used for the S3 Service.
   * View the S3_ACCESS_KEY_ID for more information.
   */
  S3_BUCKET_ID: process.env.S3_BUCKET_ID,

  /**
   * If you are using ollama, you can override the base URL here.
   */
  OLLAMA_BASE_URL:
    process.env.OLLAMA_BASE_URL ??
    (process.env.IS_DOCKER
      ? 'http://host.docker.internal:11434/api'
      : 'http://127.0.0.1:11434/api'),

  /**
   * Used for running AI actions on the platform.
   */
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  /**
   * Used for running AI actions on the platform.
   */
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,

  /**
   * Used for running AI actions on the platform.
   */
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,

  /**
   * Used for the Pinecone API for storing and querying vectors.
   * This is used when uploading data to knowledge notebooks and querying them.
   */
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,

  /**
   * The name of the index used for storing vectors in Pinecone.
   * If you haven't created an index yet. Create a Pinecone Project and then create a new Index within the project.
   *
   * We currently only support an Index with a dimension of 1536.
   * So all embedding models must either have a dimension of 1536 or be able to convert to 1536.
   */
  PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME,

  /**
   * The Serper API key is used for searching the web.
   * This is currently used for the following:
   *  1. Enabling web access for AI Agents.
   *  2. Using google search as a step in the workflow builder.
   */
  SERPER_API_KEY: process.env.SERPER_API_KEY,

  /**
   * This key is used for extracting data from websites.
   * This is currently used for the following:
   *  1. Enabling web access for AI Agents.
   *  2. Extract content from websites in the workflow builder.
   */
  APIFY_API_KEY: process.env.APIFY_API_KEY,

  /**
   * This key is used for extracting dynamic content from websites.
   *
   * Create a task from the apify/website-content-crawler actor.
   * Modify the crawler settings to whatever limit of pages you want (I set mine to 1).
   * Use the task ID as this APIFY_EXTRACT_DYNAMIC_CONTENT_TASK_ID
   */
  APIFY_EXTRACT_DYNAMIC_CONTENT_TASK_ID:
    process.env.APIFY_EXTRACT_DYNAMIC_CONTENT_TASK_ID,

  /**
   * This key is used for extracting content from static websites.
   *
   * Create a task from the apify/cherio-scraper actor.
   * Modify the crawler settings to whatever limit of pages you want (I set mine to 1).
   * Use the task ID as this APIFY_EXTRACT_STATIC_CONTENT_TASK_ID
   */
  APIFY_EXTRACT_STATIC_CONTENT_TASK_ID:
    process.env.APIFY_EXTRACT_STATIC_CONTENT_TASK_ID,

  /**
   * This key is used for making phone calls using VAPI.
   * This is currently used for the following:
   *  1. Enabling phone calls for AI Agents.
   *  2. Making phone calls in the workflow builder.
   *
   * Note: You must import at least one phone number into VAPI before you can make calls.
   */
  VAPI_API_KEY: process.env.VAPI_API_KEY,

  /**
   * Used to retrieve environment variables from AWS Parameter Store.
   * Only used in the cloud version.
   */
  PARAM_STORE_ACCESS_KEY: process.env.PARAM_STORE_ACCESS_KEY,

  /**
   * Used to retrieve environment variables from AWS Parameter Store.
   * Only used in the cloud version.
   */
  PARAM_STORE_SECRET_ACCESS_KEY: process.env.PARAM_STORE_SECRET_ACCESS_KEY,

  /**
   * Used to retrieve environment variables from AWS Parameter Store.
   * Only used in the cloud version.
   */
  PARAM_STORE_REGION: process.env.PARAM_STORE_REGION,

  /**
   * The LLM provider used for AI Actions and AI Agents.
   * We currently support `openai`.
   *
   * Make sure you have the proper provider api key set.
   */
  DEFAULT_LLM_PROVIDER: process.env.DEFAULT_LLM_PROVIDER ?? 'openai',

  /**
   * The language model used for AI Actions and AI Agents
   *
   */
  DEFAULT_LLM_MODEL: process.env.DEFAULT_LLM_MODEL ?? 'gpt-4o',

  /**
   * The default embedding provider used for embedding text into vectors.
   * We currently support `openai`.
   *
   * Make sure you have the proper provider api key set.
   */
  DEFAULT_EMBEDDING_PROVIDER:
    process.env.DEFAULT_EMBEDDING_PROVIDER ?? 'openai',

  /**
   * The embedding model used with the embedding provider.
   *
   * Make sure the model supports the dimension of 1536 since that's the
   * pinecone index size we're using at the moment.
   */
  DEFAULT_EMBEDDING_MODEL:
    process.env.DEFAULT_EMBEDDING_MODEL ?? 'text-embedding-3-small',

  /**
   * Dev email domain used for testing, debugging, and development.
   * These funtions and endpoints are available in the dev module.
   * Make sure to include the '@' symbol.
   */
  DEV_EMAIL_DOMAIN: process.env.DEV_EMAIL_DOMAIN || '@lecca.io',

  /**
   * If set to `'true'`, upon account creation, the email will automatically
   * be marked as verified. This is useful for development and testing.
   */
  SKIP_EMAIL_VERIFICATION: process.env.SKIP_EMAIL_VERIFICATION === 'true',

  /**
   * When a user signs up, this workflow ID will be triggered.
   * Make sure it has a webhook trigger.
   */
  NEW_USER_WORKFLOW_ID: process.env.NEW_USER_WORKFLOW_ID,

  /**
   * This will be used as your polling interval for polling triggers.
   * If no value is set, it will default to 5 minutes.
   *
   * Make sure the value is a string in cron format.
   */
  CRON_TRIGGER_POLLING_INTERVAL: process.env.CRON_TRIGGER_POLLING_INTERVAL,
};
