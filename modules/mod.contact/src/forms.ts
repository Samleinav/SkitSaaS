import {
  buildFormField,
  buildFormRule,
  buildFormValidationPreset,
  defineBuildForm,
  withBuildFormValidation
} from '@skitsaas/sdk';

export function createContactSubmissionFormDefinition() {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'mod.contact.frontend.contact-form',
      layout: {
        columns: 2
      },
      fields: [
        buildFormField.hidden({
          name: 'sourcePath'
        }),
        buildFormField.text({
          name: 'name',
          label: 'Name',
          placeholder: 'Jane Doe',
          required: true,
          maxLength: 120
        }),
        buildFormField.email({
          name: 'email',
          label: 'Email',
          placeholder: 'jane@example.com',
          required: true,
          maxLength: 255
        }),
        buildFormField.text({
          name: 'subject',
          label: 'Subject',
          placeholder: 'How can we help?',
          maxLength: 180,
          colSpan: 'full'
        }),
        buildFormField.textarea({
          name: 'message',
          label: 'Message',
          placeholder:
            'Tell us a bit about what you need and we will get back to you soon.',
          required: true,
          rows: 6,
          maxLength: 4000,
          colSpan: 'full'
        })
      ]
    }),
    buildFormValidationPreset.blur({
      name: [buildFormRule.required(), buildFormRule.maxLength(120)],
      email: [
        buildFormRule.required(),
        buildFormRule.email(),
        buildFormRule.maxLength(255)
      ],
      subject: [buildFormRule.maxLength(180)],
      message: [
        buildFormRule.required(),
        buildFormRule.minLength(10),
        buildFormRule.maxLength(4000)
      ],
      sourcePath: [buildFormRule.maxLength(255)]
    })
  );
}
