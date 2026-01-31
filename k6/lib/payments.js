/**
 * Payment flow utilities for smartpass-api
 */
import http from 'k6/http';
import { check } from 'k6';

/**
 * Generate a purchase token for Deluxe payment flow
 * @param {string} baseUrl - API base URL
 * @param {object} headers - Request headers
 * @param {object} payload - Purchase token payload
 * @returns {object} Response object
 */
export function generatePurchaseToken(baseUrl, headers, payload) {
  const url = `${baseUrl}/api/pass/generate-purchase-token`;

  const response = http.post(url, JSON.stringify(payload), {
    headers: headers,
    tags: { name: 'GeneratePurchaseToken' },
  });

  check(response, {
    'generate token status is 200': (r) => r.status === 200,
    'generate token has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  return response;
}

/**
 * Purchase a pass with direct payment
 * @param {string} baseUrl - API base URL
 * @param {object} headers - Request headers
 * @param {object} payload - Purchase payload
 * @returns {object} Response object
 */
export function purchasePass(baseUrl, headers, payload) {
  const url = `${baseUrl}/api/pass/purchase`;

  const response = http.post(url, JSON.stringify(payload), {
    headers: headers,
    tags: { name: 'PurchasePass' },
  });

  check(response, {
    'purchase status is 200 or 202': (r) => r.status === 200 || r.status === 202,
    'purchase has response': (r) => r.body && r.body.length > 0,
  });

  return response;
}

/**
 * Complete a purchase after async payment confirmation
 * @param {string} baseUrl - API base URL
 * @param {object} headers - Request headers
 * @param {object} payload - Complete purchase payload (jwt or paymentId)
 * @returns {object} Response object
 */
export function completePurchase(baseUrl, headers, payload) {
  const url = `${baseUrl}/api/pass/purchase-complete`;

  const response = http.post(url, JSON.stringify(payload), {
    headers: headers,
    tags: { name: 'CompletePurchase' },
  });

  check(response, {
    'complete purchase status is 200': (r) => r.status === 200,
    'complete purchase has pass': (r) => {
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
 * Get payment account for a merchant
 * @param {string} baseUrl - API base URL
 * @param {object} headers - Request headers
 * @param {string} clientOrgKey - Client organization key
 * @returns {object} Response object
 */
export function getPaymentAccount(baseUrl, headers, clientOrgKey) {
  const url = `${baseUrl}/api/merchant`;

  const response = http.post(url, JSON.stringify({ clientOrganizationKey: clientOrgKey }), {
    headers: headers,
    tags: { name: 'GetPaymentAccount' },
  });

  check(response, {
    'get payment account status is 200': (r) => r.status === 200,
    'payment account has id': (r) => {
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
 * Get payment splits for a lot/landmark
 * @param {string} baseUrl - API base URL
 * @param {object} headers - Request headers
 * @param {string} lotId - Lot ID
 * @param {string} landmarkId - Landmark ID
 * @param {number} baseAmount - Optional base amount for calculation
 * @returns {object} Response object
 */
export function getPaymentSplits(baseUrl, headers, lotId, landmarkId, baseAmount = null) {
  let url = `${baseUrl}/api/lot/${lotId}/landmark/${landmarkId}/payment-splits`;
  if (baseAmount) {
    url += `?baseAmount=${baseAmount}`;
  }

  const response = http.get(url, {
    headers: headers,
    tags: { name: 'GetPaymentSplits' },
  });

  check(response, {
    'get payment splits status is 200': (r) => r.status === 200,
    'payment splits has providers': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.providers !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  return response;
}

/**
 * Create a test payment token (for testing environments)
 * This simulates Stripe test token creation
 * @returns {string} Test payment token
 */
export function createTestPaymentToken() {
  // In a real test, you'd call Stripe's API to create a token
  // For load testing, use a test token from your test environment
  return 'tok_visa'; // Stripe test token for successful payment
}

/**
 * Full payment flow: purchase pass with optional 3DS completion
 * @param {string} baseUrl - API base URL
 * @param {object} headers - Request headers
 * @param {object} purchasePayload - Purchase payload
 * @returns {object} Final response (pass or payment intent)
 */
export function fullPaymentFlow(baseUrl, headers, purchasePayload) {
  // Step 1: Purchase pass
  const purchaseResponse = purchasePass(baseUrl, headers, purchasePayload);

  if (purchaseResponse.status !== 200 && purchaseResponse.status !== 202) {
    return purchaseResponse;
  }

  const purchaseBody = JSON.parse(purchaseResponse.body);

  // Step 2: Check if additional action is required (3DS)
  if (purchaseBody.status === 'requires_action') {
    // In a real browser test, this would trigger 3DS challenge
    // For load testing, we simulate the completion
    const completePayload = {
      paymentId: purchaseBody.paymentIntent,
    };

    return completePurchase(baseUrl, headers, completePayload);
  }

  // Payment completed successfully
  return purchaseResponse;
}

/**
 * Full event pass purchase flow with dynamic hold creation
 * @param {string} baseUrl - API base URL
 * @param {object} headers - Request headers
 * @param {object} holdData - Hold data from createInventoryHold
 * @param {object} purchaseData - Purchase data (payment token, customer info)
 * @returns {object} Final response
 */
export function fullEventPassFlow(baseUrl, headers, holdData, purchaseData) {
  // Build purchase payload
  const purchasePayload = {
    amount: holdData.amount,
    listingId: purchaseData.listingId,
    holdId: holdData.holdId,
    paymentToken: purchaseData.paymentToken,
    name: purchaseData.name,
    email: purchaseData.email,
    licensePlateNumber: purchaseData.licensePlateNumber || '',
    licensePlateState: purchaseData.licensePlateState || '',
    token: purchaseData.recaptchaToken || '',
    clientOrganizationKey: purchaseData.clientOrganizationKey,
    externalReferenceCode: purchaseData.externalReferenceCode || '',
    marketplace: purchaseData.marketplace || '',
  };

  return fullPaymentFlow(baseUrl, headers, purchasePayload);
}
