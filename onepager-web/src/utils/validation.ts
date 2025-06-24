import type { OnePagerData, ValidationRule } from '../types/onepager';
import { VALIDATION_RULES } from '../types/onepager';

export const validateField = (value: unknown, rules: ValidationRule[]): string[] => {
  const errors: string[] = [];

  for (const rule of rules) {
    // Required validation
    if (rule.required) {
      if (typeof value === 'string' && value.trim().length === 0) {
        errors.push(`${rule.field} is required`);
        continue;
      }
      if (Array.isArray(value) && value.length === 0) {
        errors.push(`${rule.field} is required`);
        continue;
      }
      if (value === null || value === undefined) {
        errors.push(`${rule.field} is required`);
        continue;
      }
    }

    // String-specific validations
    if (typeof value === 'string') {
      // Min length validation
      if (rule.minLength && value.trim().length < rule.minLength) {
        errors.push(`${rule.field} must be at least ${rule.minLength} characters`);
      }

      // Max length validation
      if (rule.maxLength && value.trim().length > rule.maxLength) {
        errors.push(`${rule.field} must be less than ${rule.maxLength} characters`);
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${rule.field} format is invalid`);
      }
    }

    // Custom validation
    if (rule.customValidator) {
      const customError = rule.customValidator(value);
      if (customError) {
        errors.push(customError);
      }
    }
  }

  return errors;
};

export const validateStep = (
  data: OnePagerData,
  step: keyof typeof VALIDATION_RULES
): { errors: string[]; isValid: boolean } => {
  const rules = VALIDATION_RULES[step];
  if (!rules) {
    return { errors: [], isValid: true };
  }

  let allErrors: string[] = [];

  for (const rule of rules) {
    let value: unknown;
    
    // Extract the value based on the field name
    switch (rule.field) {
      case 'fullName':
        value = data.basicInfo.fullName;
        break;
      case 'position':
        value = data.basicInfo.position;
        break;
      case 'focusAreas':
        value = data.focusAreas;
        break;
      case 'experience':
        value = data.experience;
        break;
      case 'projects':
        value = data.projects;
        break;
      default:
        continue;
    }

    const fieldErrors = validateField(value, [rule]);
    allErrors = [...allErrors, ...fieldErrors];
  }

  return {
    errors: allErrors,
    isValid: allErrors.length === 0,
  };
};

export const validateAllSteps = (data: OnePagerData): Record<string, string[]> => {
  const allErrors: Record<string, string[]> = {};

  for (const step of Object.keys(VALIDATION_RULES)) {
    const { errors } = validateStep(data, step as keyof typeof VALIDATION_RULES);
    if (errors.length > 0) {
      allErrors[step] = errors;
    }
  }

  return allErrors;
};

export const isStepComplete = (
  data: OnePagerData,
  step: keyof typeof VALIDATION_RULES
): boolean => {
  const { isValid } = validateStep(data, step);
  return isValid;
};
