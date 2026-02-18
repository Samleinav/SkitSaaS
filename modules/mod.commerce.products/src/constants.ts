export const COMMERCE_PRODUCTS_MODULE_ID = 'mod.commerce.products';
export const COMMERCE_PRODUCTS_MODULE_VERSION = '0.1.0';
export const COMMERCE_PRODUCTS_ADMIN_ALIAS = '/admin/products';

export const COMMERCE_PRODUCTS_ROUTES = {
  health: '/health',
  products: '/products',
  productById: '/products/:productId',
  publish: '/products/:productId/publish',
  unpublish: '/products/:productId/unpublish'
} as const;

export const COMMERCE_PRODUCTS_DEFAULT_LIST_LIMIT = 200;
export const COMMERCE_PRODUCTS_MAX_LIST_LIMIT = 500;
