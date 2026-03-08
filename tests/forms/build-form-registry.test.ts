import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  buildFormField,
  type BuildFormDefinition,
  composeBuildFormDefinition,
  defineBuildForm
} from '../../app/sdk/src/forms';
import { buildFormValidationMessage } from '../../app/sdk/src/validation-messages';
import {
  getBuildFormValidation,
  shouldRunBuildFormPreflight
} from '../../app/sdk/src/form-validation';
import { BuildForm } from '../../components/ui/build-form';
import {
  createAdminCreateUserBuildFormBase,
  createAdminDeleteUserBuildFormBase,
  createAdminEditUserProfileBuildFormBase,
  createAdminEditUserStatusBuildFormBase
} from '../../app/(dashboard)/admin/users/forms';
import { createAdminOrganizationControlsBuildFormBase } from '../../app/(dashboard)/admin/app-config/forms';
import {
  createAdminDeleteSubscriptionTemplateBuildFormBase,
  createAdminRequestTemplateActiveUpdateBuildFormBase
} from '../../app/(dashboard)/admin/subscriptions/forms';
import {
  createAdminClearOrganizationSubscriptionBuildFormBase,
  createAdminManageOrganizationSubscriptionBuildFormBase,
  createAdminUpdateUserSubscriptionBuildFormBase
} from '../../app/(dashboard)/admin/suscriptions/forms';
import { createDashboardUpdateAccountBuildFormBase } from '../../app/(dashboard)/dashboard/general/forms';
import {
  createDashboardDeleteAccountBuildFormBase,
  createDashboardUpdatePasswordBuildFormBase
} from '../../app/(dashboard)/dashboard/security/forms';
import {
  createDashboardCancelUserSubscriptionBuildFormBase,
  createDashboardManageOrganizationSubscriptionBuildFormBase
} from '../../app/(dashboard)/dashboard/subscriptions/forms';
import {
  createDashboardSubscriptionValidationMessageResolver,
  dashboardSubscriptionValidationMessage
} from '../../app/(dashboard)/dashboard/subscriptions/validation-messages';
import { listRegisteredBuildFormDbTargets } from '../../lib/forms/db-registry';
import {
  listBuildFormControllerCatalog,
  resolveBuildFormControllerCatalogEntry
} from '../../lib/forms/registry-catalog';
import { createCoreBuildFormValidationMessageResolver } from '../../lib/forms/validation/catalog';

function listCurrentCoreBuildForms() {
  return [
    createAdminCreateUserBuildFormBase(),
    createAdminEditUserProfileBuildFormBase(),
    createAdminEditUserStatusBuildFormBase(),
    createAdminDeleteUserBuildFormBase(),
    createAdminOrganizationControlsBuildFormBase(),
    createAdminUpdateUserSubscriptionBuildFormBase(),
    createAdminManageOrganizationSubscriptionBuildFormBase(),
    createAdminClearOrganizationSubscriptionBuildFormBase(),
    createAdminRequestTemplateActiveUpdateBuildFormBase(),
    createAdminDeleteSubscriptionTemplateBuildFormBase(),
    createDashboardUpdateAccountBuildFormBase(),
    createDashboardUpdatePasswordBuildFormBase(),
    createDashboardDeleteAccountBuildFormBase(),
    createDashboardCancelUserSubscriptionBuildFormBase(),
    createDashboardManageOrganizationSubscriptionBuildFormBase()
  ];
}

function listBuildFormDbTargets(definition: BuildFormDefinition) {
  const validation = getBuildFormValidation(definition);
  const targets = new Set<string>();

  for (const rules of Object.values(validation?.fields ?? {})) {
    for (const rule of rules) {
      if (
        (rule.type === 'unique' || rule.type === 'exists') &&
        rule.target.kind === 'db_ref'
      ) {
        targets.add(rule.target.target);
      }
    }
  }

  return [...targets].sort((left, right) => left.localeCompare(right));
}

test('shared validation catalog resolves generic and dashboard-specific messages', () => {
  const spanishResolver = createCoreBuildFormValidationMessageResolver('es');
  assert.equal(
    spanishResolver(buildFormValidationMessage.required('Correo')),
    'Correo es obligatorio.'
  );

  const dashboardResolver =
    createDashboardSubscriptionValidationMessageResolver('en');
  assert.equal(
    dashboardResolver(
      dashboardSubscriptionValidationMessage.organizationUnavailable()
    ),
    'Subscription management is not available for this organization.'
  );
});

test('dashboard subscription form bases stay lightweight and composable', () => {
  const cancelForm = createDashboardCancelUserSubscriptionBuildFormBase();
  const manageForm = createDashboardManageOrganizationSubscriptionBuildFormBase();
  const composedManageForm = composeBuildFormDefinition(manageForm, {
    submit: {
      idleLabel: 'Manage organization subscription'
    },
    values: {
      teamId: 42
    }
  });

  assert.equal(cancelForm.id, 'dashboard-cancel-user-subscription-form');
  assert.deepEqual(cancelForm.validation, {
    fields: {}
  });

  assert.equal(manageForm.id, 'dashboard-manage-organization-subscription-form');
  assert.equal(manageForm.fields?.[0]?.kind, 'hidden');
  assert.equal(manageForm.fields?.[0]?.name, 'teamId');
  assert.equal(composedManageForm.submit?.idleLabel, 'Manage organization subscription');
  assert.equal(composedManageForm.values?.teamId, 42);
});

test('composeBuildFormDefinition can still hydrate empty validated forms safely', () => {
  const form = composeBuildFormDefinition(
    defineBuildForm({
      id: 'empty-validated-form'
    }),
    {
      values: {
        confirmation: 'true'
      },
      submit: {
        idleLabel: 'Confirm'
      }
    }
  );

  assert.equal(form.id, 'empty-validated-form');
  assert.equal(form.values?.confirmation, 'true');
  assert.equal(form.submit?.idleLabel, 'Confirm');
});

test('all adopted core BuildForms are present in the host controller registry', () => {
  const currentCoreForms = listCurrentCoreBuildForms();
  const registeredIds = new Set(
    listBuildFormControllerCatalog().map((entry) => entry.formId)
  );

  for (const form of currentCoreForms) {
    assert.ok(
      registeredIds.has(form.id),
      `Expected "${form.id}" to be registered in lib/forms/registry.ts`
    );
  }
});

test('every preflight-enabled core BuildForm resolves through the host registry', () => {
  const preflightFormIds = listCurrentCoreBuildForms()
    .filter((form) => shouldRunBuildFormPreflight(form))
    .map((form) => form.id)
    .sort((left, right) => left.localeCompare(right));

  assert.deepEqual(preflightFormIds, [
    'admin-create-user-form',
    'admin-edit-user-profile-form',
    'admin-manage-organization-subscription-form',
    'admin-update-user-subscription-form',
    'dashboard-update-account-form'
  ]);

  for (const formId of preflightFormIds) {
    assert.ok(
      resolveBuildFormControllerCatalogEntry(formId),
      `Expected a registered controller catalog entry for "${formId}".`
    );
  }
});

test('every active core dbRef target is covered by the host db resolver registry', () => {
  const activeTargets = new Set<string>();
  for (const form of listCurrentCoreBuildForms()) {
    for (const target of listBuildFormDbTargets(form)) {
      activeTargets.add(target);
    }
  }

  const sortedActiveTargets = [...activeTargets].sort((left, right) =>
    left.localeCompare(right)
  );
  assert.deepEqual(sortedActiveTargets, [
    'core.subscription_templates.any',
    'core.subscription_templates.organization',
    'core.subscription_templates.user',
    'core.users.email'
  ]);

  const registeredTargets = new Set(listRegisteredBuildFormDbTargets());
  for (const target of sortedActiveTargets) {
    assert.ok(
      registeredTargets.has(target),
      `Expected a DB resolver for "${target}" in lib/forms/db-registry.ts`
    );
  }
});

test('BuildForm renders a plain HTML form contract for non-JS submissions', () => {
  const definition = composeBuildFormDefinition(
    defineBuildForm({
      id: 'dashboard-manage-organization-subscription-form',
      fields: [
        buildFormField.hidden({
          name: 'teamId'
        })
      ]
    }),
    {
      request: {
        action: '/dashboard/subscriptions',
        method: 'post'
      },
      values: {
        teamId: 42
      }
    }
  );

  const html = renderToStaticMarkup(
    createElement(BuildForm, {
      definition,
      area: 'dashboard'
    })
  );

  assert.match(html, /<form[^>]*action="\/dashboard\/subscriptions"/);
  assert.match(html, /<form[^>]*method="post"/);
  assert.match(html, /<input[^>]*type="hidden"[^>]*name="teamId"[^>]*value="42"/);
});

test('BuildForm confirm flows expose a noscript submit fallback for no-JS browsers', () => {
  const definition = composeBuildFormDefinition(
    createAdminDeleteUserBuildFormBase(),
    {
      request: {
        action: '/admin/users/7/delete',
        method: 'post'
      },
      values: {
        userId: 7,
        requiresTransfer: 'false'
      },
      submit: {
        idleLabel: 'Delete user',
        pendingLabel: 'Deleting...',
        confirm: {
          title: 'Delete user',
          description: 'This action is permanent.',
          confirmLabel: 'Delete now',
          cancelLabel: 'Cancel'
        }
      }
    }
  );

  const html = renderToStaticMarkup(
    createElement(BuildForm, {
      definition,
      area: 'admin'
    })
  );

  assert.match(html, /<noscript><button[^>]*type="submit"/);
  assert.match(html, />Delete now<\/button><\/noscript>/);
});
