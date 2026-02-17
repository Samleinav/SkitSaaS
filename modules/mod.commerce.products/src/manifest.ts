import { defineModule, type ModuleManifest } from '@skitsaas/sdk';
import { commerceProductsApiHandler } from './api-handler';
import {
  COMMERCE_PRODUCTS_MODULE_ID,
  COMMERCE_PRODUCTS_MODULE_VERSION
} from './constants';

export default defineModule({
  moduleId: COMMERCE_PRODUCTS_MODULE_ID,
  version: COMMERCE_PRODUCTS_MODULE_VERSION,
  displayName: 'Commerce Products',
  description:
    'Backend module scaffold for product catalog and product lifecycle.',
  apiHandler: commerceProductsApiHandler
} satisfies ModuleManifest);
