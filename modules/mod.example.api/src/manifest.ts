import { defineModule, type ModuleManifest } from '@skitsaas/sdk';
import { ExampleApiRoutes } from './routes';

export default defineModule({
  moduleId: 'mod.example.api',
  version: '0.1.0',
  displayName: 'Example API',

  apiRoutes: [
    // Public health check — no auth, no rate limit
    ExampleApiRoutes.test.handler(() =>
      Response.json({
        ok: true,
        moduleId: 'mod.example.api',
        message: 'Example API module is enabled.'
      })
    ),

    // Authenticated status endpoint
    ExampleApiRoutes.status.handler((_request, _params) =>
      Response.json({ ok: true, authenticated: true })
    ),

    // Admin-only create with rate limiting
    ExampleApiRoutes.createItem.handler(async (_request, _params) => {
      // body parsing, validation, DB writes go here
      return Response.json({ ok: true, created: true }, { status: 201 });
    }),

    // Parameterized GET — {id} extracted from path
    ExampleApiRoutes.getItem.handler((_request, params) =>
      Response.json({ ok: true, itemId: params.id })
    ),

    // Parameterized DELETE
    ExampleApiRoutes.deleteItem.handler((_request, params) =>
      Response.json({ ok: true, deleted: true, itemId: params.id })
    ),
  ]
} satisfies ModuleManifest);
