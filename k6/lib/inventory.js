/**
 * Inventory and hold management utilities for smartpass-api
 */
import http from 'k6/http';
import { check } from 'k6';

/**
 * Product types for holds
 */
export const ProductType = {
  EventPass: 0,
  SeasonPass: 1,
};

/**
 * Create an inventory hold (cart) for a listing
 * @param {string} baseUrl - API base URL
 * @param {object} headers - Request headers
 * @param {object} payload - Hold creation payload
 * @returns {object} Response object with holdId and expiry
 */
export function createInventoryHold(baseUrl, headers, payload) {
  const url = `${baseUrl}/api/inventory-holds`;

  const response = http.post(url, JSON.stringify(payload), {
    headers: headers,
    tags: { name: 'CreateInventoryHold' },
  });

  check(response, {
    'create hold status is 200': (r) => r.status === 200,
    'create hold has holdId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.holdId !== undefined;
      } catch (e) {
        return false;
      }
    },
    'create hold has expiry': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.expiry !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  return response;
}

/**
 * Extend an existing inventory hold
 * @param {string} baseUrl - API base URL
 * @param {object} headers - Request headers
 * @param {object} payload - Hold extension payload
 * @returns {object} Response object
 */
export function extendInventoryHold(baseUrl, headers, payload) {
  const url = `${baseUrl}/api/inventory-holds/extend`;

  const response = http.post(url, JSON.stringify(payload), {
    headers: headers,
    tags: { name: 'ExtendInventoryHold' },
  });

  check(response, {
    'extend hold status is 200': (r) => r.status === 200,
  });

  return response;
}

/**
 * Remove/release an inventory hold
 * @param {string} baseUrl - API base URL
 * @param {object} headers - Request headers
 * @param {object} payload - Hold removal payload
 * @returns {object} Response object
 */
export function removeInventoryHold(baseUrl, headers, payload) {
  const url = `${baseUrl}/api/inventory-holds/remove`;

  const response = http.post(url, JSON.stringify(payload), {
    headers: headers,
    tags: { name: 'RemoveInventoryHold' },
  });

  check(response, {
    'remove hold status is 200': (r) => r.status === 200,
  });

  return response;
}

/**
 * Get season pass listings for a client organization
 * @param {string} baseUrl - API base URL
 * @param {object} headers - Request headers
 * @param {string} clientOrgKey - Client organization key
 * @param {string} landmarkId - Optional landmark ID
 * @returns {object} Response object
 */
export function getSeasonPassListings(baseUrl, headers, clientOrgKey, landmarkId = null) {
  let url = `${baseUrl}/api/seasonpass?clientOrgKey=${clientOrgKey}`;
  if (landmarkId) {
    url += `&landmarkId=${landmarkId}`;
  }

  const response = http.get(url, {
    headers: headers,
    tags: { name: 'GetSeasonPassListings' },
  });

  check(response, {
    'get listings status is 200': (r) => r.status === 200,
    'get listings has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch (e) {
        return false;
      }
    },
  });

  return response;
}

/**
 * Get season pass listing details
 * @param {string} baseUrl - API base URL
 * @param {object} headers - Request headers
 * @param {string} listingId - Listing ID
 * @param {string} landmarkId - Landmark ID
 * @returns {object} Response object
 */
export function getSeasonPassListing(baseUrl, headers, listingId, landmarkId) {
  const url = `${baseUrl}/api/seasonpass/${listingId}?landmarkId=${landmarkId}`;

  const response = http.get(url, {
    headers: headers,
    tags: { name: 'GetSeasonPassListing' },
  });

  check(response, {
    'get listing details status is 200': (r) => r.status === 200,
    'get listing has id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  return response;
}

/**
 * Create a hold payload for event pass
 * @param {string} listingId - eGDS listing ID
 * @param {string} pricingId - eGDS pricing ID
 * @returns {object} Hold creation payload
 */
export function createEventPassHoldPayload(listingId, pricingId) {
  return {
    productType: ProductType.EventPass,
    listingId: listingId,
    pricingId: pricingId,
  };
}

/**
 * Create a hold payload for season pass
 * @param {string} listingId - Season pass listing ID
 * @param {string} pricingId - Pricing tier ID
 * @returns {object} Hold creation payload
 */
export function createSeasonPassHoldPayload(listingId, pricingId) {
  return {
    productType: ProductType.SeasonPass,
    listingId: listingId,
    pricingId: pricingId,
  };
}

/**
 * Parse hold response and extract key data
 * @param {object} response - HTTP response from createInventoryHold
 * @returns {object} Parsed hold data or null
 */
export function parseHoldResponse(response) {
  if (response.status !== 200) {
    return null;
  }

  try {
    const body = JSON.parse(response.body);
    return {
      holdId: body.holdId,
      cartId: body.holdId, // Alias for season pass
      expiry: body.expiry,
      amount: body.amount,
      productType: body.productType,
    };
  } catch (e) {
    return null;
  }
}
