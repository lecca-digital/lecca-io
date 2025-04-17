import { createAction } from '@lecca-io/toolkit';
import { z } from 'zod';

import { shared } from '../shared/notion.shared';

export const getPageText = createAction({
  id: 'notion_action_get-page-text',
  name: 'Get Page Text',
  description: 'Extracts all text content from a page as a single string',
  inputConfig: [shared.fields.dynamicSelectPage],
  aiSchema: z.object({
    page: z.string().describe('The ID of the page to retrieve.'),
  }),
  run: async ({ connection, configValue }): Promise<any> => {
    const { page } = configValue;

    const notionLib = shared.notionLib({
      accessToken: connection.accessToken,
    });

    // Fetch page content (blocks)
    const blockChildren = await notionLib.blocks.children.list({
      block_id: page,
    });

    // Extract text from blocks recursively
    const allText = await shared.extractTextFromBlocks(
      blockChildren.results,
      notionLib,
    );

    // Create a plain text version by removing formatting
    const plainText = allText
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[.*?\]/g, '') // Remove link text
      .replace(/[•*>-]/g, '') // Remove bullets and other markdown chars
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
      .trim();
    
    // Fetch the page to get its title
    const pageDetails = await notionLib.pages.retrieve({
      page_id: page,
    });

    // Extract page title
    let pageTitle = '';
    try {
      // Properly type the properties to avoid TypeScript errors
      interface NotionProperty {
        type: string;
        title?: {
          plain_text?: string;
          text?: {
            content: string;
          };
        }[];
      }

      const properties = (pageDetails as any).properties || {};
      
      // First try to find a property of type 'title'
      const titleProp = Object.entries(properties).find(
        ([_, value]) => (value as NotionProperty).type === 'title'
      );
      
      // If no title property found, look for properties named 'Name' or 'Title'
      const propertyEntry = titleProp || 
        Object.entries(properties).find(
          ([key]) => key === 'Name' || key === 'Title'
        );

      if (propertyEntry) {
        const [_, property] = propertyEntry;
        
        // Now we can safely access the title array with proper typing
        const titleArray = (property as NotionProperty).title;
        if (titleArray && titleArray.length > 0) {
          pageTitle = titleArray[0]?.plain_text || 
                     titleArray[0]?.text?.content || '';
        }
      }
    } catch (error) {
      console.error('Error extracting page title:', error);
    }

    return {
      pageId: page,
      pageTitle,
      text: plainText,
    };
  },
  mockRun: async (): Promise<any> => {
    return {
      pageId: 'mock-page-id',
      pageTitle: 'Mock Page Title',
      text: 'This is a mock paragraph block.',
    };
  },
});
