import { createAction, createTextInputField, createJsonInputField } from '@lecca-io/toolkit';
import { z } from 'zod';
import { processTemplate } from '../shared/personalization';
import { templateUtils } from '../shared/template-manager';

export const textBuilder = createAction({
  id: 'abandonment-messages_action_text-builder',
  name: 'Abandonment Text Builder',
  description: 'Create and preview personalized abandonment text messages',
  inputConfig: [
    createTextInputField({
      id: 'name',
      label: 'Template Name',
      description: 'Name of the template for reference',
      placeholder: 'E.g. Cart Abandonment 30m',
      required: {
        missingMessage: 'Template name is required',
        missingStatus: 'warning',
      },
    }),
    createTextInputField({
      id: 'description',
      label: 'Description',
      description: 'Optional description of the template',
      placeholder: 'Add description (optional)',
    }),
    createTextInputField({
      id: 'content',
      label: 'Message Content',
      description: 'Message content with personalization variables in {{variable}} format',
      placeholder: 'Hi {{firstName}}, we noticed you left some items in your cart...',
      required: {
        missingMessage: 'Message content is required',
        missingStatus: 'warning',
      },
      multiline: true,
    }),
    createJsonInputField({
      id: 'testData',
      label: 'Test Data',
      description: 'Sample data for previewing the personalized message',
      placeholder: `{
  "customer": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  },
  "cart": {
    "totalValue": 99.99,
    "products": [
      {
        "name": "Premium Shoes",
        "price": 79.99,
        "quantity": 1
      },
      {
        "name": "Socks",
        "price": 9.99,
        "quantity": 2
      }
    ],
    "abandonedAt": "2023-06-01T14:30:00Z"
  }
}`,
    }),
    createJsonInputField({
      id: 'metadata',
      label: 'Additional Metadata',
      description: 'Optional metadata for the template',
      placeholder: `{
  "segment": "high-value-customers",
  "tags": ["cart", "abandonment", "high-value"],
  "language": "en",
  "defaultValues": {
    "firstName": "there",
    "productName": "items"
  }
}`,
    }),
  ],
  aiSchema: z.object({
    name: z.string().describe('The name of the template for reference'),
    description: z.string().optional().describe('Optional description of the template'),
    content: z.string().describe('The message content with personalization variables in {{variable}} format'),
    testData: z.string().optional().describe('Sample data for previewing the personalized message'),
    metadata: z.string().optional().describe('Optional metadata for the template'),
  }),
  run: async ({ configValue, prisma, workspaceId, projectId }) => {
    const { name, description, content, testData, metadata } = configValue;
    
    // Parse test data if provided
    let parsedTestData = {
      customer: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      },
      cart: {
        totalValue: 99.99,
        products: [
          {
            name: 'Premium Shoes',
            price: 79.99,
            quantity: 1
          },
          {
            name: 'Socks',
            price: 9.99,
            quantity: 2
          }
        ],
        abandonedAt: new Date().toISOString()
      }
    };
    
    if (testData) {
      try {
        parsedTestData = typeof testData === 'string' ? JSON.parse(testData) : testData;
      } catch (error) {
        // Use default test data if parsing fails
      }
    }
    
    // Parse metadata if provided
    let parsedMetadata = {
      defaultValues: {
        firstName: 'there',
        productName: 'items'
      }
    };
    
    if (metadata) {
      try {
        parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      } catch (error) {
        // Use default metadata if parsing fails
      }
    }
    
    // Create template
    const template = templateUtils.createTemplate({
      name,
      description,
      content,
      metadata: parsedMetadata,
      active: true,
    });
    
    // Extract variables from content
    const variables = template.variables || [];
    
    // Process template with test data
    const personalizedMessage = processTemplate(content, parsedTestData);
    
    // Validate the template
    const validation = templateUtils.validateTemplate(template);
    
    // Store template in database if valid
    let savedTemplate;
    if (validation.valid) {
      try {
        savedTemplate = await prisma.messageTemplate.create({
          data: {
            name: template.name,
            description: template.description,
            content: template.content,
            variables: template.variables,
            metadata: template.metadata,
            FK_workspaceId: workspaceId,
            FK_projectId: projectId,
            active: true,
          },
        });
      } catch (error) {
        // Handle database error
      }
    }
    
    return {
      template,
      personalizedMessage,
      variables,
      validation,
      savedTemplate,
    };
  },
  mockRun: async ({ configValue }) => {
    const { name, description, content, testData } = configValue;
    
    // Parse test data if provided
    let parsedTestData = {
      customer: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      },
      cart: {
        totalValue: 99.99,
        products: [
          {
            name: 'Premium Shoes',
            price: 79.99,
            quantity: 1
          },
          {
            name: 'Socks',
            price: 9.99,
            quantity: 2
          }
        ],
        abandonedAt: new Date().toISOString()
      }
    };
    
    if (testData) {
      try {
        parsedTestData = typeof testData === 'string' ? JSON.parse(testData) : testData;
      } catch (error) {
        // Use default test data if parsing fails
      }
    }
    
    // Create template
    const template = templateUtils.createTemplate({
      name,
      description,
      content,
      metadata: {
        defaultValues: {
          firstName: 'there',
          productName: 'items'
        }
      },
      active: true,
    });
    
    // Process template with test data
    const personalizedMessage = processTemplate(content, parsedTestData);
    
    // Extract variables from content
    const variables = template.variables || [];
    
    // Validate the template
    const validation = templateUtils.validateTemplate(template);
    
    return {
      template,
      personalizedMessage: personalizedMessage || 'Hi John, we noticed you left Premium Shoes in your cart. Complete your purchase now and get free shipping!',
      variables,
      validation: { valid: true, missingVariables: [] },
      savedTemplate: {
        id: 'tmpl_mock123',
        ...template,
        FK_workspaceId: 'workspace_mock',
        FK_projectId: 'project_mock',
      },
    };
  },
});

/**
 * Text template generator with AI assistance
 */
export const generateTextTemplates = createAction({
  id: 'abandonment-messages_action_generate-text-templates',
  name: 'Generate Abandonment Texts',
  description: 'Generate personalized abandonment text templates with AI assistance',
  inputConfig: [
    createTextInputField({
      id: 'segmentType',
      label: 'Customer Segment',
      description: 'Type of customer segment for template generation',
      placeholder: 'E.g. cart, browse, wishlist',
      required: {
        missingMessage: 'Customer segment is required',
        missingStatus: 'warning',
      },
    }),
    createTextInputField({
      id: 'productType',
      label: 'Product Type',
      description: 'Type of product being sold (optional)',
      placeholder: 'E.g. clothing, electronics, food',
    }),
    createTextInputField({
      id: 'tone',
      label: 'Message Tone',
      description: 'Desired tone for the message',
      placeholder: 'E.g. friendly, urgent, professional',
    }),
    createTextInputField({
      id: 'include',
      label: 'Elements to Include',
      description: 'Specific elements to include in the message',
      placeholder: 'E.g. discount, limited time, social proof',
    }),
    createTextInputField({
      id: 'exclude',
      label: 'Elements to Exclude',
      description: 'Specific elements to exclude from the message',
      placeholder: 'E.g. price, urgency',
    }),
    createTextInputField({
      id: 'maxLength',
      label: 'Maximum Length',
      description: 'Maximum character length for the message',
      placeholder: 'E.g. 160',
      inputType: 'number',
    }),
  ],
  aiSchema: z.object({
    segmentType: z.string().describe('The type of customer segment for template generation'),
    productType: z.string().optional().describe('The type of product being sold'),
    tone: z.string().optional().describe('The desired tone for the message'),
    include: z.string().optional().describe('Specific elements to include in the message'),
    exclude: z.string().optional().describe('Specific elements to exclude from the message'),
    maxLength: z.string().optional().describe('The maximum character length for the message'),
  }),
  run: async ({ configValue, aiProviders, workspaceId, prisma }) => {
    const { segmentType, productType, tone, include, exclude, maxLength } = configValue;
    
    // Generate prompt for AI
    const prompt = `
Generate 3 personalized abandonment message templates for ${segmentType} abandonment.
${productType ? `The product type is: ${productType}.` : ''}
${tone ? `The tone should be: ${tone}.` : ''}
${include ? `Include these elements: ${include}.` : ''}
${exclude ? `Exclude these elements: ${exclude}.` : ''}
${maxLength ? `Maximum length: ${maxLength} characters.` : ''}

Each template should:
1. Use variables like {{firstName}}, {{productName}}, {{cartTotal}}, etc.
2. Be personalized based on customer behavior
3. Include a clear call to action
4. Be concise and engaging
5. Focus on recovering the abandoned ${segmentType}

Format each template as:
Template 1:
[Template text with {{variables}}]

Template 2:
[Template text with {{variables}}]

Template 3:
[Template text with {{variables}}]
`;
    
    // Get AI provider client
    const { aiProviderClient, isUsingWorkspaceLlmConnection } =
      await aiProviders.getAiLlmProviderClient({
        aiProvider: 'openai',
        llmModel: 'gpt-4',
        workspaceId,
      });
    
    // Generate text templates
    const { text } = await aiProviders.generateText({
      model: aiProviderClient,
      messages: [
        {
          role: 'system',
          content: 'You are an expert in marketing and personalized messaging for e-commerce. Your job is to create effective, personalized abandonment message templates that use customer behavior data variables.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });
    
    // Parse the response
    const templatePattern = /Template \d+:\s*([^\n]+)/g;
    const templates = [];
    let match;
    
    while ((match = templatePattern.exec(text)) !== null) {
      if (match[1]) {
        templates.push(match[1].trim());
      }
    }
    
    // If no templates found, use the entire response
    if (templates.length === 0) {
      templates.push(text.trim());
    }
    
    // Create template objects
    const templateObjects = templates.map((content, index) => {
      return templateUtils.createTemplate({
        name: `${segmentType.charAt(0).toUpperCase() + segmentType.slice(1)} Abandonment ${index + 1}`,
        description: `AI-generated template for ${segmentType} abandonment ${tone ? `with ${tone} tone` : ''}`,
        content,
        metadata: {
          segment: segmentType,
          tags: [segmentType, 'abandonment', 'ai-generated', ...(tone ? [tone] : [])],
          defaultValues: {
            firstName: 'there',
            productName: 'items',
            cartTotal: '$0.00',
          },
        },
        active: true,
      });
    });
    
    return {
      templates: templateObjects,
      rawResponse: text,
    };
  },
  mockRun: async ({ configValue }) => {
    const { segmentType, tone } = configValue;
    
    // Sample templates based on segment type
    const templates = [];
    
    if (segmentType === 'cart') {
      templates.push(
        'Hi {{firstName}}! Don\'t miss out on {{productName}} in your cart. Complete your purchase now and enjoy free shipping on orders over $50!',
        'Hey {{firstName}}, your cart total of {{cartTotal}} is waiting for you! Use code COMEBACK10 for 10% off when you complete your purchase today.',
        '{{firstName}}, we saved {{productName}} in your cart! But hurry - popular items sell out fast. Secure yours now with our 30-day money-back guarantee.'
      );
    } else if (segmentType === 'browse') {
      templates.push(
        'Hi {{firstName}}! Still thinking about {{productName}}? It\'s getting a lot of attention lately. Take another look before it sells out!',
        '{{firstName}}, we noticed you checked out {{productName}}. Want a closer look? Come back and we\'ll give you 10% off your first purchase!',
        'Hey {{firstName}}! {{productName}} is waiting for you. Our customers give it 4.8/5 stars! Come see why everyone loves it.'
      );
    } else if (segmentType === 'wishlist') {
      templates.push(
        'Great news, {{firstName}}! {{productName}} from your wishlist is now back in stock! Grab it before it\'s gone again.',
        'Hi {{firstName}}! Remember {{productName}} you saved to your wishlist? It\'s now on sale for a limited time!',
        '{{firstName}}, you have {{itemCount}} items in your wishlist! Complete your collection today and get free shipping on orders over $75.'
      );
    } else {
      templates.push(
        'Hi {{firstName}}! We noticed you were interested in our products. Come back and find something you\'ll love!',
        'Hey {{firstName}}! We miss you. Come back and enjoy 10% off your next purchase with code WELCOME10.',
        '{{firstName}}, we have some new items we think you\'ll love based on your browsing history. Come check them out!'
      );
    }
    
    // Create template objects
    const templateObjects = templates.map((content, index) => {
      return templateUtils.createTemplate({
        name: `${segmentType.charAt(0).toUpperCase() + segmentType.slice(1)} Abandonment ${index + 1}`,
        description: `AI-generated template for ${segmentType} abandonment ${tone ? `with ${tone} tone` : ''}`,
        content,
        metadata: {
          segment: segmentType,
          tags: [segmentType, 'abandonment', 'ai-generated', ...(tone ? [tone] : [])],
          defaultValues: {
            firstName: 'there',
            productName: 'items',
            cartTotal: '$0.00',
          },
        },
        active: true,
      });
    });
    
    return {
      templates: templateObjects,
      rawResponse: templates.join('\n\n'),
    };
  },
});