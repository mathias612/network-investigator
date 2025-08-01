import { logger } from "./logger";

export interface JsonSearchResult {
  position: number;
  length: number;
  text: string;
  path: string;
  type: 'key' | 'value';
  context?: string;
}

/**
 * Deep search through JSON structure for both keys and values
 * @param data - The JSON data to search through
 * @param searchQuery - The search query string
 * @param caseSensitive - Whether the search should be case sensitive
 * @returns Array of search results with context information
 */
export function searchJsonStructure(
  data: any,
  searchQuery: string,
  caseSensitive: boolean = false
): JsonSearchResult[] {
  if (!searchQuery || !searchQuery.trim()) {
    return [];
  }

  const results: JsonSearchResult[] = [];
  const query = caseSensitive ? searchQuery : searchQuery.toLowerCase();
  
  function searchRecursive(
    obj: any,
    currentPath: string = '',
    depth: number = 0
  ): void {
    try {
      if (depth > 20) { // Prevent infinite recursion
        logger.warn('Maximum search depth reached, stopping recursion');
        return;
      }

      if (obj === null || obj === undefined) {
        return;
      }

      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          const arrayPath = `${currentPath}[${index}]`;
          searchRecursive(item, arrayPath, depth + 1);
        });
      } else if (typeof obj === 'object') {
        Object.keys(obj).forEach(key => {
          const keyPath = currentPath ? `${currentPath}.${key}` : key;
          const searchableKey = caseSensitive ? key : key.toLowerCase();
          
          // Search in the key name itself
          if (searchableKey.includes(query)) {
            results.push({
              position: 0, // Position within the key
              length: key.length,
              text: key,
              path: keyPath,
              type: 'key',
              context: `Property name: "${key}"`
            });
          }
          
          // Search in the value
          const value = obj[key];
          if (typeof value === 'string') {
            const searchableValue = caseSensitive ? value : value.toLowerCase();
            let startIndex = 0;
            let foundIndex = searchableValue.indexOf(query, startIndex);
            
            while (foundIndex !== -1) {
              results.push({
                position: foundIndex,
                length: searchQuery.length,
                text: value.substring(foundIndex, foundIndex + searchQuery.length),
                path: keyPath,
                type: 'value',
                context: `Value of "${key}": "${value.length > 50 ? value.substring(0, 50) + '...' : value}"`
              });
              
              startIndex = foundIndex + 1;
              foundIndex = searchableValue.indexOf(query, startIndex);
            }
          } else if (typeof value === 'number' || typeof value === 'boolean') {
            const stringValue = String(value);
            const searchableValue = caseSensitive ? stringValue : stringValue.toLowerCase();
            
            if (searchableValue.includes(query)) {
              results.push({
                position: 0,
                length: stringValue.length,
                text: stringValue,
                path: keyPath,
                type: 'value',
                context: `Value of "${key}": ${stringValue}`
              });
            }
          }
          
          // Continue recursion for objects and arrays
          if (typeof value === 'object' && value !== null) {
            searchRecursive(value, keyPath, depth + 1);
          }
        });
      } else if (typeof obj === 'string') {
        const searchableText = caseSensitive ? obj : obj.toLowerCase();
        let startIndex = 0;
        let foundIndex = searchableText.indexOf(query, startIndex);
        
        while (foundIndex !== -1) {
          results.push({
            position: foundIndex,
            length: searchQuery.length,
            text: obj.substring(foundIndex, foundIndex + searchQuery.length),
            path: currentPath,
            type: 'value',
            context: `Text: "${obj.length > 50 ? obj.substring(0, 50) + '...' : obj}"`
          });
          
          startIndex = foundIndex + 1;
          foundIndex = searchableText.indexOf(query, startIndex);
        }
      }
    } catch (error) {
      logger.error('Error during JSON search recursion:', error);
    }
  }

  try {
    searchRecursive(data);
    return results.sort((a, b) => a.path.localeCompare(b.path));
  } catch (error) {
    logger.error('Error searching JSON structure:', error);
    return [];
  }
}

/**
 * Convert a flat string search to work with JSON structure
 * This maintains compatibility with existing search functionality
 */
export function enhancedJsonSearch(
  jsonString: string,
  searchQuery: string,
  caseSensitive: boolean = false
): Array<{ position: number; length: number; text: string }> {
  if (!searchQuery || !searchQuery.trim() || !jsonString) {
    return [];
  }

  try {
    // First try to parse as JSON for structured search
    const parsedData = JSON.parse(jsonString);
    const structuredResults = searchJsonStructure(parsedData, searchQuery, caseSensitive);
    
    // Convert structured results back to position-based results
    const results: Array<{ position: number; length: number; text: string }> = [];
    
    // Also do a fallback text search for cases where JSON parsing fails
    // or for content that might not be visible in the structured view
    const query = caseSensitive ? searchQuery : searchQuery.toLowerCase();
    const searchText = caseSensitive ? jsonString : jsonString.toLowerCase();
    
    let position = 0;
    while (position < searchText.length) {
      const foundIndex = searchText.indexOf(query, position);
      if (foundIndex === -1) break;
      
      results.push({
        position: foundIndex,
        length: searchQuery.length,
        text: jsonString.substring(foundIndex, foundIndex + searchQuery.length)
      });
      
      position = foundIndex + 1;
    }
    
    return results;
  } catch (error) {
    // Fallback to simple text search if JSON parsing fails
    logger.log('Falling back to text search, JSON parsing failed:', error);
    
    const results: Array<{ position: number; length: number; text: string }> = [];
    const query = caseSensitive ? searchQuery : searchQuery.toLowerCase();
    const searchText = caseSensitive ? jsonString : jsonString.toLowerCase();
    
    let position = 0;
    while (position < searchText.length) {
      const foundIndex = searchText.indexOf(query, position);
      if (foundIndex === -1) break;
      
      results.push({
        position: foundIndex,
        length: searchQuery.length,
        text: jsonString.substring(foundIndex, foundIndex + searchQuery.length)
      });
      
      position = foundIndex + 1;
    }
    
    return results;
  }
}
