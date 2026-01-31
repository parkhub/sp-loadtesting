/**
 * K6 Load Test Scenario: Payment Stress Test
 *
 * This scenario gradually increases load to find the breaking point
 * of the payment system.
 *
 * Usage:
 *   k6 run scenarios/payment-stress-test.js
 */

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up to 10 users
    { duration: '2m', target: 10 },   // Stay at 10
    { duration: '1m', target: 20 },   // Ramp up to 20 users
    { duration: '2m', target: 20 },   // Stay at 20
    { duration: '1m', target: 30 },   // Ramp up to 30 users
    { duration: '2m', target: 30 },   // Stay at 30
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<5000'], // Allow degraded performance
    'http_req_failed': ['rate<0.15'],     // Allow 15% failure at peak
  },
};

// Import the main test logic from payments-flow.js
import defaultFn, { setup, teardown } from '../tests/payments-flow.js';

export { setup, teardown };
export default defaultFn;
