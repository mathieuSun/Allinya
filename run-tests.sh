#!/bin/bash

# Professional Testing Script for Allinya
# Complete test suite execution with coverage and reporting

echo "🧪 Allinya Test Suite Runner"
echo "================================"

# Function to display help
show_help() {
  echo "Usage: ./run-tests.sh [option]"
  echo ""
  echo "Options:"
  echo "  unit        Run unit tests only"
  echo "  integration Run integration tests only"
  echo "  e2e         Run end-to-end tests only"
  echo "  coverage    Run tests with coverage report"
  echo "  ui          Open Vitest UI"
  echo "  e2e-ui      Open Playwright UI"
  echo "  all         Run all tests (default)"
  echo "  help        Show this help message"
  echo ""
}

# Parse command line arguments
TEST_TYPE=${1:-all}

case $TEST_TYPE in
  unit)
    echo "📦 Running unit tests..."
    npx vitest run tests/unit
    ;;
  integration)
    echo "🔌 Running integration tests..."
    npx vitest run tests/integration
    ;;
  e2e)
    echo "🌐 Running end-to-end tests..."
    npx playwright test
    ;;
  coverage)
    echo "📊 Running tests with coverage..."
    npx vitest run --coverage
    ;;
  ui)
    echo "🖥️ Opening Vitest UI..."
    npx vitest --ui
    ;;
  e2e-ui)
    echo "🖥️ Opening Playwright UI..."
    npx playwright test --ui
    ;;
  all)
    echo "🚀 Running complete test suite..."
    echo ""
    
    echo "1️⃣ Unit Tests"
    echo "---------------"
    npx vitest run tests/unit
    UNIT_RESULT=$?
    
    echo ""
    echo "2️⃣ Integration Tests"
    echo "---------------------"
    npx vitest run tests/integration
    INTEGRATION_RESULT=$?
    
    echo ""
    echo "3️⃣ End-to-End Tests"
    echo "--------------------"
    npx playwright test
    E2E_RESULT=$?
    
    echo ""
    echo "================================"
    echo "📊 Test Results Summary"
    echo "================================"
    
    if [ $UNIT_RESULT -eq 0 ]; then
      echo "✅ Unit Tests: PASSED"
    else
      echo "❌ Unit Tests: FAILED"
    fi
    
    if [ $INTEGRATION_RESULT -eq 0 ]; then
      echo "✅ Integration Tests: PASSED"
    else
      echo "❌ Integration Tests: FAILED"
    fi
    
    if [ $E2E_RESULT -eq 0 ]; then
      echo "✅ E2E Tests: PASSED"
    else
      echo "❌ E2E Tests: FAILED"
    fi
    
    # Exit with error if any tests failed
    if [ $UNIT_RESULT -ne 0 ] || [ $INTEGRATION_RESULT -ne 0 ] || [ $E2E_RESULT -ne 0 ]; then
      exit 1
    fi
    ;;
  help)
    show_help
    ;;
  *)
    echo "Invalid option: $TEST_TYPE"
    echo ""
    show_help
    exit 1
    ;;
esac