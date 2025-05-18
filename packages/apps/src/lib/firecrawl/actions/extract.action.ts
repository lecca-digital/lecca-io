import { createAction, createTextInputField } from '@lecca-io/toolkit';
import { z } from 'zod';

export const extract = createAction({
  id: 'firecrawl_action_extract',
  name: 'Extract',
  description: 'Extract structured data from pages using LLMs',
  inputConfig: [
    createTextInputField({
      id: 'urls',
      label: 'URLs',
      occurenceType: 'multiple',
      description:
        'You can extract structured data from one or multiple URLs, including wildcards. E.g. https://example.com/*',
      placeholder: 'https://example.com',
      required: {
        missingMessage: 'At least one URL is required',
        missingStatus: 'warning',
      },
    }),
    createTextInputField({
      id: 'prompt',
      label: 'Prompt',
      description:
        'Prompt for the language model. e.g. "Extract pricing information from the page"',
      placeholder: 'Add instructions',
    }),
  ],
  aiSchema: z.object({
    urls: z.array(z.string()).describe('Urls to extract data from'),
    prompt: z
      .string()
      .describe('Prompt for the language model on what to extract data'),
  }),
  run: async ({ connection, http, workspaceId, configValue, testing }) => {
    const { urls, prompt } = configValue;

    const data = {
      urls,
      prompt,
    };

    const startExtractionResponse = await http.request({
      url: 'https://api.firecrawl.dev/v1/extract',
      method: 'POST',
      workspaceId,
      headers: {
        Authorization: `Bearer ${connection.apiKey}`,
      },
      data,
    });

    const { success, id: jobId } = startExtractionResponse.data;

    if (!success) {
      throw new Error('Failed to start extraction');
    } else if (!jobId) {
      throw new Error('Job ID not found for extraction');
    }

    //We'll wait for a total of 10 minutes
    const maxPolls = 120;
    const pollIntervalInSeconds = testing ? 2 : 5;

    let polls = 0;

    while (polls < maxPolls) {
      const jobUrl = `https://api.firecrawl.dev/v1/extract/${jobId}`;
      const jobResult = await http.request({
        method: 'GET',
        url: jobUrl,
        headers: {
          Authorization: `Bearer ${connection.apiKey}`,
        },
        workspaceId,
      });

      const { status: jobStatus } = jobResult.data;

      if (jobStatus === 'completed') {
        return jobResult.data;
      } else if (jobStatus === 'failed') {
        throw new Error('Extraction failed');
      } else if (jobStatus === 'cancelled') {
        throw new Error('Extraction was cancelled');
      }

      polls++;
      await new Promise((resolve) =>
        setTimeout(resolve, pollIntervalInSeconds * 1000),
      );
    }
  },
  mockRun: async () => {
    return {
      success: true,
      data: {
        item1: 'value1',
        item2: 'value2',
      },
      status: 'completed',
      expiresAt: '2025-01-08T20:58:12.000Z',
    };
  },
});
