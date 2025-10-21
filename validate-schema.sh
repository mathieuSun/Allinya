#!/bin/bash
# Schema Validation Runner
# This script validates the entire codebase for camelCase compliance

echo "================================"
echo "RUNNING SCHEMA VALIDATION"
echo "================================"

# Run the TypeScript validation script
echo "Running schema validation..."
npx tsx scripts/validateSchema.ts

VALIDATION_EXIT_CODE=$?

if [ $VALIDATION_EXIT_CODE -eq 0 ]; then
    echo "✅ Schema validation PASSED"
else
    echo "❌ Schema validation FAILED"
    echo "Please fix all violations before proceeding."
    exit 1
fi

# Run TypeScript type checking
echo ""
echo "Running TypeScript type checking..."
npm run check

TYPECHECK_EXIT_CODE=$?

if [ $TYPECHECK_EXIT_CODE -eq 0 ]; then
    echo "✅ TypeScript validation PASSED"
else
    echo "❌ TypeScript validation FAILED"
fi

# Summary
echo ""
echo "================================"
echo "VALIDATION SUMMARY"
echo "================================"

if [ $VALIDATION_EXIT_CODE -eq 0 ] && [ $TYPECHECK_EXIT_CODE -eq 0 ]; then
    echo "✅ ALL VALIDATIONS PASSED"
    echo "The system is compliant with all rules."
    exit 0
else
    echo "❌ VALIDATION FAILED"
    echo "Please fix all violations to ensure system compliance."
    exit 1
fi