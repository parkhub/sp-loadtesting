/**
 * K6 Load Test: Complete Purchase Flow with Dynamic Hold Creation
 *
 * This test simulates the complete end-to-end purchase flow:
 * 1. Get listing details
 * 2. Create inventory hold dynamically
 * 3. Purchase with the hold
 * 4. Complete purchase if 3DS required
 *
 * Usage:
 *   k6 run tests/complete-purchase-flow.js
 *
 * With environment variables:
 *   BASE_URL=https://api-stage.smartpass.com \
 *   BASIC_AUTH_USERNAME=test \
 *   BASIC_AUTH_PASSWORD=pass \
 *   TEST_LISTING_ID=uuid \
 *   TEST_PRICING_ID=uuid \
 *   TEST_CLIENT_ORG_KEY=uuid \
 *   PRODUCT_TYPE=0 \
 *   k6 run tests/complete-purchase-flow.js
 *
 * PRODUCT_TYPE: 0 = EventPass, 1 = SeasonPass
 */

import { sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import encoding from 'k6/encoding';
import { getBaseUrl, getBasicAuthCredentials } from '../lib/config.js';
import { fullEventPassFlow, createTestPaymentToken } from '../lib/payments.js';
import {
  createInventoryHold,
  parseHoldResponse,
  createEventPassHoldPayload,
  createSeasonPassHoldPayload,
  ProductType,
} from '../lib/inventory.js';
import { fullSeasonPassFlow } from '../lib/seasonpass.js';

// Custom metrics
const purchaseSuccessRate = new Rate('purchase_success_rate');
const holdCreationSuccessRate = new Rate('hold_creation_success_rate');
const purchaseDuration = new Trend('purchase_duration');
const holdCreationDuration = new Trend('hold_creation_duration');
const totalPurchases = new Counter('total_purchases');
const failedHolds = new Counter('failed_holds');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '4m', target: 50 },    // Maintain 50 users for 4 minutes
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'],
    'purchase_success_rate': ['rate>0.90'],
    'hold_creation_success_rate': ['rate>0.95'],
    'http_req_failed': ['rate<0.10'],
  },
};

export function setup() {
  const baseUrl = getBaseUrl();
  const credentials = getBasicAuthCredentials();

  console.log(`Base URL: ${baseUrl}`);
  console.log(`Running complete purchase flow load test...`);

  // Get test configuration
  const productType = parseInt(__ENV.PRODUCT_TYPE || '0');
  const listingId = __ENV.TEST_LISTING_ID || '00000000-0000-0000-0000-000000000001';
  const pricingId = __ENV.TEST_PRICING_ID || '00000000-0000-0000-0000-000000000002';
  const clientOrgKey = __ENV.TEST_CLIENT_ORG_KEY || '00000000-0000-0000-0000-000000000003';
  const landmarkId = __ENV.TEST_LANDMARK_ID || null;
  const accessCode = __ENV.TEST_ACCESS_CODE || '';

  return {
    baseUrl: baseUrl,
    credentials: credentials,
    productType: productType,
    listingId: listingId,
    pricingId: pricingId,
    clientOrgKey: clientOrgKey,
    landmarkId: landmarkId,
    accessCode: accessCode,
  };
}

export default function(data) {
  const { baseUrl, credentials, productType, listingId, pricingId, clientOrgKey, landmarkId, accessCode } = data;

  // Create headers with basic auth
  const headers = {
    'Authorization': `Basic ${encoding.b64encode(`${credentials.username}:${credentials.password}`)}`,
    'Content-Type': 'application/json',
  };

  // STEP 1: Create inventory hold
  console.log(`VU ${__VU} Iter ${__ITER}: Creating hold for listing ${listingId}...`);

  const holdStartTime = new Date();
  let holdPayload;

  if (productType === ProductType.EventPass) {
    holdPayload = createEventPassHoldPayload(listingId, pricingId);
  } else {
    holdPayload = createSeasonPassHoldPayload(listingId, pricingId);
  }

  const holdResponse = createInventoryHold(baseUrl, headers, holdPayload);
  const holdDuration = new Date() - holdStartTime;
  holdCreationDuration.add(holdDuration);

  const holdSuccess = holdResponse.status === 200;
  holdCreationSuccessRate.add(holdSuccess);

  if (!holdSuccess) {
    console.error(`VU ${__VU} Iter ${__ITER}: Hold creation failed - ${holdResponse.status}: ${holdResponse.body}`);
    failedHolds.add(1);
    sleep(1);
    return;
  }

  // Parse hold response
  const holdData = parseHoldResponse(holdResponse);
  if (!holdData) {
    console.error(`VU ${__VU} Iter ${__ITER}: Failed to parse hold response`);
    failedHolds.add(1);
    sleep(1);
    return;
  }

  console.log(`VU ${__VU} Iter ${__ITER}: Hold created - ID: ${holdData.holdId}, Amount: $${holdData.amount / 100}, Expiry: ${holdData.expiry}`);

  // Generate random license plate (7 chars alphanumeric)
  const randomLicensePlate = Math.random().toString(36).substring(2, 9).toUpperCase();

  // STEP 2: Prepare purchase data
  const purchaseData = {
    listingId: listingId,
    pricingId: pricingId,
    paymentToken: 'faked',
    name: `Load Test User ${__VU}-${__ITER}`,
    email: `loadtest-${__VU}-${__ITER}@example.com`,
    licensePlateNumber: randomLicensePlate,
    licensePlateState: 'CA',
    recaptchaToken: 'test-recaptcha-token',
    clientOrganizationKey: clientOrgKey,
    accessCode: accessCode,
  };

  // STEP 3: Execute purchase
  console.log(`VU ${__VU} Iter ${__ITER}: Purchasing with hold ${holdData.holdId}...`);

  const purchaseStartTime = new Date();
  let purchaseResponse;

  if (productType === ProductType.EventPass) {
    purchaseResponse = fullEventPassFlow(baseUrl, headers, holdData, purchaseData);
  } else {
    purchaseResponse = fullSeasonPassFlow(baseUrl, headers, holdData, purchaseData);
  }

  const purchaseDurationMs = new Date() - purchaseStartTime;
  purchaseDuration.add(purchaseDurationMs);

  const purchaseSuccess = purchaseResponse.status === 200;
  purchaseSuccessRate.add(purchaseSuccess);

  if (purchaseSuccess) {
    totalPurchases.add(1);
    console.log(`VU ${__VU} Iter ${__ITER}: Purchase completed successfully in ${purchaseDurationMs}ms`);
  } else {
    console.error(`VU ${__VU} Iter ${__ITER}: Purchase failed - ${purchaseResponse.status}: ${purchaseResponse.body}`);
  }

  // Think time between iterations
  sleep(2);
}

export function teardown(data) {
  console.log('Complete purchase flow load test finished!');
}
