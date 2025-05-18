import {
  FieldConfig,
  createDynamicSelectInputField,
  createNestedFields,
} from '@lecca-io/toolkit';
import { Client } from '@notionhq/client';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

export const shared = {
  fields: {
    dynamicSelectDatabase: createDynamicSelectInputField({
      id: 'databaseId',
      label: 'Database',
      description: 'Select a database',
      required: {
        missingMessage: 'Database is required',
        missingStatus: 'warning',
      },
      _getDynamicValues: async ({ connection }) => {
        const notionLib = shared.notionLib({
          accessToken: connection.accessToken,
        });

        const databases = await notionLib.search({
          filter: {
            property: 'object',
            value: 'database',
          },
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time',
          },
        });

        return databases.results?.map((db) => {
          return {
            label: ((db as any).title as DBNotionTitle)?.[0]?.plain_text ?? '-',
            value: db.id,
          };
        });
      },
    }),
    dynamicSelectPageInDatabase: createDynamicSelectInputField({
      id: 'page',
      label: 'Page',
      description: 'Select a page by ID',
      loadOptions: {
        dependsOn: ['databaseId'],
        forceRefresh: true,
      },
      required: {
        missingMessage: 'Page is required',
        missingStatus: 'warning',
      },
      _getDynamicValues: async ({ connection, extraOptions }) => {
        const notionLib = shared.notionLib({
          accessToken: connection.accessToken,
        });

        const databaseId = extraOptions?.databaseId;

        if (databaseId === undefined) {
          throw new Error('Database ID is required');
        }

        const pages = await notionLib.databases.query({
          database_id: databaseId,
        });

        return pages.results?.map((page) => {
          // Find the title property by looking for a property with type "title"
          const properties = (page as any).properties || {};
          let pageTitle = '-';

          try {
            // Look for the property with type "title" - this is the most reliable approach
            const titlePropertyEntry = Object.entries(properties).find(
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              ([_, prop]: [string, any]) => prop.type === 'title',
            ) as any;

            if (titlePropertyEntry) {
              const [propName, titleProp] = titlePropertyEntry;
              if (
                titleProp.title &&
                Array.isArray(titleProp.title) &&
                titleProp.title.length > 0
              ) {
                // Try getting plain_text first, then fall back to text.content
                pageTitle =
                  titleProp.title[0]?.plain_text ||
                  titleProp.title[0]?.text?.content ||
                  `[${propName}]` || // Show property name as fallback
                  '-';
              }
            }
          } catch (error) {
            console.error('Error extracting page title:', error);
          }

          return {
            label: pageTitle,
            value: page.id,
          };
        });
      },
    }),
    dynamicSelectPropertiesInPage: createNestedFields({
      id: 'properties',
      label: 'Properties',
      description: 'Select properties to update',
      occurenceType: 'multiple',
      fields: [
        {
          id: 'key',
          label: 'Property Name',
          description: 'Select properties to update',
          inputType: 'dynamic-select',
          loadOptions: {
            dependsOn: ['page'],
            forceRefresh: true,
          },
          required: {
            missingMessage: 'Properties are required',
            missingStatus: 'warning',
          },
          _getDynamicValues: async ({ connection, extraOptions }) => {
            const notionLib = shared.notionLib({
              accessToken: connection.accessToken,
            });

            const pageId = extraOptions?.page;

            if (pageId === undefined) {
              throw new Error('Page is required');
            }

            const page = await notionLib.pages.retrieve({
              page_id: pageId,
            });

            const properties = Object.keys(
              (page as PageObjectResponse).properties,
            ).map((key) => {
              return {
                label: key,
                value: key,
              };
            });

            return properties;
          },
        },
        {
          id: 'value',
          label: 'Value',
          description: 'Enter the new value for the property',
          placeholder: 'Enter the new value',
          inputType: 'text',
        },
      ],
    }),
    dynamicSelectPage: createDynamicSelectInputField({
      id: 'page',
      label: 'Page',
      description: 'Select a page ID.',
      required: {
        missingMessage: 'Page is required',
        missingStatus: 'warning',
      },
      _getDynamicValues: async ({ connection }) => {
        const notionLib = shared.notionLib({
          accessToken: connection.accessToken,
        });

        const pages = await notionLib.search({
          filter: {
            property: 'object',
            value: 'page',
          },
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time',
          },
        });

        return pages.results?.map((page) => {
          // Find the title property by looking for a property with type "title"
          const properties = (page as any).properties || {};
          let pageTitle = '-';

          try {
            // Look for the property with type "title" - this is the most reliable approach
            const titlePropertyEntry = Object.entries(properties).find(
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              ([_, prop]: [string, any]) => prop.type === 'title',
            ) as any;

            if (titlePropertyEntry) {
              const [propName, titleProp] = titlePropertyEntry;
              if (
                titleProp.title &&
                Array.isArray(titleProp.title) &&
                titleProp.title.length > 0
              ) {
                // Try getting plain_text first, then fall back to text.content
                pageTitle =
                  titleProp.title[0]?.plain_text ||
                  titleProp.title[0]?.text?.content ||
                  `[${propName}]` || // Show property name as fallback
                  '-';
              }
            }
          } catch (error) {
            console.error('Error extracting page title:', error);
          }

          return {
            label: pageTitle,
            value: page.id,
          };
        });
      },
    }),
    dynamicGetDatabaseProperties: {
      id: 'properties',
      label: 'Properties',
      description: 'Enter the properties for the new database item',
      inputType: 'map',
      mapOptions: {
        disableKeyInput: true,
      },
      occurenceType: 'dynamic',
      loadOptions: {
        dependsOn: ['databaseId'],
        forceRefresh: true,
      },
      required: {
        missingMessage: 'Please provide properties for the database item',
        missingStatus: 'warning',
      },
      _getDynamicValues: async ({ connection, extraOptions }) => {
        const notionLib = shared.notionLib({
          accessToken: connection.accessToken,
        });

        const databaseId = extraOptions?.databaseId;

        if (databaseId === undefined) {
          throw new Error('Database ID is required');
        }

        const database = await notionLib.databases.retrieve({
          database_id: databaseId,
        });

        return Object.entries(database.properties).map(([key]) => {
          return {
            label: key,
            value: '',
          };
        });
      },
    } as FieldConfig,
  },
  buildPropertyMappingsForDatabase: async ({
    databaseId,
    properties,
    notionLib,
  }: {
    databaseId: string;
    properties: { key: string; value: string }[];
    notionLib: Client;
  }) => {
    const database = await notionLib.databases.retrieve({
      database_id: databaseId,
    });

    const notionDatabaseProperties = database.properties;

    //We want to match the properties key to the database properties key.

    const propertyMappings: Record<string, any> = {};
    properties.forEach(({ key, value }) => {
      const databaseProperty = notionDatabaseProperties[key];

      if (databaseProperty === undefined) {
        throw new Error(
          `${key} is not a valid property for the notion database`,
        );
      }

      if (value != null && value != '') {
        switch (databaseProperty.type) {
          case 'checkbox':
            propertyMappings[key] = { checkbox: value };
            break;
          case 'date':
            propertyMappings[key] = { date: { start: value } };
            break;
          case 'email':
            propertyMappings[key] = { email: value };
            break;
          case 'select':
            propertyMappings[key] = { select: { name: value } };
            break;
          case 'multi_select':
            propertyMappings[key] = { multi_select: [{ name: value }] };
            break;
          case 'status':
            propertyMappings[key] = { status: { name: value } };
            break;
          case 'number':
            propertyMappings[key] = { number: Number(value) };
            break;
          case 'phone_number':
            propertyMappings[key] = { phone_number: value };
            break;
          case 'rich_text':
            propertyMappings[key] = {
              rich_text: [{ type: 'text', text: { content: value } }],
            };
            break;
          case 'title':
            propertyMappings[key] = {
              title: [{ type: 'text', text: { content: value } }],
            };
            break;
          case 'url':
            propertyMappings[key] = { url: value };
            break;
          case 'people':
            propertyMappings[key] = { people: [{ object: 'user', id: value }] };
            break;
          case 'formula':
            propertyMappings[key] = { formula: { expression: value } };
            break;
          default:
            throw new Error(
              `Property type ${databaseProperty.type} not supported. If you see this error, please contact support. Should not happen.`,
            );
        }
      }
    });

    return propertyMappings;
  },
  notionLib({ accessToken }: { accessToken: string }) {
    const notion = new Client({
      auth: accessToken,
    });
    return notion;
  },
  extractTextFromBlocks: async (
    blocks: any[],
    notionLib: any,
  ): Promise<string> => {
    if (!blocks || blocks.length === 0) {
      return '';
    }

    let textContent = '';

    for (const block of blocks) {
      if (!block || !block.type) {
        continue;
      }

      try {
        // Extract text based on block type
        const blockContent = block[block.type];
        if (!blockContent) {
          continue;
        }

        // Most block types have a 'rich_text' property but some have 'text'
        const richTextArray = blockContent.rich_text || blockContent.text;

        if (richTextArray && Array.isArray(richTextArray)) {
          let extractedText = '';

          // Extract text from the rich text array
          for (const item of richTextArray) {
            if (item && item.plain_text) {
              extractedText += item.plain_text;
            } else if (item && item.text && item.text.content) {
              extractedText += item.text.content;
            }
          }

          // Format the extracted text based on block type
          switch (block.type) {
            case 'paragraph':
              textContent += extractedText + '\n\n';
              break;
            case 'heading_1':
              textContent += extractedText + '\n\n';
              break;
            case 'heading_2':
              textContent += extractedText + '\n\n';
              break;
            case 'heading_3':
              textContent += extractedText + '\n\n';
              break;
            case 'bulleted_list_item':
              textContent += '• ' + extractedText + '\n';
              break;
            case 'numbered_list_item':
              textContent += '1. ' + extractedText + '\n';
              break;
            case 'to_do': {
              const checkbox = blockContent.checked ? '[x]' : '[ ]';
              textContent += checkbox + ' ' + extractedText + '\n';
              break;
            }
            case 'toggle':
              textContent += extractedText + '\n';
              break;
            case 'code':
              textContent += '```' + (blockContent.language || '') + '\n';
              textContent += extractedText + '\n';
              textContent += '```\n\n';
              break;
            case 'quote':
              textContent += '> ' + extractedText + '\n\n';
              break;
            case 'callout':
              textContent += extractedText + '\n\n';
              break;
            case 'divider':
              textContent += '---\n\n';
              break;
            case 'table_of_contents':
              textContent += '[Table of Contents]\n\n';
              break;
            default:
              // For any other block types
              if (extractedText) {
                textContent += extractedText + '\n';
              }
          }
        }
      } catch (error) {
        console.error(`Error processing block of type ${block.type}:`, error);
      }

      // Check if block has children and recursively get their text
      if (block.has_children) {
        try {
          const childBlocks = await notionLib.blocks.children.list({
            block_id: block.id,
          });

          if (childBlocks && childBlocks.results) {
            textContent += await shared.extractTextFromBlocks(
              childBlocks.results,
              notionLib,
            );
          }
        } catch (error) {
          console.error(`Error fetching child blocks for ${block.id}:`, error);
        }
      }
    }

    return textContent;
  },
};

type DBNotionTitle = {
  type: 'text';
  text: unknown;
  annotations: unknown;
  plain_text: string;
  href: null | string;
}[];
