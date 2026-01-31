/**
 * Season pass purchase utilities for smartpass-api
 */
import http from 'k6/http';
import { check } from 'k6';

/**
 * Purchase a season pass
 * @param {string} baseUrl - API base URL
 * @param {object} headers - Request headers
 * @param {object} payload - Purchase payload
 * @returns {object} Response object
 */
export function purchaseSeasonPass(baseUrl, headers, payload) {
  const url = `${baseUrl}/api/listings/seasonpass/purchase`;

  const response = http.post(url, JSON.stringify(payload), {
    headers: headers,
    tags: { name: 'PurchaseSeasonPass' },
  });

  check(response, {
    'purchase season pass status is 200 or 202': (r) => r.status === 200 || r.status === 202,
    'purchase season pass has response': (r) => r.body && r.body.length > 0,
  });

  return response;
}

/**
 * Complete a season pass purchase after async payment
 * @param {string} baseUrl - API base URL
 * @param {object} headers - Request headers
 * @param {object} payload - Complete purchase payload
 * @returns {object} Response object
 */
export function completeSeasonPassPurchase(baseUrl, headers, payload) {
  const url = `${baseUrl}/api/listings/seasonpass/purchase-complete`;

  const response = http.post(url, JSON.stringify(payload), {
    headers: headers,
    tags: { name: 'CompleteSeasonPassPurchase' },
  });

  check(response, {
    'complete season pass purchase status is 200': (r) => r.status === 200,
    'complete season pass purchase has package': (r) => {
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
 * Full season pass purchase flow with hold creation
 * @param {string} baseUrl - API base URL
 * @param {object} headers - Request headers
 * @param {object} holdData - Hold data from createInventoryHold
 * @param {object} purchaseData - Additional purchase data
 * @returns {object} Final response
 */
export function fullSeasonPassFlow(baseUrl, headers, holdData, purchaseData) {
  // Build purchase payload
  const purchasePayload = {
    listingId: purchaseData.listingId,
    pricingId: purchaseData.pricingId,
    cartIdentifier: holdData.holdId,
    amount: holdData.amount,
    paymentToken: purchaseData.paymentToken,
    name: purchaseData.name,
    email: purchaseData.email,
    licensePlateNumber: purchaseData.licensePlateNumber || '',
    licensePlateState: purchaseData.licensePlateState || '',
    token: purchaseData.recaptchaToken || '',
    accessCode: purchaseData.accessCode || '',
  };

  // Purchase
  const purchaseResponse = purchaseSeasonPass(baseUrl, headers, purchasePayload);

  if (purchaseResponse.status !== 200 && purchaseResponse.status !== 202) {
    return purchaseResponse;
  }

  const purchaseBody = JSON.parse(purchaseResponse.body);

  // Check if 3DS required
  if (purchaseBody.status === 'requires_action') {
    const completePayload = {
      paymentId: purchaseBody.paymentIntent,
    };

    return completeSeasonPassPurchase(baseUrl, headers, completePayload);
  }

  return purchaseResponse;
}
