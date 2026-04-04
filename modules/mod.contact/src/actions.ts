'use server';

import {
  createValidatedServerActionController,
  createValidBuildFormResult
} from '@skitsaas/sdk/server';
import { CONTACT_ADMIN_ALIAS } from './constants';
import { createContactSubmission } from './data';
import { createContactSubmissionFormDefinition } from './forms';

type ContactSubmissionFormValues = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  sourcePath?: string;
};

const publicValidatedAction =
  createValidatedServerActionController<null>({
    requireUser: async () => null
  });

export const submitContactSubmissionAction = publicValidatedAction(
  createContactSubmissionFormDefinition(),
  async ({ values }) => {
    try {
      const created = await createContactSubmission({
        name: values.name,
        email: values.email,
        subject: values.subject,
        message: values.message,
        sourcePath: values.sourcePath
      });

      if (!created) {
        return false;
      }

      return createValidBuildFormResult<ContactSubmissionFormValues>({
        name: '',
        email: '',
        subject: '',
        message: '',
        sourcePath:
          typeof values.sourcePath === 'string' ? values.sourcePath : '/contact-us'
      });
    } catch {
      return false;
    }
  },
  {
    revalidatePaths: [CONTACT_ADMIN_ALIAS],
    failureFormError: 'We could not send your message. Please try again.'
  }
);
