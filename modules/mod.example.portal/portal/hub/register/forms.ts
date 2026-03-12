import {
  buildFormField,
  buildFormRule,
  buildFormValidationPreset,
  composeBuildFormDefinition,
  defineBuildForm,
  withBuildFormValidation,
} from '@skitsaas/sdk';

export function createHubRegisterFormDefinition() {
  return composeBuildFormDefinition(
    withBuildFormValidation(
      defineBuildForm({
        id: 'hub-register-form',
        layout: { columns: 2 },
        fields: [
          buildFormField.text({
            name: 'name',
            label: 'Full name',
            placeholder: 'Enter your name',
            required: true,
            maxLength: 100,
            colSpan: 2,
          }),
          buildFormField.email({
            name: 'email',
            label: 'Email address',
            placeholder: 'you@example.com',
            required: true,
            maxLength: 255,
            colSpan: 2,
          }),
          buildFormField.password({
            name: 'password',
            label: 'Password',
            placeholder: '••••••••',
            required: true,
            minLength: 8,
            maxLength: 72,
          }),
          buildFormField.password({
            name: 'password_confirmation',
            label: 'Confirm password',
            placeholder: '••••••••',
            required: true,
          }),
        ],
      }),
      buildFormValidationPreset.blur({
        name: [buildFormRule.required(), buildFormRule.maxLength(100)],
        email: [
          buildFormRule.required(),
          buildFormRule.email(),
          buildFormRule.maxLength(255),
        ],
        password: [
          buildFormRule.required(),
          buildFormRule.minLength(8),
          buildFormRule.maxLength(72),
        ],
        password_confirmation: [
          buildFormRule.required(),
          buildFormRule.confirmed('password'),
        ],
      })
    ),
    {
      submit: {
        idleLabel: 'Create account',
        pendingLabel: 'Creating…',
        align: 'start',
      },
    }
  );
}
