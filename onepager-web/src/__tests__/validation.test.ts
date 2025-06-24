// Simple validation tests for OnePager functionality
// Run with: npx tsx src/__tests__/validation.test.ts

import { validateField, validateStep } from '../utils/validation';
import { createInitialState } from '../store/onePagerReducer';
import { VALIDATION_RULES, Position } from '../types/onepager';

// Simple test framework
function test(description: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${description}`);
  } catch (error) {
    console.log(`❌ ${description}`);
    console.error(error);
  }
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toEqual(expected: unknown) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toHaveLength(length: number) {
      if (!Array.isArray(actual) || actual.length !== length) {
        throw new Error(`Expected array with length ${length}, got ${actual}`);
      }
    },
  };
}

// Tests
console.log('Running validation tests...\n');

test('validateField should validate required string fields', () => {
  const rules = [{ field: 'fullName', required: true }];
  
  const errors1 = validateField('', rules);
  expect(errors1).toHaveLength(1);
  
  const errors2 = validateField('John Doe', rules);
  expect(errors2).toHaveLength(0);
});

test('validateField should validate min length', () => {
  const rules = [{ field: 'fullName', minLength: 3 }];
  
  const errors1 = validateField('Jo', rules);
  expect(errors1).toHaveLength(1);
  
  const errors2 = validateField('John', rules);
  expect(errors2).toHaveLength(0);
});

test('validateField should validate max length', () => {
  const rules = [{ field: 'fullName', maxLength: 5 }];
  
  const errors1 = validateField('John Doe Smith', rules);
  expect(errors1).toHaveLength(1);
  
  const errors2 = validateField('John', rules);
  expect(errors2).toHaveLength(0);
});

test('validateField should run custom validators', () => {
  const rules = [{
    field: 'focusAreas',
    customValidator: (value: unknown) => {
      const arr = value as string[];
      return arr.length === 0 ? 'At least one item required' : null;
    }
  }];
  
  const errors1 = validateField([], rules);
  expect(errors1).toHaveLength(1);
  
  const errors2 = validateField(['React'], rules);
  expect(errors2).toHaveLength(0);
});

test('validateStep should validate basicInfo step', () => {
  const data = createInitialState();
  
  // Empty data should have errors
  const result1 = validateStep(data, 'basicInfo');
  expect(result1.isValid).toBe(false);
  expect(result1.errors.length > 0).toBe(true);
  
  // Complete data should be valid
  data.basicInfo.fullName = 'John Doe';
  data.basicInfo.position = Position.SENIOR_DEVELOPER;
  
  const result2 = validateStep(data, 'basicInfo');
  expect(result2.isValid).toBe(true);
  expect(result2.errors).toHaveLength(0);
});

test('validateStep should validate focusAreas step', () => {
  const data = createInitialState();
  
  // Empty focus areas should have errors
  const result1 = validateStep(data, 'focusAreas');
  expect(result1.isValid).toBe(false);
  
  // With focus areas should be valid
  data.focusAreas = ['React', 'TypeScript'];
  
  const result2 = validateStep(data, 'focusAreas');
  expect(result2.isValid).toBe(true);
});

console.log('\n✨ All validation tests completed!');

// Test the actual VALIDATION_RULES configuration
console.log('\nTesting VALIDATION_RULES configuration:');
console.log('Available validation rules:', Object.keys(VALIDATION_RULES));

Object.entries(VALIDATION_RULES).forEach(([stepName, rules]) => {
  console.log(`${stepName}:`, rules.map(r => r.field));
});
