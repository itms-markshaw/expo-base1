/**
 * Utility functions for safely handling Odoo relational fields
 * Prevents the "a" issue by validating relational field data
 */

/**
 * Check if a name is invalid (common Odoo data issues)
 */
function isInvalidName(name: string): boolean {
  if (!name || typeof name !== 'string') return true;
  
  // Single character names are usually invalid
  if (name.length === 1) return true;
  
  // Common invalid patterns from Odoo
  const invalidPatterns = [
    /^a$/i,           // Just "a"
    /^[a-z]$/i,       // Single letters
    /^\d+$/,          // Just numbers
    /^[\s\-_]+$/,     // Just whitespace/dashes/underscores
    /^null$/i,        // "null" string
    /^undefined$/i,   // "undefined" string
    /^false$/i,       // "false" string
    /^true$/i,        // "true" string
  ];
  
  return invalidPatterns.some(pattern => pattern.test(name.trim()));
}

/**
 * Safely extract name from Odoo relational field array
 * Handles cases where the name might be invalid (like "a")
 */
export function getRelationalName(field: any, fallbackName?: string): string | null {
  if (field && Array.isArray(field) && field.length > 1) {
    let name = field[1];
    if (name && typeof name === 'string') {
      // Clean up company name from author (e.g., "ITMS Group Pty Ltd, Mark Shaw" -> "Mark Shaw")
      if (name.includes(',')) {
        const parts = name.split(',').map(part => part.trim());
        if (parts.length > 1) {
          name = parts[parts.length - 1];
        }
      }
      
      // Ensure we have a valid name (not just "a" or other single/invalid characters)
      if (name.length > 1 && !isInvalidName(name)) {
        return name;
      }
    }
  }
  return fallbackName || null;
}

/**
 * Safely extract ID from Odoo relational field array
 */
export function getRelationalId(field: any): number | null {
  if (field && Array.isArray(field) && field.length > 0) {
    const id = field[0];
    if (typeof id === 'number') {
      return id;
    }
    if (typeof id === 'string') {
      const parsed = parseInt(id, 10);
      return isNaN(parsed) ? null : parsed;
    }
  }
  if (typeof field === 'number') {
    return field;
  }
  if (typeof field === 'string') {
    const parsed = parseInt(field, 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Get both ID and name from a relational field
 */
export function getRelationalField(field: any, fallbackName?: string): { id: number | null; name: string | null } {
  return {
    id: getRelationalId(field),
    name: getRelationalName(field, fallbackName)
  };
}

/**
 * Format a relational field for display
 * Returns the name if valid, otherwise a fallback
 */
export function formatRelationalField(field: any, fallback: string = 'Unknown'): string {
  const name = getRelationalName(field);
  return name || fallback;
}

/**
 * Check if a relational field has valid data
 */
export function hasValidRelationalData(field: any): boolean {
  return getRelationalName(field) !== null;
}
