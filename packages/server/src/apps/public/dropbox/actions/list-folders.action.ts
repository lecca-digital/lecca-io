import { z } from 'zod';

import { Action, RunActionArgs } from '@/apps/lib/action';
import { InputConfig } from '@/apps/lib/input-config';

import { Dropbox } from '../dropbox.app';

export class DropboxListFolders extends Action {
  app: Dropbox;
  id = 'dropbox_action_list-folders';
  name = 'List Folders';
  description = 'List folders from Dropbox account';
  aiSchema = z.object({
    path: z
      .string()
      .min(1)
      .nullable()
      .optional()
      .describe(
        'The path of the folder to list contents from. Leave empty if you want to retrieve the root folder',
      ),
  });
  inputConfig: InputConfig[] = [
    {
      id: 'path',
      label: 'Folder Path',
      description:
        'The path of the folder to list contents from. Leave empty if you want to retrieve the root folder',
      inputType: 'text',
      placeholder: 'Leave empty to use root folder',
    },
  ];

  async run({
    configValue,
    connection,
    workspaceId,
  }: RunActionArgs<ConfigValue>): Promise<Response> {
    const url = 'https://api.dropboxapi.com/2/files/list_folder';

    const data = {
      path: configValue.path || '',
      recursive: false, // Adjust this if you want recursive listing
    };

    const result = await this.app.http.loggedRequest({
      method: 'POST',
      url,
      data,
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
      },
      workspaceId,
    });

    // Filter only folder entries
    if (result?.data) {
      const folderEntries = result.data.entries.filter(
        (entry: any) => entry['.tag'] === 'folder',
      );
      return { folders: folderEntries };
    } else {
      throw new Error('Failed to list folders');
    }
  }

  async mockRun(): Promise<Response> {
    return {
      folders: [
        {
          name: 'Folder 1',
          id: 'id:abc123',
          path_lower: '/folder1',
          path_display: '/folder1',
          '.tag': 'folder',
        },
        // Add more mock folders as needed
      ],
    };
  }
}

type ConfigValue = z.infer<DropboxListFolders['aiSchema']>;

type Response = {
  folders: Array<{
    name: string;
    id: string;
    path_lower: string;
    path_display: string;
    '.tag': 'file' | 'folder';
  }>;
};
