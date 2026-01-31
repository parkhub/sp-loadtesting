# K6 Load Tests

Load testing scripts using [k6](https://k6.io/) for SmartPass API.

## Directory Structure

- `tests/` - Load test scripts
  - `payments-flow.js` - Basic payment flow load test (legacy)
  - `complete-purchase-flow.js` - **Complete flow with dynamic hold creation** (recommended)
- `lib/` - Shared utilities and helper functions
  - `auth.js` - Authentication utilities
  - `payments.js` - Event pass payment functions
  - `seasonpass.js` - Season pass purchase functions
  - `inventory.js` - Inventory hold management functions
  - `config.js` - Configuration helpers
- `data/` - Test data files (CSV, JSON, etc.)
  - `test-config.example.json` - Example configuration file
- `scenarios/` - Test scenario configurations
  - `payment-spike-test.js` - Sudden traffic spike test
  - `payment-stress-test.js` - Gradual load increase to find limits
  - `payment-soak-test.js` - Sustained load over time
  - `purchase-concurrent-test.js` - Concurrent purchases on same listing
  - `purchase-sustained-test.js` - Sustained purchase load test

## Getting Started

### Prerequisites

Install k6:
```bash
# macOS
brew install k6

# Or download from https://k6.io/docs/getting-started/installation/
```

### Configuration

Set up your test environment variables:

```bash
# Required
export BASE_URL="https://api-stage.smartpass.com"
export BASIC_AUTH_USERNAME="your-username"
export BASIC_AUTH_PASSWORD="your-password"

# Optional test data
export TEST_LISTING_ID="00000000-0000-0000-0000-000000000001"
export TEST_HOLD_ID="00000000-0000-0000-0000-000000000002"
export TEST_CLIENT_ORG_KEY="00000000-0000-0000-0000-000000000003"
```

Or create a `.env` file (not committed to git):
```bash
cp data/test-config.example.json data/test-config.json
# Edit data/test-config.json with your values
```

### Running Tests

#### Complete Purchase Flow (Recommended)
Tests the full flow: listing → hold creation → purchase → completion
```bash
# Event pass purchase
PRODUCT_TYPE=0 \
TEST_LISTING_ID=your-listing-id \
TEST_PRICING_ID=your-pricing-id \
k6 run tests/complete-purchase-flow.js

# Season pass purchase
PRODUCT_TYPE=1 \
TEST_LISTING_ID=your-listing-id \
TEST_PRICING_ID=your-pricing-id \
k6 run tests/complete-purchase-flow.js
```

#### Basic Payment Flow Test (Legacy)
```bash
k6 run tests/payments-flow.js
```

#### Spike Test (Sudden Traffic Increase)
```bash
k6 run scenarios/payment-spike-test.js
```

#### Stress Test (Find Breaking Point)
```bash
k6 run scenarios/payment-stress-test.js
```

#### Soak Test (Sustained Load)
```bash
k6 run scenarios/payment-soak-test.js
```

#### Concurrent Purchase Test
Tests multiple users purchasing from the same listing simultaneously
```bash
k6 run scenarios/purchase-concurrent-test.js
```

#### Sustained Purchase Load Test
Maintains constant purchase rate over extended period
```bash
k6 run scenarios/purchase-sustained-test.js
```

#### Custom Configuration
```bash
# Override VUs and duration
k6 run --vus 20 --duration 60s tests/payments-flow.js

# With custom environment variables
BASE_URL=https://api.smartpass.com \
BASIC_AUTH_USERNAME=test \
BASIC_AUTH_PASSWORD=pass \
k6 run tests/payments-flow.js
```

## Complete Purchase Flow Tests

The `complete-purchase-flow.js` test simulates the full user journey:

### Flow Steps:

1. **Create Inventory Hold** (`/api/inventory-holds`)
   - Creates dynamic hold/cart for the listing
   - Receives hold ID, expiry time, and amount
   - Hold is valid for ~10-15 minutes

2. **Purchase Pass** (`/api/pass/purchase` or `/api/listings/seasonpass/purchase`)
   - Processes payment with Stripe token
   - Uses the hold ID from step 1
   - Validates listing, hold expiry, and amount
   - Creates transaction
   - Returns pass or requires 3DS action

3. **Complete Purchase** (if 3DS required)
   - `/api/pass/purchase-complete` or `/api/listings/seasonpass/purchase-complete`
   - Completes async payment confirmation
   - Fulfills pass/package after confirmation

### Product Types:

- **Event Pass** (PRODUCT_TYPE=0): Single event parking pass
- **Season Pass** (PRODUCT_TYPE=1): Multi-event package with cart-based holds

### Test Scenarios

- **Complete Flow**: Full purchase journey with dynamic hold creation (recommended for realistic testing)
- **Default**: Gradual ramp-up to test normal load
- **Spike Test**: Sudden traffic increase (simulates flash sales)
- **Stress Test**: Gradually increases load to find system limits
- **Soak Test**: Sustained load over 30+ minutes to identify memory leaks
- **Concurrent Test**: Multiple users purchasing from same listing simultaneously
- **Sustained Load**: Constant purchase rate over extended period

### Metrics

Custom metrics tracked:
- `purchase_success_rate` - Percentage of successful purchases
- `hold_creation_success_rate` - Percentage of successful hold creations
- `purchase_duration` - Time to complete purchase flow
- `hold_creation_duration` - Time to create inventory hold
- `total_purchases` - Counter of successful purchases
- `failed_holds` - Counter of failed hold creations

Standard k6 metrics:
- `http_req_duration` - HTTP request latency
- `http_req_failed` - Failed request rate
- `http_reqs` - Total requests per second

### Thresholds

Default thresholds:
- 95% of requests should complete in < 2 seconds
- Less than 5% request failure rate
- Payment success rate > 95%

## Test Data Requirements

The complete purchase flow requires:
- **Valid Listing ID**: Must exist in the system (eGDS listing for EventPass, SmartPass listing for SeasonPass)
- **Valid Pricing ID**: Must be a valid price tier for the listing
- **Client Organization Key**: Valid organization UUID
- **Product Type**: 0 = EventPass, 1 = SeasonPass
- **Payment Token**: Stripe test token (default: `tok_visa`)
- **Landmark ID**: Required for season pass listings (optional)
- **Access Code**: Required if listing has access code enabled (optional)

**Note**: Holds are created dynamically during the test, so you don't need to pre-create them.

For testing environments, use the mock payment provider or Stripe test mode.

## Writing New Tests

Create new test files in the `tests/` directory. Basic template:

```javascript
import { sleep } from 'k6';
import { getBaseUrl, getBasicAuthCredentials } from '../lib/config.js';

export const options = {
  vus: 10,
  duration: '30s',
};

export function setup() {
  // Runs once before test
  return {
    baseUrl: getBaseUrl(),
    credentials: getBasicAuthCredentials(),
  };
}

export default function(data) {
  // Main test logic - runs for each VU iteration
  // Your test code here

  sleep(1);
}

export function teardown(data) {
  // Runs once after test
}
```

## CI/CD Integration

Run tests in CI pipeline:

```bash
# Run with thresholds (fails if thresholds not met)
k6 run --out json=results.json tests/payments-flow.js

# Run without thresholds (for monitoring only)
k6 run --no-thresholds tests/payments-flow.js
```

## Cloud Integration

Run tests on k6 Cloud:

```bash
# Login to k6 Cloud
k6 login cloud

# Run test on k6 Cloud
k6 cloud tests/payments-flow.js
```

## Troubleshooting

### Authentication Errors
- Verify `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` are correct
- Check that the auth credentials have proper permissions

### Invalid Test Data
- Ensure `TEST_LISTING_ID` and `TEST_HOLD_ID` point to valid, active records
- Verify the test environment has proper seed data

### High Failure Rate
- Check API health and availability
- Verify rate limiting settings
- Review application logs for errors

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [SmartPass API Documentation](https://github.com/parkhub/smartpass-api)
- [Stripe Test Cards](https://stripe.com/docs/testing)
