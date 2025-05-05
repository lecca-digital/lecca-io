import { z } from 'zod';

/**
 * Types of customer data available for personalization
 */
export enum PersonalizationDataType {
  CUSTOMER = 'customer',
  CART = 'cart',
  PRODUCT = 'product',
  ORDER = 'order',
  CUSTOM = 'custom',
}

/**
 * Schema for personalization variables
 */
export const personalizationVariableSchema = z.object({
  name: z.string().describe('The variable name as it will appear in templates (e.g., firstName)'),
  label: z.string().describe('Human-readable label for the variable (e.g., First Name)'),
  description: z.string().optional().describe('Optional description of the variable'),
  dataType: z.enum([
    PersonalizationDataType.CUSTOMER,
    PersonalizationDataType.CART,
    PersonalizationDataType.PRODUCT,
    PersonalizationDataType.ORDER,
    PersonalizationDataType.CUSTOM,
  ]).describe('Source data type for this variable'),
  path: z.string().describe('Path to the data within the source object (e.g., "customer.firstName")'),
  defaultValue: z.string().optional().describe('Fallback value if the data is not available'),
  formatter: z.string().optional().describe('Optional formatter function name to apply to the value'),
});

export type PersonalizationVariable = z.infer<typeof personalizationVariableSchema>;

/**
 * Default personalization variables available in the system
 */
export const defaultPersonalizationVariables: PersonalizationVariable[] = [
  // Customer variables
  {
    name: 'firstName',
    label: 'First Name',
    description: 'Customer\'s first name',
    dataType: PersonalizationDataType.CUSTOMER,
    path: 'firstName',
    defaultValue: 'there',
  },
  {
    name: 'lastName',
    label: 'Last Name',
    description: 'Customer\'s last name',
    dataType: PersonalizationDataType.CUSTOMER,
    path: 'lastName',
    defaultValue: '',
  },
  {
    name: 'email',
    label: 'Email',
    description: 'Customer\'s email address',
    dataType: PersonalizationDataType.CUSTOMER,
    path: 'email',
    defaultValue: '',
  },
  
  // Cart variables
  {
    name: 'cartTotal',
    label: 'Cart Total',
    description: 'Total value of items in cart',
    dataType: PersonalizationDataType.CART,
    path: 'totalValue',
    defaultValue: '0',
    formatter: 'currency',
  },
  {
    name: 'itemCount',
    label: 'Item Count',
    description: 'Number of items in cart',
    dataType: PersonalizationDataType.CART,
    path: 'products.length',
    defaultValue: '0',
  },
  {
    name: 'abandonedTime',
    label: 'Abandoned Time',
    description: 'How long ago the cart was abandoned',
    dataType: PersonalizationDataType.CART,
    path: 'abandonedAt',
    defaultValue: 'recently',
    formatter: 'timeAgo',
  },
  
  // Product variables
  {
    name: 'productName',
    label: 'Product Name',
    description: 'Name of the main product in cart',
    dataType: PersonalizationDataType.PRODUCT,
    path: 'products[0].name',
    defaultValue: 'item',
  },
  {
    name: 'productNames',
    label: 'Product Names',
    description: 'Names of all products in cart',
    dataType: PersonalizationDataType.PRODUCT,
    path: 'products[*].name',
    defaultValue: 'items',
    formatter: 'list',
  },
  {
    name: 'productPrice',
    label: 'Product Price',
    description: 'Price of the main product in cart',
    dataType: PersonalizationDataType.PRODUCT,
    path: 'products[0].price',
    defaultValue: '0',
    formatter: 'currency',
  },
  
  // Order variables
  {
    name: 'lastOrderDate',
    label: 'Last Order Date',
    description: 'Date of customer\'s last completed order',
    dataType: PersonalizationDataType.ORDER,
    path: 'lastOrder.completedAt',
    defaultValue: '',
    formatter: 'date',
  },
  {
    name: 'lastOrderTotal',
    label: 'Last Order Total',
    description: 'Total value of customer\'s last completed order',
    dataType: PersonalizationDataType.ORDER,
    path: 'lastOrder.totalValue',
    defaultValue: '0',
    formatter: 'currency',
  },
];

/**
 * Value formatters for personalization variables
 */
export const valueFormatters = {
  currency: (value: any, options: { currency?: string } = {}): string => {
    const currency = options.currency || 'USD';
    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(value);
    }
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(parseFloat(value));
    }
    return value?.toString() || '';
  },
  
  date: (value: any, options: { format?: string } = {}): string => {
    if (!value) return '';
    try {
      const date = new Date(value);
      if (options.format === 'relative') {
        return timeAgo(date);
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return value?.toString() || '';
    }
  },
  
  list: (value: any[], options: { joiner?: string } = {}): string => {
    if (!Array.isArray(value)) return value?.toString() || '';
    const joiner = options.joiner || ', ';
    
    if (value.length === 1) return value[0]?.toString() || '';
    if (value.length === 2) return `${value[0]} and ${value[1]}`;
    
    const lastItem = value[value.length - 1];
    const otherItems = value.slice(0, value.length - 1);
    
    return `${otherItems.join(joiner)} and ${lastItem}`;
  },
  
  timeAgo: (value: any): string => {
    if (!value) return '';
    try {
      return timeAgo(new Date(value));
    } catch (error) {
      return value?.toString() || '';
    }
  },
};

/**
 * Helper function to compute time ago
 */
function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay > 0) {
    return diffDay === 1 ? 'yesterday' : `${diffDay} days ago`;
  }
  if (diffHour > 0) {
    return diffHour === 1 ? 'an hour ago' : `${diffHour} hours ago`;
  }
  if (diffMin > 0) {
    return diffMin === 1 ? 'a minute ago' : `${diffMin} minutes ago`;
  }
  return 'just now';
}

/**
 * Get value from a data object by path
 */
function getValueByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  
  // Handle array notation like products[*].name
  if (path.includes('[*]')) {
    const [arrayPath, restPath] = path.split('[*].');
    const array = arrayPath.split('.').reduce((acc, part) => acc?.[part], obj);
    
    if (Array.isArray(array)) {
      return array.map(item => {
        return restPath.split('.').reduce((acc, part) => acc?.[part], item);
      });
    }
    return undefined;
  }
  
  // Handle specific array index like products[0].name
  if (path.includes('[') && path.includes(']')) {
    const matches = path.match(/(\w+)\[(\d+)\]\.?(.*)/) || [];
    if (matches.length >= 3) {
      const [, arrayName, indexStr, restPath] = matches;
      const array = obj[arrayName];
      const index = parseInt(indexStr, 10);
      
      if (Array.isArray(array) && index < array.length) {
        const item = array[index];
        if (!restPath) return item;
        return restPath.split('.').reduce((acc, part) => acc?.[part], item);
      }
      return undefined;
    }
  }
  
  // Standard dot notation
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Apply a formatter to a value
 */
function formatValue(value: any, formatter?: string, options: Record<string, any> = {}): string {
  if (!formatter) return value?.toString() || '';
  const formatterFn = valueFormatters[formatter as keyof typeof valueFormatters];
  if (!formatterFn) return value?.toString() || '';
  return formatterFn(value, options);
}

/**
 * Process a template string with personalization data
 */
export function processTemplate(
  template: string,
  data: {
    customer?: Record<string, any>;
    cart?: Record<string, any>;
    order?: Record<string, any>;
    custom?: Record<string, any>;
  },
  variables: PersonalizationVariable[] = defaultPersonalizationVariables
): string {
  if (!template) return '';
  
  // Match {{variable}} or {{variable:formatter}} patterns
  const regex = /\{\{([^{}:]+)(?::([^{}]+))?\}\}/g;
  
  return template.replace(regex, (match, variableName, formatterStr) => {
    // Find the variable definition
    const varDef = variables.find(v => v.name === variableName);
    if (!varDef) return match;
    
    // Get source data based on variable type
    let sourceData: Record<string, any> | undefined;
    
    switch (varDef.dataType) {
      case PersonalizationDataType.CUSTOMER:
        sourceData = data.customer;
        break;
      case PersonalizationDataType.CART:
        sourceData = data.cart;
        break;
      case PersonalizationDataType.PRODUCT:
        sourceData = data.cart; // Products are contained in cart data
        break;
      case PersonalizationDataType.ORDER:
        sourceData = data.order;
        break;
      case PersonalizationDataType.CUSTOM:
        sourceData = data.custom;
        break;
    }
    
    // Extract value from source data
    const value = getValueByPath(sourceData, varDef.path);
    
    // Use default value if needed
    const finalValue = value === undefined ? varDef.defaultValue : value;
    
    // Apply formatter if provided in template or variable definition
    const formatter = formatterStr || varDef.formatter;
    const formatterOptions = formatterStr
      ? parseFormatterOptions(formatterStr)
      : {};
    
    return formatValue(finalValue, formatter, formatterOptions);
  });
}

/**
 * Parse formatter options string like "currency(USD)"
 */
function parseFormatterOptions(formatterStr: string): Record<string, any> {
  const options: Record<string, any> = {};
  
  // Check if there are parentheses with options
  const match = formatterStr.match(/^(\w+)(?:\(([^)]+)\))?$/);
  if (!match) return options;
  
  const [, , optionsStr] = match;
  if (!optionsStr) return options;
  
  // Parse simple options like "USD" or "yyyy-MM-dd"
  if (!optionsStr.includes(':') && !optionsStr.includes(',')) {
    // Single value without a key, try to guess based on common patterns
    if (optionsStr.match(/^[A-Z]{3}$/)) {
      options.currency = optionsStr;
    } else {
      options.format = optionsStr;
    }
    return options;
  }
  
  // Parse key-value pairs like "currency:USD,style:code"
  try {
    optionsStr.split(',').forEach(pair => {
      const [key, value] = pair.split(':').map(s => s.trim());
      if (key && value) {
        options[key] = value;
      }
    });
  } catch (error) {
    // Ignore parsing errors
  }
  
  return options;
}

/**
 * Extract variables from a template string
 */
export function extractVariablesFromTemplate(template: string): string[] {
  if (!template) return [];
  
  const regex = /\{\{([^{}:]+)(?::([^{}]+))?\}\}/g;
  const variables: string[] = [];
  
  let match;
  while ((match = regex.exec(template)) !== null) {
    const variableName = match[1];
    if (!variables.includes(variableName)) {
      variables.push(variableName);
    }
  }
  
  return variables;
}

/**
 * Get personalization variable metadata by name
 */
export function getVariableByName(
  name: string,
  variables: PersonalizationVariable[] = defaultPersonalizationVariables
): PersonalizationVariable | undefined {
  return variables.find(v => v.name === name);
}

/**
 * Group personalization variables by type
 */
export function groupVariablesByType(
  variables: PersonalizationVariable[] = defaultPersonalizationVariables
): Record<PersonalizationDataType, PersonalizationVariable[]> {
  return variables.reduce((groups, variable) => {
    const group = groups[variable.dataType] || [];
    group.push(variable);
    groups[variable.dataType] = group;
    return groups;
  }, {} as Record<PersonalizationDataType, PersonalizationVariable[]>);
}