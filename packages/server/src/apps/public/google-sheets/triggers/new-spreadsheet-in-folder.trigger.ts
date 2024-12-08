import { InputConfig } from '@/apps/lib/input-config';
import { RunTriggerArgs, TimeBasedPollTrigger } from '@/apps/lib/trigger';
import { dateStringToMilliOrNull } from '@/apps/utils/date-string-to-milli-or-null';

import { GoogleSheets } from '../google-sheets.app';
import { GoogleSheetsInFolderPollType } from '../types/google-sheets.type';

export class NewSpreadsheetInFolder extends TimeBasedPollTrigger {
  app: GoogleSheets;
  id = 'google-sheets_trigger_new-spreadsheet-in-folder';
  name = 'New Spreadsheet in Folder';
  description =
    'Triggers when a new spreadsheet is created inside selected folder (not subfolders).';
  inputConfig: InputConfig[] = [
    {
      ...this.app.dynamicSelectFolder(),
      description: 'Select the folder to watch for new spreadsheets',
    },
  ];

  async run({
    connection,
    configValue,
  }: RunTriggerArgs<ConfigValue>): Promise<GoogleSheetsInFolderPollType[]> {
    const googleDrive = await this.app.googleDrive({
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
    });

    // Search for documents
    const newestSpreadsheets = await googleDrive.files.list({
      q: `mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and '${configValue.folder}' in parents`,
      pageSize: 10,
      fields: 'nextPageToken, files(id, name, createdTime)',
      orderBy: 'createdTime desc',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    // Fetch the folder name
    const folderResponse = await googleDrive.files.get({
      fileId: configValue.folder,
      fields: 'name',
      supportsAllDrives: true,
    });

    const folderName = folderResponse?.data?.name ?? '';

    return (
      newestSpreadsheets?.data?.files?.map((file) => ({
        spreadsheetId: file.id,
        folderId: configValue.folder,
        createdTime: file.createdTime,
        spreadsheetTitle: file.name,
        folderTitle: folderName,
      })) ?? []
    );
  }

  async mockRun(): Promise<GoogleSheetsInFolderPollType[]> {
    return [
      {
        spreadsheetId: 'mock-spreadsheet-id',
        folderId: 'mock-folder-id',
        spreadsheetTitle: 'Mock Spreadsheet Title',
        folderTitle: 'Mock Folder Title',
        createdTime: new Date().toISOString(),
      },
    ];
  }

  extractTimestampFromResponse({
    response,
  }: {
    response: GoogleSheetsInFolderPollType;
  }) {
    if (response.createdTime) {
      return dateStringToMilliOrNull(response.createdTime);
    } else {
      return null;
    }
  }
}

type ConfigValue = {
  folder: string;
};
