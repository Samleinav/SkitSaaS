import {
  TemplateBuildForm,
  buildFormField,
  composeBuildFormDefinition
} from '@skitsaas/sdk';
import {
  EXAMPLE_SUITE_ADMIN_ALIAS,
  EXAMPLE_SUITE_MODULE_ID
} from '../../constants';
import {
  deleteExampleSuiteItemAdminAction,
  updateExampleSuiteItemAdminAction
} from '../../actions';
import { getExampleSuiteItemById } from '../../data';
import { createExampleSuiteAdminEditItemFormDefinition } from '../../forms';
import {
  ExampleSuiteActionLink,
  ExampleSuitePanel,
  ExampleSuiteShell
} from '../../showcase-shell';
import {
  getExampleSuiteAdminTranslator,
  interpolateExampleSuiteAdminText
} from './shared';

export async function renderExampleSuiteAdminEditPage(itemId: number) {
  const t = await getExampleSuiteAdminTranslator();
  const item = await getExampleSuiteItemById(itemId);

  if (!item) {
    return (
      <ExampleSuiteShell
        eyebrow={t('Edit flow')}
        title={t('Item not found')}
        description={interpolateExampleSuiteAdminText(
          t('No record was found for id {id}.'),
          { id: itemId }
        )}
        actions={
          <ExampleSuiteActionLink
            href={EXAMPLE_SUITE_ADMIN_ALIAS}
            label={t('Back to module home')}
          />
        }
      >
        <ExampleSuitePanel
          eyebrow={t('Missing record')}
          title={t('Nothing to edit')}
          description={t(
            'The route is still useful as an example of guarded module pages.'
          )}
        >
          <p className="example-suite-empty">{t('The requested record no longer exists.')}</p>
        </ExampleSuitePanel>
      </ExampleSuiteShell>
    );
  }

  const baseItemForm = createExampleSuiteAdminEditItemFormDefinition();
  const editForm = composeBuildFormDefinition(
    {
      ...baseItemForm,
      id: `example-suite-admin-edit-${item.id}`
    },
    {
      request: {
        action: updateExampleSuiteItemAdminAction,
        method: 'post'
      },
      submit: {
        idleLabel: t('Save'),
        pendingLabel: t('Saving...'),
        successLabel: t('Saved'),
        align: 'start',
        secondaryActions: [
          {
            label: t('Back'),
            href: EXAMPLE_SUITE_ADMIN_ALIAS
          }
        ]
      },
      values: {
        itemId: item.id,
        title: item.title,
        description: item.description ?? '',
        status: item.status,
        priority: item.priority,
        isPublic: item.isPublic
      }
    }
  );

  const deleteForm = composeBuildFormDefinition(
    {
      id: `example-suite-admin-delete-${item.id}`,
      fields: [
        buildFormField.hidden({
          name: 'itemId',
          defaultValue: item.id
        })
      ]
    },
    {
      request: {
        action: deleteExampleSuiteItemAdminAction,
        method: 'post'
      },
      submit: {
        idleLabel: t('Delete'),
        pendingLabel: t('Deleting...'),
        align: 'start',
        secondaryActions: [
          {
            label: t('Cancel'),
            href: EXAMPLE_SUITE_ADMIN_ALIAS
          }
        ],
        confirm: {
          title: interpolateExampleSuiteAdminText(t('Delete item #{id}?'), {
            id: item.id
          }),
          description: t('This action permanently removes the record.'),
          confirmLabel: t('Delete'),
          cancelLabel: t('Keep item'),
          triggerVariant: 'outline',
          confirmVariant: 'destructive'
        }
      }
    }
  );

  return (
    <ExampleSuiteShell
      eyebrow={t('Edit flow')}
      title={interpolateExampleSuiteAdminText(t('Edit item #{id}'), {
        id: item.id
      })}
      description={t(
        'The edit route stays fully module-owned while using the SDK form path.'
      )}
      chips={[
        interpolateExampleSuiteAdminText(t('status: {status}'), {
          status: item.status
        }),
        interpolateExampleSuiteAdminText(t('priority: {priority}'), {
          priority: item.priority
        })
      ]}
      actions={
        <ExampleSuiteActionLink
          href={EXAMPLE_SUITE_ADMIN_ALIAS}
          label={t('Back to module')}
        />
      }
    >
      <div className="example-suite-grid example-suite-grid--two">
        <ExampleSuitePanel
          eyebrow={t('Edit')}
          title={t('Update record')}
          description={t('Persists changes in the module-owned table.')}
        >
          <TemplateBuildForm
            definition={editForm}
            area="admin"
            route={`${EXAMPLE_SUITE_ADMIN_ALIAS}/edit/${item.id}`}
            moduleId={EXAMPLE_SUITE_MODULE_ID}
            slot="mod.example.suite.admin.edit.form"
          />
        </ExampleSuitePanel>

        <ExampleSuitePanel
          eyebrow={t('Danger zone')}
          title={t('Delete record')}
          description={t('Uses the same form contract for confirm-backed deletion.')}
        >
          <TemplateBuildForm
            definition={deleteForm}
            area="admin"
            route={`${EXAMPLE_SUITE_ADMIN_ALIAS}/edit/${item.id}`}
            moduleId={EXAMPLE_SUITE_MODULE_ID}
            slot="mod.example.suite.admin.delete.form"
          />
        </ExampleSuitePanel>
      </div>
    </ExampleSuiteShell>
  );
}
