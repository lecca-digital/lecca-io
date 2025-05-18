import { createApp } from '@lecca-io/toolkit';

import { addDatabaseItem } from './actions/add-database-item.action';
import { appendPage } from './actions/append-to-page.action';
import { createPage } from './actions/create-page.action';
import { getDatabase } from './actions/get-database.action';
import { getDatabaseItemText } from './actions/get-database-item-text.action';
import { getDatabaseItems } from './actions/get-database-items.action';
import { getPageContents } from './actions/get-page-contents.action';
import { getPageText } from './actions/get-page-text.action';
import { listDatabases } from './actions/list-databases.action';
import { updateDatabaseItem } from './actions/update-database-item.action';
import { notionOAuth2 } from './connections/notion.oauth2';
import { newDatabaseItem } from './triggers/new-database-item.trigger';
import { pageUpdated } from './triggers/page-updated.trigger';
import { updatedDatabaseItem } from './triggers/updated-database-item.trigger';

export const notion = createApp({
  id: 'notion',
  name: 'Notion',
  description: 'Notion is a space where you can think, write, and plan.',
  logoUrl: 'https://lecca-io.s3.us-east-2.amazonaws.com/assets/apps/notion.svg',
  actions: [
    addDatabaseItem,
    updateDatabaseItem,
    createPage,
    appendPage,
    getPageContents,
    getPageText,
    listDatabases,
    getDatabase,
    getDatabaseItems,
    getDatabaseItemText,
  ],
  triggers: [pageUpdated, newDatabaseItem, updatedDatabaseItem],
  connections: [notionOAuth2],
});
