import { createModuleApiRouter, parseJsonBody } from '@skitsaas/sdk/server';
import {
  EXAMPLE_SUITE_MODULE_ID,
  isAdminRole,
  normalizeExampleSuitePriority,
  normalizeExampleSuiteStatus,
  parseCheckboxValue
} from './constants';
import {
  createExampleSuiteItem,
  getExampleSuiteItemById,
  getExampleSuiteSettings,
  listExampleSuiteItemsForAdmin,
  listExampleSuiteItemsForUser,
  listExampleSuitePublicItems,
  updateExampleSuiteItem
} from './data';

function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}

function parsePositiveInt(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function hasOwn(source: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

type ExampleSuiteSessionUser = {
  id: number;
  role?: string | null;
};

export const exampleSuiteApiHandler = createModuleApiRouter<ExampleSuiteSessionUser>({
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: async () => {
        const settings = await getExampleSuiteSettings();
        return Response.json({
          ok: true,
          moduleId: EXAMPLE_SUITE_MODULE_ID,
          settings
        });
      }
    },
    {
      method: 'GET',
      path: '/items',
      resolveUser: true,
      handler: async ({ request, user }) => {
        const searchParams = new URL(request.url).searchParams;
        const scope = searchParams.get('scope')?.trim().toLowerCase();

        if (scope === 'admin' && user && isAdminRole(user.role)) {
          const items = await listExampleSuiteItemsForAdmin(200);
          return Response.json({
            scope: 'admin',
            total: items.length,
            items
          });
        }

        if (user) {
          const items = await listExampleSuiteItemsForUser({
            userId: user.id,
            limit: 200
          });
          return Response.json({
            scope: 'user',
            total: items.length,
            items
          });
        }

        const items = await listExampleSuitePublicItems(200);
        return Response.json({
          scope: 'public',
          total: items.length,
          items
        });
      }
    },
    {
      method: 'POST',
      path: '/items',
      auth: 'user',
      handler: async ({ request, user }) => {
        if (!user) {
          return jsonError(401, 'Authentication required.');
        }

        const settings = await getExampleSuiteSettings();
        if (settings.apiWriteMode === 'admin' && !isAdminRole(user.role)) {
          return jsonError(403, 'Only admins can create records through the API.');
        }

        const body = await parseJsonBody(request);
        if (!body) {
          return jsonError(400, 'Invalid JSON body.');
        }

        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (!title) {
          return jsonError(400, 'Field "title" is required.');
        }

        const created = await createExampleSuiteItem({
          title,
          description: typeof body.description === 'string' ? body.description : '',
          status: normalizeExampleSuiteStatus(body.status, settings.defaultStatus),
          priority: normalizeExampleSuitePriority(body.priority),
          isPublic: hasOwn(body, 'isPublic')
            ? parseCheckboxValue(body.isPublic)
            : false,
          ownerUserId: user.id
        });

        if (!created) {
          return jsonError(400, 'Record could not be created.');
        }

        return Response.json(
          {
            ok: true,
            item: created
          },
          { status: 201 }
        );
      }
    },
    {
      method: 'PATCH',
      path: '/items/:itemId',
      auth: 'user',
      handler: async ({ request, params, user }) => {
        const itemId = parsePositiveInt(params.itemId);
        if (!itemId) {
          return jsonError(400, 'Invalid item id.');
        }

        if (!user) {
          return jsonError(401, 'Authentication required.');
        }

        const existing = await getExampleSuiteItemById(itemId);
        if (!existing) {
          return jsonError(404, 'Item not found.');
        }

        const userCanEdit = isAdminRole(user.role) || existing.ownerUserId === user.id;
        if (!userCanEdit) {
          return jsonError(403, 'You do not have permission to edit this item.');
        }

        const body = await parseJsonBody(request);
        if (!body) {
          return jsonError(400, 'Invalid JSON body.');
        }

        const updatePayload: Parameters<typeof updateExampleSuiteItem>[1] = {};
        if (typeof body.title === 'string') {
          updatePayload.title = body.title;
        }

        if (hasOwn(body, 'description')) {
          updatePayload.description =
            typeof body.description === 'string' ? body.description : null;
        }

        if (hasOwn(body, 'status')) {
          updatePayload.status = normalizeExampleSuiteStatus(
            body.status,
            normalizeExampleSuiteStatus(existing.status)
          );
        }

        if (hasOwn(body, 'priority')) {
          updatePayload.priority = normalizeExampleSuitePriority(
            body.priority,
            existing.priority
          );
        }

        if (hasOwn(body, 'isPublic')) {
          updatePayload.isPublic = parseCheckboxValue(body.isPublic);
        }

        const updated = await updateExampleSuiteItem(itemId, updatePayload);
        if (!updated) {
          return jsonError(404, 'Item not found after update.');
        }

        return Response.json({
          ok: true,
          item: updated
        });
      }
    }
  ]
});
