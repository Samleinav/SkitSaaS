import { defineModule, type ModuleManifest } from '@skitsaas/sdk';
import { createModuleApiRouter } from '@skitsaas/sdk/server';

const exampleApiHandler = createModuleApiRouter({
  routes: [
    {
      method: 'GET',
      path: '/test',
      handler: () => {
        return Response.json({
          ok: true,
          moduleId: 'mod.example.api',
          message: 'Example API module is enabled.'
        });
      }
    }
  ]
});

export default defineModule({
  moduleId: 'mod.example.api',
  version: '0.1.0',
  displayName: 'Example API',
  apiHandler: exampleApiHandler
} satisfies ModuleManifest);
