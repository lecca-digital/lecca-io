import { createAction, createTextInputField } from '@lecca-io/toolkit';
import JSZip from 'jszip';
import { z } from 'zod';

export const readTextFileFromUrl = createAction({
  id: 'file_action_read-text-file-from-url',
  name: 'Read Text File from URL',
  description: 'Reads the contents of a text or zip file from a URL.',
  iconUrl: 'https://lecca-io.s3.us-east-2.amazonaws.com/assets/apps/file.svg',
  aiSchema: z.object({
    fileUrl: z.string().describe('The URL of the file to process'),
  }),
  inputConfig: [
    createTextInputField({
      id: 'fileUrl',
      label: 'File URL',
      description: 'The URL of the text or zip file to read',
      required: {
        missingMessage: 'URL is required.',
        missingStatus: 'warning',
      },
      placeholder: 'Add URL',
    }),
  ],
  run: async ({ configValue, http }) => {
    const { fileUrl } = configValue;

    try {
      // Download as binary arraybuffer
      const response = await http.request({
        method: 'GET',
        url: fileUrl,
        responseType: 'arraybuffer',
        workspaceId: undefined,
      });

      if (response.status !== 200) {
        throw new Error(`Failed to download file: ${response.status}`);
      }

      const buffer = response.data;
      const contentType = response.headers?.['content-type'] || '';

      if (
        contentType.includes('application/zip') ||
        contentType.includes('application/octet-stream')
      ) {
        const zip = await JSZip.loadAsync(buffer);
        const fileNames = Object.keys(zip.files);

        if (fileNames.length === 1) {
          // Only one file inside the zip
          const file = zip.files[fileNames[0]];
          if (!file.dir) {
            const fileData = await file.async('text');

            try {
              const parsedJson = JSON.parse(fileData);
              return {
                success: true,
                contentType: 'json',
                content: parsedJson,
                rawContent: fileData,
              };
            } catch {
              // Not JSON, just return as text
              return {
                success: true,
                contentType: 'text',
                content: fileData,
                rawContent: fileData,
              };
            }
          }
        } else {
          // Multiple files inside zip: return a map of filename -> content
          const files: { [filename: string]: string } = {};

          for (const filename of fileNames) {
            const file = zip.files[filename];
            if (!file.dir) {
              const fileData = await file.async('text');
              files[filename] = fileData;
            }
          }

          return {
            success: true,
            contentType: 'zip',
            content: files,
            rawContent: JSON.stringify(files, null, 2),
          };
        }
      } else {
        // Handle normal text or JSON file directly
        const textData = new TextDecoder('utf-8').decode(buffer);

        try {
          const parsedJson = JSON.parse(textData);
          return {
            success: true,
            contentType: 'json',
            content: parsedJson,
            rawContent: textData,
          };
        } catch {
          return {
            success: true,
            contentType: 'text',
            content: textData,
            rawContent: textData,
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Error reading file: ${error.message}`,
      };
    }
  },
  mockRun: async () => {
    const sampleData = {
      foo: 'bar',
      baz: [1, 2, 3],
    };

    return {
      success: true,
      contentType: 'json',
      content: sampleData,
      rawContent: JSON.stringify(sampleData, null, 2),
    };
  },
});
