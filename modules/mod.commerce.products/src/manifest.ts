import { defineModule, type ModuleManifest } from '@skitsaas/sdk';
import { createModulePageRouter } from '@skitsaas/sdk/server';
import { commerceProductsApiHandler } from './api-handler';
import {
  COMMERCE_PRODUCTS_ADMIN_ALIAS,
  COMMERCE_PRODUCTS_MODULE_ID,
  COMMERCE_PRODUCTS_MODULE_VERSION
} from './constants';
import {
  parseCommerceProductsAdminProductId,
  renderCommerceProductsAdminCreatePage,
  renderCommerceProductsAdminEditPage,
  renderCommerceProductsAdminHomePage
} from './pages';

const commerceProductsAdminPage = createModulePageRouter({
  routes: [
    {
      path: '/',
      auth: 'admin',
      handler: ({ context }) => renderCommerceProductsAdminHomePage(context)
    },
    {
      path: '/create',
      auth: 'admin',
      handler: ({ context }) => renderCommerceProductsAdminCreatePage(context)
    },
    {
      path: '/:productId/edit',
      auth: 'admin',
      handler: ({ context, params }) => {
        const productId = parseCommerceProductsAdminProductId(params.productId);
        if (!productId.ok) {
          return null;
        }

        return renderCommerceProductsAdminEditPage({
          context,
          productId: productId.value
        });
      }
    }
  ]
});

export default defineModule({
  moduleId: COMMERCE_PRODUCTS_MODULE_ID,
  version: COMMERCE_PRODUCTS_MODULE_VERSION,
  displayName: 'Commerce Products',
  description:
    'Backend module scaffold for product catalog and product lifecycle.',
  adminRouteAliases: [COMMERCE_PRODUCTS_ADMIN_ALIAS],
  adminNavItems: [
    {
      id: 'mod.commerce.products.admin.nav',
      href: COMMERCE_PRODUCTS_ADMIN_ALIAS,
      label: 'Products',
      order: 55
    }
  ],
  adminPage: commerceProductsAdminPage,
  apiHandler: commerceProductsApiHandler
} satisfies ModuleManifest);
