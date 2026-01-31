/**
 * Authentication utilities for smartpass-api
 */

/**
 * Create Basic Auth header for external requests
 * @param {string} username - Basic auth username
 * @param {string} password - Basic auth password
 * @returns {object} Headers object with Authorization
 */
export function createBasicAuthHeaders(username, password) {
  const credentials = `${username}:${password}`;
  const encoded = encoding.b64encode(credentials);

  return {
    'Authorization': `Basic ${encoded}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Create headers for external API requests
 * @param {string} username - Basic auth username
 * @param {string} password - Basic auth password
 * @returns {object} Headers object
 */
export function createExternalHeaders(username, password) {
  return {
    ...createBasicAuthHeaders(username, password),
    'Content-Type': 'application/json',
  };
}

/**
 * Create headers for JSON requests
 * @returns {object} Headers object
 */
export function createJSONHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}
