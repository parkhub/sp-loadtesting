/**
 * K6 Load Test Scenario: Payment Soak Test
 *
 * This scenario runs a sustained load over a long period to identify
 * memory leaks, resource exhaustion, or degradation over time.
 *
 * Usage:
 *   k6 run scenarios/payment-soak-test.js
 */

export const options = {
  stages: [
    { duration: '2m', target: 10 },    // Ramp up to normal load
    { duration: '30m', target: 10 },   // Stay at normal load for 30 minutes
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'],     // Should maintain performance
    'http_req_failed': ['rate<0.05'],         // Should maintain reliability
    'http_req_duration{name:PurchasePass}': ['p(95)<2500'], // Payment-specific threshold
  },
};

// Import the main test logic from payments-flow.js
import defaultFn, { setup, teardown } from '../tests/payments-flow.js';

export { setup, teardown };
export default defaultFn;
