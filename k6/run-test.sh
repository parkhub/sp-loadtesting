#!/bin/bash

# K6 Test Runner Script
# Usage: ./run-test.sh [test-name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create a .env file from .env.example:"
    echo "  cp .env.example .env"
    echo "  # Edit .env with your configuration"
    exit 1
fi

# Load environment variables
echo -e "${GREEN}Loading environment variables from .env...${NC}"
export $(cat .env | grep -v '^#' | xargs)

# Validate required variables
if [ -z "$BASE_URL" ] || [ -z "$BASIC_AUTH_USERNAME" ] || [ -z "$BASIC_AUTH_PASSWORD" ]; then
    echo -e "${RED}Error: Missing required environment variables!${NC}"
    echo "Please set BASE_URL, BASIC_AUTH_USERNAME, and BASIC_AUTH_PASSWORD in .env"
    exit 1
fi

# Default test
TEST=${1:-complete-purchase-flow}

echo -e "${GREEN}Configuration:${NC}"
echo "  Base URL: $BASE_URL"
echo "  Username: $BASIC_AUTH_USERNAME"
echo "  Product Type: $PRODUCT_TYPE"
echo "  Listing ID: $TEST_LISTING_ID"
echo "  Pricing ID: $TEST_PRICING_ID"
echo ""

# Run the test based on argument
case $TEST in
    complete|complete-purchase-flow)
        echo -e "${YELLOW}Running Complete Purchase Flow Test...${NC}"
        k6 run tests/complete-purchase-flow.js
        ;;

    concurrent)
        echo -e "${YELLOW}Running Concurrent Purchase Test...${NC}"
        k6 run scenarios/purchase-concurrent-test.js
        ;;

    sustained)
        echo -e "${YELLOW}Running Sustained Purchase Load Test...${NC}"
        k6 run scenarios/purchase-sustained-test.js
        ;;

    spike)
        echo -e "${YELLOW}Running Spike Test...${NC}"
        k6 run scenarios/payment-spike-test.js
        ;;

    stress)
        echo -e "${YELLOW}Running Stress Test...${NC}"
        k6 run scenarios/payment-stress-test.js
        ;;

    soak)
        echo -e "${YELLOW}Running Soak Test...${NC}"
        k6 run scenarios/payment-soak-test.js
        ;;

    *)
        echo -e "${RED}Unknown test: $TEST${NC}"
        echo ""
        echo "Available tests:"
        echo "  complete          - Complete purchase flow (default)"
        echo "  concurrent        - Concurrent purchase test"
        echo "  sustained         - Sustained load test"
        echo "  spike             - Spike test"
        echo "  stress            - Stress test"
        echo "  soak              - Soak test"
        exit 1
        ;;
esac

echo -e "${GREEN}Test completed!${NC}"
