/**
 * K6 Load Test: SmartPass API - Payment Flow
 *
 * This test simulates the complete payment flow for purchasing event passes.
 * It tests the main payment endpoints including purchase and completion.
 *
 * Usage:
 *   k6 run tests/payments-flow.js
 *
 * With custom environment variables:
 *   BASE_URL=https://api-stage.smartpass.com \
 *   BASIC_AUTH_USERNAME=test \
 *   BASIC_AUTH_PASSWORD=pass \
 *   k6 run tests/payments-flow.js
 *
 * With custom scenario:
 *   k6 run --vus 10 --duration 30s tests/payments-flow.js
 */

import { sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import encoding from 'k6/encoding';
import { getBaseUrl, getBasicAuthCredentials } from '../lib/config.js';
import {
  purchasePass,
  completePurchase,
  getPaymentAccount,
  fullPaymentFlow,
  createTestPaymentToken,
} from '../lib/payments.js';

// Custom metrics
const paymentSuccessRate = new Rate('payment_success_rate');
const paymentDuration = new Trend('payment_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up to 5 users
    { duration: '1m', target: 5 },    // Stay at 5 users
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95% of requests should be below 2s
    'payment_success_rate': ['rate>0.95'], // 95% success rate
    'http_req_failed': ['rate<0.05'],      // Less than 5% failed requests
  },
};

// Setup function - runs once before test
export function setup() {
  const baseUrl = getBaseUrl();
  const credentials = getBasicAuthCredentials();

  console.log(`Base URL: ${baseUrl}`);
  console.log(`Running payment flow load test...`);

  return {
    baseUrl: baseUrl,
    credentials: credentials,
  };
}

// Main test function - runs for each VU iteration
export default function(data) {
  const { baseUrl, credentials } = data;

  // Create headers with basic auth
  const headers = {
    'Authorization': `Basic ${encoding.b64encode(`${credentials.username}:${credentials.password}`)}`,
    'Content-Type': 'application/json',
  };

  // Generate random license plate (7 chars alphanumeric)
  const randomLicensePlate = Math.random().toString(36).substring(2, 9).toUpperCase();

  // Test data - these should be replaced with actual test values
  const purchasePayload = {
    amount: 1500, // $15.00 in cents
    listingId: __ENV.TEST_LISTING_ID || '00000000-0000-0000-0000-000000000001',
    holdId: __ENV.TEST_HOLD_ID || '00000000-0000-0000-0000-000000000002',
    paymentToken: 'faked',
    name: `Test User ${__VU}-${__ITER}`,
    email: `test-${__VU}-${__ITER}@example.com`,
    licensePlateNumber: randomLicensePlate,
    licensePlateState: 'CA',
    token: 'test-recaptcha-token',
    clientOrganizationKey: __ENV.TEST_CLIENT_ORG_KEY || '00000000-0000-0000-0000-000000000003',
  };

  // Record start time
  const startTime = new Date();

  // Execute payment flow
  const response = purchasePass(baseUrl, headers, purchasePayload);

  // Record metrics
  const duration = new Date() - startTime;
  paymentDuration.add(duration);

  const success = response.status === 200 || response.status === 202;
  paymentSuccessRate.add(success);

  if (!success) {
    console.error(`Payment failed for VU ${__VU}, iteration ${__ITER}: ${response.status} - ${response.body}`);
  }

  // Handle 3DS flow if needed
  if (success) {
    const body = JSON.parse(response.body);

    if (body.status === 'requires_action' && body.paymentIntent) {
      console.log(`3DS required for VU ${__VU}, completing payment...`);

      // Complete the payment
      const completePayload = {
        paymentId: body.paymentIntent,
      };

      const completeResponse = completePurchase(baseUrl, headers, completePayload);

      if (completeResponse.status !== 200) {
        console.error(`Payment completion failed: ${completeResponse.status}`);
        paymentSuccessRate.add(false);
      }
    }
  }

  // Think time between iterations
  sleep(1);
}

// Teardown function - runs once after test
export function teardown(data) {
  console.log('Payment flow load test completed!');
}
