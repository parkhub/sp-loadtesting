/**
 * Configuration utilities for k6 tests
 */

/**
 * Get environment variable or return default
 * @param {string} name - Environment variable name
 * @param {string} defaultValue - Default value if not set
 * @returns {string} Value
 */
export function getEnv(name, defaultValue = '') {
  return __ENV[name] || defaultValue;
}

/**
 * Get base URL from environment or default
 * @returns {string} Base URL
 */
export function getBaseUrl() {
  return getEnv('BASE_URL', 'https://api.example.com');
}

/**
 * Get basic auth credentials from environment
 * @returns {object} Credentials object
 */
export function getBasicAuthCredentials() {
  return {
    username: getEnv('BASIC_AUTH_USERNAME', ''),
    password: getEnv('BASIC_AUTH_PASSWORD', ''),
  };
}

/**
 * Parse JSON or return null
 * @param {string} str - JSON string
 * @returns {object|null} Parsed object or null
 */
export function tryParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}
