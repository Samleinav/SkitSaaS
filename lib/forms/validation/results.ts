import type {
  BuildFormValidationMessageInput,
  BuildFormValidationMessageResolver,
  BuildFormValidationResult,
  BuildFormValues
} from '@skitsaas/sdk';
import { createBuildFormValidationResultFromFieldMessages } from '@skitsaas/sdk';

export type BuildFormValidationUiState = Pick<
  BuildFormValidationResult,
  'fieldErrors' | 'formError'
>;

export function createBuildFormValidationUiState(
  result?: Partial<BuildFormValidationUiState> | null
): BuildFormValidationUiState {
  return {
    fieldErrors: result?.fieldErrors ?? {},
    formError: result?.formError ?? null
  };
}

export function mergeBuildFormFieldValidationResult(
  state: BuildFormValidationUiState,
  result: Pick<BuildFormValidationResult, 'fieldErrors' | 'formError'>,
  fieldName: string
): BuildFormValidationUiState {
  const nextFieldErrors = { ...state.fieldErrors };
  const messages = result.fieldErrors[fieldName];

  if (messages?.length) {
    nextFieldErrors[fieldName] = messages;
  } else {
    delete nextFieldErrors[fieldName];
  }

  return {
    fieldErrors: nextFieldErrors,
    formError: result.formError
  };
}

export function resolveBuildFormFirstFieldError(
  state: Pick<BuildFormValidationUiState, 'fieldErrors'>,
  fieldName: string
) {
  return state.fieldErrors[fieldName]?.[0] ?? null;
}

export function createBuildFormInvalidFactory<
  TValues extends BuildFormValues = BuildFormValues
>({
  values,
  resolveMessage
}: {
  values: TValues;
  resolveMessage?: BuildFormValidationMessageResolver;
}) {
  return (
    fieldMessages: Record<
      string,
      BuildFormValidationMessageInput | BuildFormValidationMessageInput[]
    >,
    formMessage: BuildFormValidationMessageInput | null = null
  ) =>
    createBuildFormValidationResultFromFieldMessages({
      values,
      fieldMessages,
      formMessage,
      source: 'server',
      resolveMessage
    });
}
