import {
  getBuildFormValidation,
  resolveBuildFormValidationTriggers,
  validateBuildFormLocally,
  type BuildFormValidationResult
} from '@skitsaas/sdk';
import type { BuildFormDefinition } from '@skitsaas/sdk';

export type BuildFormLocalValidationMode = {
  enabled: boolean;
  validateOnBlur: boolean;
  validateOnChange: boolean;
  validateOnSubmit: boolean;
};

export function resolveBuildFormLocalValidationMode(
  definition: BuildFormDefinition
): BuildFormLocalValidationMode {
  const validation = getBuildFormValidation(definition);
  const hasRules =
    validation?.fields !== undefined &&
    Object.keys(validation.fields).length > 0;

  if (!hasRules) {
    return {
      enabled: false,
      validateOnBlur: false,
      validateOnChange: false,
      validateOnSubmit: false
    };
  }

  const triggers = resolveBuildFormValidationTriggers(definition, 'client');

  return {
    enabled: true,
    validateOnBlur: triggers.includes('blur'),
    validateOnChange: triggers.includes('change'),
    // Local validation always runs on submit when rules exist so enhanced
    // submits cannot bypass the client pass by accident.
    validateOnSubmit: true
  };
}

export function runBuildFormLocalValidation(
  definition: BuildFormDefinition,
  formData: FormData,
  options: {
    field?: string;
  } = {}
): BuildFormValidationResult {
  return validateBuildFormLocally(definition, formData, options);
}
