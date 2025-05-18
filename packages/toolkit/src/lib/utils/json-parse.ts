import { jsonrepair } from 'jsonrepair';

export function jsonParse(
  jsonString: any,
  args?: {
    returnWithoutParsingIfError?: boolean;
  },
): any {
  // Return early if the input is already an object or null/undefined
  if (jsonString === null || jsonString === undefined || typeof jsonString === 'object') {
    return jsonString;
  }
  
  // Handle non-string inputs by returning them directly
  if (typeof jsonString !== 'string') {
    return jsonString;
  }
  
  // If the string is empty or just whitespace, return an empty object
  const trimmedString = jsonString.trim();
  if (!trimmedString) {
    return {};
  }
  
  try {
    // First attempt: try standard JSON parse
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      // Second attempt: try to repair the JSON
      try {
        const repairedJson = jsonrepair(jsonString);
        return JSON.parse(repairedJson);
      } catch (repairError) {
        // Check if the string looks like it might be JSON with special character issues
        if (jsonString.includes('{') && jsonString.includes('}')) {
          // Third attempt: try to handle as a variable-containing JSON string
          try {
            // Create a simple object with the string as a property value
            const wrappedJson = `{"prompt": ${JSON.stringify(jsonString)}}`;
            return JSON.parse(wrappedJson);
          } catch (variableError) {
            throw new Error('Invalid JSON: ' + variableError.message);
          }
        } else {
          // Not a JSON-like string, treat as plain string
          throw new Error('Invalid JSON: Not a valid JSON structure');
        }
      }
    }
  } catch (err) {
    // Return the original string if requested
    if (args?.returnWithoutParsingIfError) {
      return jsonString;
    }
    throw err;
  }
}
