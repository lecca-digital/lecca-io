import { z } from 'zod';
import { extractVariablesFromTemplate, PersonalizationVariable, defaultPersonalizationVariables } from './personalization';

/**
 * Message template schema
 */
export const messageTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().describe('Name of the template'),
  description: z.string().optional().describe('Description of the template'),
  content: z.string().describe('Template content with variables in {{variable}} format'),
  variables: z.array(z.string()).optional().describe('List of variables used in the template'),
  metadata: z.object({
    segment: z.string().optional().describe('Customer segment this template is designed for'),
    tags: z.array(z.string()).optional().describe('Tags for organizing templates'),
    defaultValues: z.record(z.string()).optional().describe('Default values for variables'),
    language: z.string().optional().describe('Template language (ISO code)'),
    channel: z.string().optional().default('sms').describe('Messaging channel (sms, email, etc.)'),
    version: z.number().optional().default(1).describe('Template version'),
    previewText: z.string().optional().describe('Preview text for template selection'),
  }).optional(),
  active: z.boolean().optional().default(true).describe('Whether this template is active'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
});

export type MessageTemplate = z.infer<typeof messageTemplateSchema>;

/**
 * Customer segment schema
 */
export const customerSegmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().describe('Name of the segment'),
  description: z.string().optional().describe('Description of the segment'),
  rules: z.array(
    z.object({
      field: z.string().describe('Field to evaluate'),
      operator: z.enum([
        'equals',
        'notEquals',
        'contains',
        'notContains',
        'startsWith',
        'endsWith',
        'greaterThan',
        'lessThan',
        'between',
        'exists',
        'notExists',
      ]).describe('Comparison operator'),
      value: z.any().describe('Value to compare against'),
      valueType: z.enum(['string', 'number', 'boolean', 'date', 'array']).optional(),
    })
  ).describe('Segment rules'),
  metadata: z.object({
    tags: z.array(z.string()).optional().describe('Tags for organizing segments'),
    parentSegmentId: z.string().optional().describe('Parent segment ID for hierarchical segments'),
    priority: z.number().optional().default(0).describe('Segment priority for template selection'),
    source: z.string().optional().describe('Source of the segment definition'),
  }).optional(),
  active: z.boolean().optional().default(true).describe('Whether this segment is active'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
});

export type CustomerSegment = z.infer<typeof customerSegmentSchema>;

/**
 * AB Test configuration schema
 */
export const abTestSchema = z.object({
  id: z.string().optional(),
  name: z.string().describe('Name of the A/B test'),
  description: z.string().optional().describe('Description of the A/B test'),
  templateA: z.string().describe('ID of the first template'),
  templateB: z.string().describe('ID of the second template'),
  splitRatio: z.number().min(1).max(99).default(50).describe('Percentage of traffic to template A'),
  startDate: z.string().describe('Start date of the test'),
  endDate: z.string().optional().describe('End date of the test'),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).default('draft'),
  winningTemplate: z.string().optional().describe('ID of the winning template after test completion'),
  metadata: z.object({
    segment: z.string().optional().describe('Segment ID this test applies to'),
    tags: z.array(z.string()).optional().describe('Tags for organizing tests'),
    metrics: z.object({
      primary: z.enum(['reads', 'clicks', 'responses', 'conversions']).default('conversions'),
      secondary: z.array(z.enum(['reads', 'clicks', 'responses', 'conversions'])).optional(),
    }).optional(),
  }).optional(),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
});

export type ABTest = z.infer<typeof abTestSchema>;

/**
 * Template creation utilities
 */
export const templateUtils = {
  /**
   * Create a new message template
   */
  createTemplate(templateData: Omit<MessageTemplate, 'id' | 'variables' | 'createdAt' | 'updatedAt'>): MessageTemplate {
    const now = new Date().toISOString();
    
    // Extract variables from content
    const variables = extractVariablesFromTemplate(templateData.content);
    
    return {
      id: `tmpl_${Date.now()}`,
      ...templateData,
      variables,
      createdAt: now,
      updatedAt: now,
    };
  },
  
  /**
   * Update an existing template
   */
  updateTemplate(
    template: MessageTemplate,
    updates: Partial<Omit<MessageTemplate, 'id' | 'createdAt'>>
  ): MessageTemplate {
    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    // Update variables if content changed
    if (updates.content) {
      updatedTemplate.variables = extractVariablesFromTemplate(updates.content);
    }
    
    return updatedTemplate;
  },
  
  /**
   * Create a sample template with realistic content
   */
  createSampleTemplate(type: 'cart' | 'browse' | 'wishlist' = 'cart'): MessageTemplate {
    const now = new Date().toISOString();
    let content = '';
    let name = '';
    
    switch (type) {
      case 'cart':
        name = 'Abandoned Cart Reminder';
        content = 'Hi {{firstName}}, we noticed you left {{productName}} in your cart {{abandonedTime}}. Complete your purchase now and get free shipping!';
        break;
      case 'browse':
        name = 'Product Browsing Follow-up';
        content = 'Hi {{firstName}}, still thinking about {{productName}}? It's getting a lot of attention lately. Take another look before it sells out!';
        break;
      case 'wishlist':
        name = 'Wishlist Reminder';
        content = 'Hi {{firstName}}, {{productName}} from your wishlist is now back in stock! Grab it before it's gone again.';
        break;
    }
    
    // Extract variables from content
    const variables = extractVariablesFromTemplate(content);
    
    return {
      id: `tmpl_${Date.now()}`,
      name,
      description: `Default ${type} abandonment template`,
      content,
      variables,
      metadata: {
        segment: type,
        tags: [type, 'default', 'abandonment'],
        defaultValues: {
          firstName: 'there',
          productName: 'the items',
          abandonedTime: 'recently',
        },
        language: 'en',
        channel: 'sms',
        version: 1,
        previewText: content.substring(0, 50) + '...',
      },
      active: true,
      createdAt: now,
      updatedAt: now,
    };
  },
  
  /**
   * Validate a template against available personalization variables
   */
  validateTemplate(
    template: MessageTemplate,
    availableVariables: PersonalizationVariable[] = defaultPersonalizationVariables
  ): { valid: boolean; missingVariables: string[] } {
    if (!template.content) {
      return { valid: false, missingVariables: [] };
    }
    
    const templateVariables = extractVariablesFromTemplate(template.content);
    const availableVariableNames = availableVariables.map(v => v.name);
    
    const missingVariables = templateVariables.filter(
      v => !availableVariableNames.includes(v)
    );
    
    return {
      valid: missingVariables.length === 0,
      missingVariables,
    };
  },
};

/**
 * Segment utilities
 */
export const segmentUtils = {
  /**
   * Create a customer segment
   */
  createSegment(segmentData: Omit<CustomerSegment, 'id' | 'createdAt' | 'updatedAt'>): CustomerSegment {
    const now = new Date().toISOString();
    
    return {
      id: `seg_${Date.now()}`,
      ...segmentData,
      createdAt: now,
      updatedAt: now,
    };
  },
  
  /**
   * Create sample segments
   */
  createSampleSegments(): CustomerSegment[] {
    return [
      // High-value cart abandoners
      segmentUtils.createSegment({
        name: 'High-Value Cart Abandoners',
        description: 'Customers who abandoned carts with value over $100',
        rules: [
          {
            field: 'cart.totalValue',
            operator: 'greaterThan',
            value: 100,
            valueType: 'number',
          },
          {
            field: 'cart.abandonedAt',
            operator: 'exists',
            value: true,
          },
          {
            field: 'cart.completedAt',
            operator: 'notExists',
            value: true,
          },
        ],
        metadata: {
          tags: ['cart', 'high-value', 'abandonment'],
          priority: 10,
        },
      }),
      
      // Recent cart abandoners
      segmentUtils.createSegment({
        name: 'Recent Cart Abandoners',
        description: 'Customers who abandoned carts within the last hour',
        rules: [
          {
            field: 'cart.abandonedAt',
            operator: 'greaterThan',
            value: 'now-1h',
            valueType: 'date',
          },
          {
            field: 'cart.completedAt',
            operator: 'notExists',
            value: true,
          },
        ],
        metadata: {
          tags: ['cart', 'recent', 'abandonment'],
          priority: 5,
        },
      }),
      
      // Repeat customers with abandoned cart
      segmentUtils.createSegment({
        name: 'Repeat Customers with Abandoned Cart',
        description: 'Returning customers who have abandoned their cart',
        rules: [
          {
            field: 'customer.orderCount',
            operator: 'greaterThan',
            value: 0,
            valueType: 'number',
          },
          {
            field: 'cart.abandonedAt',
            operator: 'exists',
            value: true,
          },
          {
            field: 'cart.completedAt',
            operator: 'notExists',
            value: true,
          },
        ],
        metadata: {
          tags: ['cart', 'repeat-customer', 'abandonment'],
          priority: 8,
        },
      }),
      
      // Product browsers (visited but didn't add to cart)
      segmentUtils.createSegment({
        name: 'Product Browsers',
        description: 'Customers who viewed products but didn\'t add to cart',
        rules: [
          {
            field: 'customer.productViews',
            operator: 'greaterThan',
            value: 2,
            valueType: 'number',
          },
          {
            field: 'cart.products',
            operator: 'equals',
            value: [],
            valueType: 'array',
          },
        ],
        metadata: {
          tags: ['browse', 'no-cart', 'abandonment'],
          priority: 3,
        },
      }),
      
      // Wishlist abandoners
      segmentUtils.createSegment({
        name: 'Wishlist Abandoners',
        description: 'Customers with items in wishlist for over 7 days',
        rules: [
          {
            field: 'customer.wishlist',
            operator: 'exists',
            value: true,
          },
          {
            field: 'customer.wishlistUpdatedAt',
            operator: 'lessThan',
            value: 'now-7d',
            valueType: 'date',
          },
        ],
        metadata: {
          tags: ['wishlist', 'abandonment'],
          priority: 2,
        },
      }),
    ];
  },
  
  /**
   * Evaluate if customer data matches segment rules
   */
  matchesSegment(
    data: {
      customer?: Record<string, any>;
      cart?: Record<string, any>;
      order?: Record<string, any>;
      custom?: Record<string, any>;
    },
    segment: CustomerSegment
  ): boolean {
    // If no rules, assume match
    if (!segment.rules || segment.rules.length === 0) {
      return true;
    }
    
    // Check each rule
    return segment.rules.every(rule => {
      // Determine data source and field
      let sourceData: any;
      let fieldPath: string;
      
      if (rule.field.startsWith('customer.')) {
        sourceData = data.customer;
        fieldPath = rule.field.substring('customer.'.length);
      } else if (rule.field.startsWith('cart.')) {
        sourceData = data.cart;
        fieldPath = rule.field.substring('cart.'.length);
      } else if (rule.field.startsWith('order.')) {
        sourceData = data.order;
        fieldPath = rule.field.substring('order.'.length);
      } else if (rule.field.startsWith('custom.')) {
        sourceData = data.custom;
        fieldPath = rule.field.substring('custom.'.length);
      } else {
        // Default to customer
        sourceData = data.customer;
        fieldPath = rule.field;
      }
      
      // Extract field value
      const fieldValue = fieldPath.split('.').reduce((obj, part) => obj?.[part], sourceData);
      
      // Handle date comparisons with relative dates
      if (rule.valueType === 'date' && typeof rule.value === 'string' && rule.value.startsWith('now')) {
        const parts = rule.value.match(/now(-|\+)(\d+)([dhms])/);
        if (parts) {
          const [, op, amount, unit] = parts;
          const now = new Date();
          let milliseconds = parseInt(amount, 10);
          
          switch (unit) {
            case 'd': milliseconds *= 24 * 60 * 60 * 1000; break;
            case 'h': milliseconds *= 60 * 60 * 1000; break;
            case 'm': milliseconds *= 60 * 1000; break;
            case 's': milliseconds *= 1000; break;
          }
          
          const compareDate = new Date(now.getTime() + (op === '-' ? -milliseconds : milliseconds));
          const fieldDate = new Date(fieldValue);
          
          switch (rule.operator) {
            case 'greaterThan': return fieldDate > compareDate;
            case 'lessThan': return fieldDate < compareDate;
            default: return fieldDate.getTime() === compareDate.getTime();
          }
        }
      }
      
      // Handle normal comparisons
      switch (rule.operator) {
        case 'equals':
          return fieldValue === rule.value;
        case 'notEquals':
          return fieldValue !== rule.value;
        case 'contains':
          if (Array.isArray(fieldValue)) {
            return fieldValue.includes(rule.value);
          }
          if (typeof fieldValue === 'string') {
            return fieldValue.includes(String(rule.value));
          }
          return false;
        case 'notContains':
          if (Array.isArray(fieldValue)) {
            return !fieldValue.includes(rule.value);
          }
          if (typeof fieldValue === 'string') {
            return !fieldValue.includes(String(rule.value));
          }
          return true;
        case 'startsWith':
          return typeof fieldValue === 'string' && fieldValue.startsWith(String(rule.value));
        case 'endsWith':
          return typeof fieldValue === 'string' && fieldValue.endsWith(String(rule.value));
        case 'greaterThan':
          return fieldValue > rule.value;
        case 'lessThan':
          return fieldValue < rule.value;
        case 'between':
          if (Array.isArray(rule.value) && rule.value.length === 2) {
            return fieldValue > rule.value[0] && fieldValue < rule.value[1];
          }
          return false;
        case 'exists':
          return fieldValue !== undefined && fieldValue !== null;
        case 'notExists':
          return fieldValue === undefined || fieldValue === null;
        default:
          return false;
      }
    });
  },
  
  /**
   * Find best matching segment for customer data
   */
  findBestMatchingSegment(
    data: {
      customer?: Record<string, any>;
      cart?: Record<string, any>;
      order?: Record<string, any>;
      custom?: Record<string, any>;
    },
    segments: CustomerSegment[]
  ): CustomerSegment | null {
    // Filter to active segments that match the customer data
    const matchingSegments = segments
      .filter(segment => segment.active !== false)
      .filter(segment => segmentUtils.matchesSegment(data, segment));
    
    if (matchingSegments.length === 0) {
      return null;
    }
    
    // Sort by priority (highest first)
    matchingSegments.sort((a, b) => {
      const priorityA = a.metadata?.priority || 0;
      const priorityB = b.metadata?.priority || 0;
      return priorityB - priorityA;
    });
    
    // Return highest priority segment
    return matchingSegments[0];
  },
};

/**
 * A/B Test utilities
 */
export const abTestUtils = {
  /**
   * Create an A/B test
   */
  createABTest(testData: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>): ABTest {
    const now = new Date().toISOString();
    
    return {
      id: `abtest_${Date.now()}`,
      ...testData,
      createdAt: now,
      updatedAt: now,
    };
  },
  
  /**
   * Determine which template to use for an A/B test
   */
  selectTestTemplate(test: ABTest): string {
    // If test is not active, return template A
    if (test.status !== 'active') {
      return test.templateA;
    }
    
    // If there's a winning template, use it
    if (test.winningTemplate) {
      return test.winningTemplate;
    }
    
    // Otherwise, randomly select based on split ratio
    const useTemplateA = Math.random() * 100 < test.splitRatio;
    return useTemplateA ? test.templateA : test.templateB;
  },
  
  /**
   * Create a sample A/B test
   */
  createSampleABTest(templateA: string, templateB: string): ABTest {
    const now = new Date().toISOString();
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    return {
      id: `abtest_${Date.now()}`,
      name: 'Cart Abandonment Message Test',
      description: 'Testing different messaging approaches for cart abandonment',
      templateA,
      templateB,
      splitRatio: 50,
      startDate: now,
      endDate,
      status: 'active',
      metadata: {
        metrics: {
          primary: 'conversions',
          secondary: ['clicks', 'responses'],
        },
        tags: ['cart', 'abandonment', 'messaging'],
      },
      createdAt: now,
      updatedAt: now,
    };
  },
};

/**
 * Select best template for a customer based on data and segmentation
 */
export function selectTemplateForCustomer(
  data: {
    customer?: Record<string, any>;
    cart?: Record<string, any>;
    order?: Record<string, any>;
    custom?: Record<string, any>;
  },
  options: {
    templates: MessageTemplate[];
    segments?: CustomerSegment[];
    abTests?: ABTest[];
    defaultTemplateId?: string;
  }
): { template: MessageTemplate; abTest?: ABTest; segment?: CustomerSegment } {
  const { templates, segments = [], abTests = [], defaultTemplateId } = options;
  
  // Find best matching segment
  const segment = segments.length > 0
    ? segmentUtils.findBestMatchingSegment(data, segments)
    : null;
  
  // Find active templates for the segment
  const activeTemplates = templates.filter(t => t.active !== false);
  
  // If no active templates, return null
  if (activeTemplates.length === 0) {
    throw new Error('No active templates available');
  }
  
  // Find segment-specific templates
  const segmentTemplates = segment
    ? activeTemplates.filter(t => t.metadata?.segment === segment.id)
    : [];
  
  // Find active A/B tests for the segment
  const activeABTests = abTests
    .filter(test => test.status === 'active')
    .filter(test => {
      // Check if test applies to this segment
      if (!test.metadata?.segment) return true;
      return test.metadata.segment === segment?.id;
    });
  
  // If we have an active A/B test, use it
  if (activeABTests.length > 0) {
    // Sort by start date (newest first)
    activeABTests.sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
    
    const abTest = activeABTests[0];
    const templateId = abTestUtils.selectTestTemplate(abTest);
    const template = activeTemplates.find(t => t.id === templateId);
    
    if (template) {
      return { template, abTest, segment: segment || undefined };
    }
  }
  
  // If we have segment-specific templates, use the newest one
  if (segmentTemplates.length > 0) {
    // Sort by updated date (newest first)
    segmentTemplates.sort((a, b) => 
      new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
    
    return { template: segmentTemplates[0], segment: segment || undefined };
  }
  
  // If we have a default template ID, use it
  if (defaultTemplateId) {
    const defaultTemplate = activeTemplates.find(t => t.id === defaultTemplateId);
    if (defaultTemplate) {
      return { template: defaultTemplate };
    }
  }
  
  // Otherwise, use the newest active template
  activeTemplates.sort((a, b) => 
    new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
  );
  
  return { template: activeTemplates[0] };
}