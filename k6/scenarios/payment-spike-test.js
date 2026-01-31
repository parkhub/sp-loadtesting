/**
 * K6 Load Test Scenario: Payment Spike Test
 *
 * This scenario tests how the payment system handles sudden traffic spikes,
 * simulating scenarios like flash sales or event releases.
 *
 * Usage:
 *   k6 run scenarios/payment-spike-test.js
 */

export const options = {
  scenarios: {
    spike_test: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '10s', target: 5 },   // Normal load
        { duration: '10s', target: 50 },  // Spike!
        { duration: '30s', target: 50 },  // Sustained spike
        { duration: '10s', target: 5 },   // Back to normal
        { duration: '30s', target: 5 },   // Recovery
      ],
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<3000'], // Allow higher latency during spike
    'http_req_failed': ['rate<0.10'],     // Allow 10% failure during spike
  },
};

// Import the main test logic from payments-flow.js
import defaultFn, { setup, teardown } from '../tests/payments-flow.js';

export { setup, teardown };
export default defaultFn;
