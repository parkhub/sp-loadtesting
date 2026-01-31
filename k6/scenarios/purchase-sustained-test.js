/**
 * K6 Load Test Scenario: Sustained Purchase Load Test
 *
 * This scenario runs a sustained load to test system stability over time
 * with continuous purchase transactions.
 *
 * Usage:
 *   k6 run scenarios/purchase-sustained-test.js
 */

export const options = {
  scenarios: {
    sustained_load: {
      executor: 'constant-arrival-rate',
      rate: 17,             // 17 purchases per second (~15k over 15 min)
      timeUnit: '1s',
      duration: '5m',      // Run for 15 minutes
      preAllocatedVUs: 50,
      maxVUs: 400,
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<3000'],
    'purchase_success_rate': ['rate>0.95'],
    'hold_creation_success_rate': ['rate>0.95'],
    'http_req_failed': ['rate<0.05'],
  },
};

// Import the main test logic
import defaultFn, { setup, teardown } from '../tests/complete-purchase-flow.js';

export { setup, teardown };
export default defaultFn;
