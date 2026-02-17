import { createModuleApiRouter, parseJsonBody } from '@skitsaas/sdk/server';
import {
  COMMERCE_PRODUCTS_DEFAULT_LIST_LIMIT,
  COMMERCE_PRODUCTS_MAX_LIST_LIMIT,
  COMMERCE_PRODUCTS_MODULE_ID,
  COMMERCE_PRODUCTS_ROUTES
} from './constants';
import * as commerceProductsData from './data';
import {
  parseCommerceProductPublicationPayload,
  parseCreateCommerceProductInput,
  parseProductId,
  parseUpdateCommerceProductInput
} from './validators';

type CommerceSessionUser = {
  id: number;
  role?: string | null;
};

type CommerceProductsDataDependencies = Pick<
  typeof commerceProductsData,
  | 'createCommerceProduct'
  | 'getCommerceProductById'
  | 'listCommerceProducts'
  | 'publishCommerceProduct'
  | 'unpublishCommerceProduct'
  | 'updateCommerceProduct'
>;

const DEFAULT_DATA_DEPS: CommerceProductsDataDependencies = {
  createCommerceProduct: commerceProductsData.createCommerceProduct,
  getCommerceProductById: commerceProductsData.getCommerceProductById,
  listCommerceProducts: commerceProductsData.listCommerceProducts,
  publishCommerceProduct: commerceProductsData.publishCommerceProduct,
  unpublishCommerceProduct: commerceProductsData.unpublishCommerceProduct,
  updateCommerceProduct: commerceProductsData.updateCommerceProduct
};

function jsonError(status: number, error: string, code?: string) {
  return Response.json(
    {
      ok: false,
      moduleId: COMMERCE_PRODUCTS_MODULE_ID,
      error,
      code: code || null
    },
    { status }
  );
}

function parsePositiveInt(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function resolveListLimit(request: Request) {
  const params = new URL(request.url).searchParams;
  const requested = parsePositiveInt(params.get('limit'));
  if (!requested) {
    return COMMERCE_PRODUCTS_DEFAULT_LIST_LIMIT;
  }

  return Math.max(1, Math.min(requested, COMMERCE_PRODUCTS_MAX_LIST_LIMIT));
}

function mapMutationErrorStatus(code: string) {
  if (code === 'duplicate_product_key') {
    return 409;
  }

  if (code === 'not_found') {
    return 404;
  }

  if (code === 'one_time_product_missing_active_price') {
    return 409;
  }

  if (
    code === 'subscription_template_required' ||
    code === 'subscription_template_not_found' ||
    code === 'subscription_template_not_allowed_for_one_time' ||
    code === 'one_time_price_required' ||
    code === 'price_not_allowed_for_subscription'
  ) {
    return 400;
  }

  return 500;
}

export function createCommerceProductsApiHandler(
  dataDeps: CommerceProductsDataDependencies = DEFAULT_DATA_DEPS
) {
  return createModuleApiRouter<CommerceSessionUser>({
    routes: [
      {
        method: 'GET',
        path: COMMERCE_PRODUCTS_ROUTES.health,
        handler: () => {
          return Response.json({
            ok: true,
            moduleId: COMMERCE_PRODUCTS_MODULE_ID,
            service: 'products',
            status: 'ready_for_backend_implementation'
          });
        }
      },
      {
        method: 'GET',
        path: COMMERCE_PRODUCTS_ROUTES.products,
        auth: 'admin',
        handler: async ({ request }) => {
          const products = await dataDeps.listCommerceProducts({
            limit: resolveListLimit(request)
          });

          return Response.json({
            ok: true,
            moduleId: COMMERCE_PRODUCTS_MODULE_ID,
            total: products.length,
            products
          });
        }
      },
      {
        method: 'GET',
        path: COMMERCE_PRODUCTS_ROUTES.productById,
        auth: 'admin',
        handler: async ({ params }) => {
          const productId = parseProductId(params.productId);
          if (!productId.ok) {
            return jsonError(400, productId.message, productId.code);
          }

          const product = await dataDeps.getCommerceProductById(productId.value);
          if (!product) {
            return jsonError(404, 'Product not found.', 'not_found');
          }

          return Response.json({
            ok: true,
            moduleId: COMMERCE_PRODUCTS_MODULE_ID,
            product
          });
        }
      },
      {
        method: 'POST',
        path: COMMERCE_PRODUCTS_ROUTES.products,
        auth: 'admin',
        handler: async ({ request, user }) => {
          const body = await parseJsonBody(request);
          if (!body) {
            return jsonError(400, 'Invalid JSON body.', 'invalid_json_body');
          }

          const parsedInput = parseCreateCommerceProductInput(body);
          if (!parsedInput.ok) {
            return jsonError(400, parsedInput.message, parsedInput.code);
          }

          const result = await dataDeps.createCommerceProduct(parsedInput.value, {
            actorUserId: user?.id ?? null
          });
          if (!result.ok) {
            return jsonError(
              mapMutationErrorStatus(result.code),
              result.message,
              result.code
            );
          }

          return Response.json(
            {
              ok: true,
              moduleId: COMMERCE_PRODUCTS_MODULE_ID,
              product: result.product
            },
            { status: 201 }
          );
        }
      },
      {
        method: 'PATCH',
        path: COMMERCE_PRODUCTS_ROUTES.productById,
        auth: 'admin',
        handler: async ({ request, params, user }) => {
          const productId = parseProductId(params.productId);
          if (!productId.ok) {
            return jsonError(400, productId.message, productId.code);
          }

          const body = await parseJsonBody(request);
          if (!body) {
            return jsonError(400, 'Invalid JSON body.', 'invalid_json_body');
          }

          const parsedInput = parseUpdateCommerceProductInput(body);
          if (!parsedInput.ok) {
            return jsonError(400, parsedInput.message, parsedInput.code);
          }

          const result = await dataDeps.updateCommerceProduct(
            productId.value,
            parsedInput.value,
            {
              actorUserId: user?.id ?? null
            }
          );
          if (!result.ok) {
            return jsonError(
              mapMutationErrorStatus(result.code),
              result.message,
              result.code
            );
          }

          return Response.json({
            ok: true,
            moduleId: COMMERCE_PRODUCTS_MODULE_ID,
            product: result.product
          });
        }
      },
      {
        method: 'POST',
        path: COMMERCE_PRODUCTS_ROUTES.publish,
        auth: 'admin',
        handler: async ({ request, params, user }) => {
          const productId = parseProductId(params.productId);
          if (!productId.ok) {
            return jsonError(400, productId.message, productId.code);
          }

          const body = (await parseJsonBody(request)) || {};
          const payload = parseCommerceProductPublicationPayload(body);
          if (!payload.ok) {
            return jsonError(400, payload.message, payload.code);
          }

          const result = await dataDeps.publishCommerceProduct(
            productId.value,
            payload.value,
            {
              actorUserId: user?.id ?? null
            }
          );
          if (!result.ok) {
            return jsonError(
              mapMutationErrorStatus(result.code),
              result.message,
              result.code
            );
          }

          return Response.json({
            ok: true,
            moduleId: COMMERCE_PRODUCTS_MODULE_ID,
            product: result.product
          });
        }
      },
      {
        method: 'POST',
        path: COMMERCE_PRODUCTS_ROUTES.unpublish,
        auth: 'admin',
        handler: async ({ request, params, user }) => {
          const productId = parseProductId(params.productId);
          if (!productId.ok) {
            return jsonError(400, productId.message, productId.code);
          }

          const body = (await parseJsonBody(request)) || {};
          const payload = parseCommerceProductPublicationPayload(body);
          if (!payload.ok) {
            return jsonError(400, payload.message, payload.code);
          }

          const result = await dataDeps.unpublishCommerceProduct(
            productId.value,
            payload.value,
            {
              actorUserId: user?.id ?? null
            }
          );
          if (!result.ok) {
            return jsonError(
              mapMutationErrorStatus(result.code),
              result.message,
              result.code
            );
          }

          return Response.json({
            ok: true,
            moduleId: COMMERCE_PRODUCTS_MODULE_ID,
            product: result.product
          });
        }
      }
    ]
  });
}

export const commerceProductsApiHandler = createCommerceProductsApiHandler();
