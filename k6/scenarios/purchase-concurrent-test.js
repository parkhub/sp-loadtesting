/**
 * K6 Load Test Scenario: Concurrent Purchase Test
 *
 * This scenario tests concurrent purchases on the same listing to verify
 * inventory management and hold concurrency handling.
 *
 * Simulates scenarios like:
 * - Multiple users trying to purchase from the same listing simultaneously
 * - Flash sales with limited inventory
 * - High-demand events
 *
 * Usage:
 *   k6 run scenarios/purchase-concurrent-test.js
 */

export const options = {
  scenarios: {
    concurrent_purchases: {
      executor: 'shared-iterations',
      vus: 20,              // 20 concurrent users
      iterations: 100,       // 100 total purchases
      maxDuration: '5m',    // Max 5 minutes
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<4000'],
    'purchase_success_rate': ['rate>0.85'], // Allow some failures due to concurrency
    'hold_creation_success_rate': ['rate>0.90'],
    'http_req_failed': ['rate<0.15'],
  },
};

// Import the main test logic
import defaultFn, { setup, teardown } from '../tests/complete-purchase-flow.js';

export { setup, teardown };
export default defaultFn;
