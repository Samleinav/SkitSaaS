import { createModuleApiRouter, parseJsonBody } from '@skitsaas/sdk/server';
import {
  EXAMPLE_PACKAGE_MODULE_ID,
  isAdminRole,
  normalizeExamplePackagePriority,
  normalizeExamplePackageStatus,
  parseCheckboxValue,
  toPositiveInt
} from './constants.js';
import {
  createExamplePackageItem,
  getExamplePackageItemById,
  getExamplePackageSettings,
  listExamplePackageItemsForAdmin,
  listExamplePackageItemsForUser,
  listExamplePackagePublicItems,
  updateExamplePackageItem
} from './data.js';

function jsonError(status, error) {
  return Response.json({ error }, { status });
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

export const examplePackageApiHandler = createModuleApiRouter({
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: async () => {
        const settings = await getExamplePackageSettings();
        return Response.json({
          ok: true,
          moduleId: EXAMPLE_PACKAGE_MODULE_ID,
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
          const items = await listExamplePackageItemsForAdmin(200);
          return Response.json({ scope: 'admin', total: items.length, items });
        }

        if (user) {
          const items = await listExamplePackageItemsForUser({
            userId: user.id,
            limit: 200
          });
          return Response.json({ scope: 'user', total: items.length, items });
        }

        const items = await listExamplePackagePublicItems(200);
        return Response.json({ scope: 'public', total: items.length, items });
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

        const settings = await getExamplePackageSettings();
        if (settings.apiWriteMode === 'admin' && !isAdminRole(user.role)) {
          return jsonError(403, 'Only admins can create records through this API route.');
        }

        const body = await parseJsonBody(request);
        if (!body) {
          return jsonError(400, 'Invalid JSON body.');
        }

        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (!title) {
          return jsonError(400, 'Field "title" is required.');
        }

        const created = await createExamplePackageItem({
          title,
          description: typeof body.description === 'string' ? body.description : '',
          status: normalizeExamplePackageStatus(body.status, settings.defaultStatus),
          priority: normalizeExamplePackagePriority(body.priority),
          isPublic: hasOwn(body, 'isPublic') ? parseCheckboxValue(body.isPublic) : false,
          ownerUserId: user.id
        });

        if (!created) {
          return jsonError(400, 'Record could not be created.');
        }

        return Response.json({ ok: true, item: created }, { status: 201 });
      }
    },
    {
      method: 'PATCH',
      path: '/items/:itemId',
      auth: 'user',
      handler: async ({ request, params, user }) => {
        const itemId = toPositiveInt(params.itemId);
        if (!itemId) {
          return jsonError(400, 'Invalid item id.');
        }

        if (!user) {
          return jsonError(401, 'Authentication required.');
        }

        const existing = await getExamplePackageItemById(itemId);
        if (!existing) {
          return jsonError(404, 'Item not found.');
        }

        if (!isAdminRole(user.role) && existing.ownerUserId !== user.id) {
          return jsonError(403, 'You do not have permission to edit this item.');
        }

        const body = await parseJsonBody(request);
        if (!body) {
          return jsonError(400, 'Invalid JSON body.');
        }

        const updatePayload = {};
        if (typeof body.title === 'string') {
          updatePayload.title = body.title;
        }
        if (hasOwn(body, 'description')) {
          updatePayload.description = typeof body.description === 'string' ? body.description : null;
        }
        if (hasOwn(body, 'status')) {
          updatePayload.status = normalizeExamplePackageStatus(body.status, existing.status);
        }
        if (hasOwn(body, 'priority')) {
          updatePayload.priority = normalizeExamplePackagePriority(body.priority, existing.priority);
        }
        if (hasOwn(body, 'isPublic')) {
          updatePayload.isPublic = parseCheckboxValue(body.isPublic);
        }

        const updated = await updateExamplePackageItem(itemId, updatePayload);
        if (!updated) {
          return jsonError(404, 'Item not found after update.');
        }

        return Response.json({ ok: true, item: updated });
      }
    }
  ]
});
