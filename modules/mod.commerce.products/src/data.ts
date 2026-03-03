import { and, desc, eq, inArray, isNull, ne } from '@skitsaas/sdk/db';
import { getAdminDb } from '@skitsaas/sdk/server';
import {
  modCommerceProductPrices,
  modCommerceProductPublication,
  modCommerceProducts,
  subscriptionTemplates
} from '../db/schema';
import type {
  CommerceProduct,
  CommerceProductMutationErrorCode,
  CommerceProductMutationResult,
  CommerceProductPrice,
  CommerceProductPriceInput,
  CommerceProductPublicationPayload,
  CreateCommerceProductInput,
  UpdateCommerceProductInput
} from './types';

type ProductRow = {
  id: number;
  productKey: string;
  name: string;
  description: string | null;
  kind: string;
  subscriptionTemplateId: number | null;
  metadata: string | null;
  createdByUserId: number | null;
  updatedByUserId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type PublicationRow = {
  publicationId: number | null;
  publicationIsPublished: boolean | null;
  publicationPublishedAt: Date | null;
  publicationUnpublishedAt: Date | null;
  publicationPublishedByUserId: number | null;
  publicationMetadata: string | null;
  publicationCreatedAt: Date | null;
  publicationUpdatedAt: Date | null;
};

type ProductWithPublicationRow = ProductRow & PublicationRow;

type PriceRow = {
  id: number;
  productId: number;
  currency: string;
  unitAmountCents: number;
  isActive: boolean;
  provider: string | null;
  providerPriceId: string | null;
  metadata: string | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MutationContext = {
  actorUserId?: number | null;
};

function getCommerceProductsDb() {
  return getAdminDb<any>();
}

function normalizePositiveInt(value: number | null | undefined) {
  if (!value || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function serializeMetadata(
  metadata: Record<string, unknown> | null | undefined
) {
  if (metadata === undefined) {
    return undefined;
  }

  if (metadata === null) {
    return null;
  }

  try {
    return JSON.stringify(metadata).slice(0, 12000);
  } catch {
    return null;
  }
}

function parseMetadata(metadata: string | null) {
  if (!metadata) {
    return null;
  }

  try {
    const parsed = JSON.parse(metadata);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toMutationError(
  code: CommerceProductMutationErrorCode,
  message: string
): CommerceProductMutationResult {
  return {
    ok: false,
    code,
    message
  };
}

function mapPrice(row: PriceRow): CommerceProductPrice {
  return {
    id: row.id,
    productId: row.productId,
    currency: row.currency,
    unitAmountCents: row.unitAmountCents,
    isActive: row.isActive,
    provider: row.provider,
    providerPriceId: row.providerPriceId,
    metadata: parseMetadata(row.metadata),
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function mapProduct(
  row: ProductWithPublicationRow,
  currentPrice: CommerceProductPrice | null
): CommerceProduct {
  const kind = row.kind === 'subscription' ? 'subscription' : 'one_time';

  return {
    id: row.id,
    productKey: row.productKey,
    name: row.name,
    description: row.description,
    kind,
    subscriptionTemplateId: row.subscriptionTemplateId,
    metadata: parseMetadata(row.metadata),
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    currentPrice,
    publication:
      row.publicationId && row.publicationCreatedAt && row.publicationUpdatedAt
        ? {
            id: row.publicationId,
            productId: row.id,
            isPublished: Boolean(row.publicationIsPublished),
            publishedAt: row.publicationPublishedAt,
            unpublishedAt: row.publicationUnpublishedAt,
            publishedByUserId: row.publicationPublishedByUserId,
            metadata: parseMetadata(row.publicationMetadata),
            createdAt: row.publicationCreatedAt,
            updatedAt: row.publicationUpdatedAt
          }
        : null
  };
}

async function getCurrentPricesByProductIds(productIds: number[]) {
  if (productIds.length === 0) {
    return new Map<number, CommerceProductPrice>();
  }

  const db = getCommerceProductsDb();
  const rows = (await db
    .select({
      id: modCommerceProductPrices.id,
      productId: modCommerceProductPrices.productId,
      currency: modCommerceProductPrices.currency,
      unitAmountCents: modCommerceProductPrices.unitAmountCents,
      isActive: modCommerceProductPrices.isActive,
      provider: modCommerceProductPrices.provider,
      providerPriceId: modCommerceProductPrices.providerPriceId,
      metadata: modCommerceProductPrices.metadata,
      effectiveFrom: modCommerceProductPrices.effectiveFrom,
      effectiveTo: modCommerceProductPrices.effectiveTo,
      createdAt: modCommerceProductPrices.createdAt,
      updatedAt: modCommerceProductPrices.updatedAt
    })
    .from(modCommerceProductPrices)
    .where(
      and(
        inArray(modCommerceProductPrices.productId, productIds),
        eq(modCommerceProductPrices.isActive, true),
        isNull(modCommerceProductPrices.effectiveTo)
      )
    )
    .orderBy(
      desc(modCommerceProductPrices.effectiveFrom),
      desc(modCommerceProductPrices.updatedAt),
      desc(modCommerceProductPrices.id)
    )) as PriceRow[];

  const byProductId = new Map<number, CommerceProductPrice>();
  for (const row of rows) {
    if (byProductId.has(row.productId)) {
      continue;
    }
    byProductId.set(row.productId, mapPrice(row));
  }

  return byProductId;
}

async function getProductRowById(productId: number) {
  const db = getCommerceProductsDb();
  const [row] = (await db
    .select({
      id: modCommerceProducts.id,
      productKey: modCommerceProducts.productKey,
      name: modCommerceProducts.name,
      description: modCommerceProducts.description,
      kind: modCommerceProducts.kind,
      subscriptionTemplateId: modCommerceProducts.subscriptionTemplateId,
      metadata: modCommerceProducts.metadata,
      createdByUserId: modCommerceProducts.createdByUserId,
      updatedByUserId: modCommerceProducts.updatedByUserId,
      createdAt: modCommerceProducts.createdAt,
      updatedAt: modCommerceProducts.updatedAt,
      publicationId: modCommerceProductPublication.id,
      publicationIsPublished: modCommerceProductPublication.isPublished,
      publicationPublishedAt: modCommerceProductPublication.publishedAt,
      publicationUnpublishedAt: modCommerceProductPublication.unpublishedAt,
      publicationPublishedByUserId: modCommerceProductPublication.publishedByUserId,
      publicationMetadata: modCommerceProductPublication.metadata,
      publicationCreatedAt: modCommerceProductPublication.createdAt,
      publicationUpdatedAt: modCommerceProductPublication.updatedAt
    })
    .from(modCommerceProducts)
    .leftJoin(
      modCommerceProductPublication,
      eq(modCommerceProducts.id, modCommerceProductPublication.productId)
    )
    .where(eq(modCommerceProducts.id, productId))
    .limit(1)) as ProductWithPublicationRow[] | [];

  return row || null;
}

async function productKeyExists({
  productKey,
  excludeProductId
}: {
  productKey: string;
  excludeProductId?: number | null;
}) {
  const db = getCommerceProductsDb();
  const [row] = await db
    .select({
      id: modCommerceProducts.id
    })
    .from(modCommerceProducts)
    .where(
      excludeProductId
        ? and(
            eq(modCommerceProducts.productKey, productKey),
            ne(modCommerceProducts.id, excludeProductId)
          )
        : eq(modCommerceProducts.productKey, productKey)
    )
    .limit(1);

  return Boolean(row);
}

async function subscriptionTemplateExists(templateId: number) {
  const db = getCommerceProductsDb();
  const [row] = await db
    .select({
      id: subscriptionTemplates.id
    })
    .from(subscriptionTemplates)
    .where(eq(subscriptionTemplates.id, templateId))
    .limit(1);

  return Boolean(row);
}

async function ensurePublicationRow({
  tx,
  productId
}: {
  tx: any;
  productId: number;
}) {
  const [publicationRow] = await tx
    .select({
      id: modCommerceProductPublication.id
    })
    .from(modCommerceProductPublication)
    .where(eq(modCommerceProductPublication.productId, productId))
    .limit(1);

  if (publicationRow) {
    return;
  }

  await tx.insert(modCommerceProductPublication).values({
    productId,
    isPublished: false,
    metadata: null,
    updatedAt: new Date()
  });
}

async function deactivateCurrentPrices({
  tx,
  productId
}: {
  tx: any;
  productId: number;
}) {
  const now = new Date();
  await tx
    .update(modCommerceProductPrices)
    .set({
      isActive: false,
      effectiveTo: now,
      updatedAt: now
    })
    .where(
      and(
        eq(modCommerceProductPrices.productId, productId),
        eq(modCommerceProductPrices.isActive, true),
        isNull(modCommerceProductPrices.effectiveTo)
      )
    );
}

async function insertActivePrice({
  tx,
  productId,
  price
}: {
  tx: any;
  productId: number;
  price: CommerceProductPriceInput;
}) {
  await tx.insert(modCommerceProductPrices).values({
    productId,
    currency: price.currency,
    unitAmountCents: price.unitAmountCents,
    isActive: true,
    provider: price.provider,
    providerPriceId: price.providerPriceId,
    metadata: serializeMetadata(price.metadata) ?? null,
    effectiveFrom: new Date(),
    effectiveTo: null,
    updatedAt: new Date()
  });
}

function resolveActorUserId(context: MutationContext) {
  return normalizePositiveInt(context.actorUserId) ?? null;
}

export async function listCommerceProducts(options?: { limit?: number }) {
  const rawLimit = options?.limit;
  const limit =
    typeof rawLimit === 'number' && Number.isInteger(rawLimit) && rawLimit > 0
      ? Math.max(1, Math.min(rawLimit, 500))
      : 200;

  const db = getCommerceProductsDb();
  const productRows = (await db
    .select({
      id: modCommerceProducts.id,
      productKey: modCommerceProducts.productKey,
      name: modCommerceProducts.name,
      description: modCommerceProducts.description,
      kind: modCommerceProducts.kind,
      subscriptionTemplateId: modCommerceProducts.subscriptionTemplateId,
      metadata: modCommerceProducts.metadata,
      createdByUserId: modCommerceProducts.createdByUserId,
      updatedByUserId: modCommerceProducts.updatedByUserId,
      createdAt: modCommerceProducts.createdAt,
      updatedAt: modCommerceProducts.updatedAt,
      publicationId: modCommerceProductPublication.id,
      publicationIsPublished: modCommerceProductPublication.isPublished,
      publicationPublishedAt: modCommerceProductPublication.publishedAt,
      publicationUnpublishedAt: modCommerceProductPublication.unpublishedAt,
      publicationPublishedByUserId: modCommerceProductPublication.publishedByUserId,
      publicationMetadata: modCommerceProductPublication.metadata,
      publicationCreatedAt: modCommerceProductPublication.createdAt,
      publicationUpdatedAt: modCommerceProductPublication.updatedAt
    })
    .from(modCommerceProducts)
    .leftJoin(
      modCommerceProductPublication,
      eq(modCommerceProducts.id, modCommerceProductPublication.productId)
    )
    .orderBy(desc(modCommerceProducts.updatedAt), desc(modCommerceProducts.id))
    .limit(limit)) as ProductWithPublicationRow[];

  const currentPrices = await getCurrentPricesByProductIds(
    productRows.map((row) => row.id)
  );

  return productRows.map((row) => mapProduct(row, currentPrices.get(row.id) ?? null));
}

export async function getCommerceProductById(productId: number) {
  const normalizedProductId = normalizePositiveInt(productId);
  if (!normalizedProductId) {
    return null;
  }

  const row = await getProductRowById(normalizedProductId);
  if (!row) {
    return null;
  }

  const currentPrices = await getCurrentPricesByProductIds([normalizedProductId]);
  return mapProduct(row, currentPrices.get(normalizedProductId) ?? null);
}

export async function createCommerceProduct(
  input: CreateCommerceProductInput,
  context: MutationContext = {}
): Promise<CommerceProductMutationResult> {
  if (await productKeyExists({ productKey: input.productKey })) {
    return toMutationError(
      'duplicate_product_key',
      `Product key "${input.productKey}" is already in use.`
    );
  }

  if (input.kind === 'subscription') {
    if (!input.subscriptionTemplateId) {
      return toMutationError(
        'subscription_template_required',
        'subscriptionTemplateId is required for subscription products.'
      );
    }

    const exists = await subscriptionTemplateExists(input.subscriptionTemplateId);
    if (!exists) {
      return toMutationError(
        'subscription_template_not_found',
        'subscriptionTemplateId does not exist.'
      );
    }
  } else if (!input.initialPrice) {
    return toMutationError(
      'one_time_price_required',
      'one_time products require an initial active price.'
    );
  }

  const db = getCommerceProductsDb();
  const actorUserId = resolveActorUserId(context);
  let createdProductId: number | null = null;

  try {
    await db.transaction(async (tx: any) => {
      const [createdProduct] = await tx
        .insert(modCommerceProducts)
        .values({
          productKey: input.productKey,
          name: input.name,
          description: input.description,
          kind: input.kind,
          subscriptionTemplateId:
            input.kind === 'subscription' ? input.subscriptionTemplateId : null,
          metadata: serializeMetadata(input.metadata) ?? null,
          createdByUserId: actorUserId,
          updatedByUserId: actorUserId,
          updatedAt: new Date()
        })
        .returning({
          id: modCommerceProducts.id
        });

      if (!createdProduct) {
        throw new Error('product_create_failed');
      }

      createdProductId = createdProduct.id;

      await tx.insert(modCommerceProductPublication).values({
        productId: createdProduct.id,
        isPublished: false,
        metadata: null,
        publishedByUserId: null,
        publishedAt: null,
        unpublishedAt: null,
        updatedAt: new Date()
      });

      if (input.kind === 'one_time' && input.initialPrice) {
        await insertActivePrice({
          tx,
          productId: createdProduct.id,
          price: input.initialPrice
        });
      }
    });
  } catch (error) {
    console.error('[mod.commerce.products] create failed', error);
    return toMutationError('operation_failed', 'Unable to create product.');
  }

  if (!createdProductId) {
    return toMutationError('operation_failed', 'Unable to create product.');
  }

  const created = await getCommerceProductById(createdProductId);
  if (!created) {
    return toMutationError('operation_failed', 'Created product was not found.');
  }

  return {
    ok: true,
    product: created
  };
}

export async function updateCommerceProduct(
  productId: number,
  input: UpdateCommerceProductInput,
  context: MutationContext = {}
): Promise<CommerceProductMutationResult> {
  const existing = await getCommerceProductById(productId);
  if (!existing) {
    return toMutationError('not_found', 'Product not found.');
  }

  const nextKind = input.kind ?? existing.kind;
  const nextSubscriptionTemplateId =
    nextKind === 'one_time'
      ? null
      : input.subscriptionTemplateId !== undefined
        ? input.subscriptionTemplateId
        : existing.subscriptionTemplateId;

  if (nextKind === 'subscription') {
    if (!nextSubscriptionTemplateId) {
      return toMutationError(
        'subscription_template_required',
        'subscriptionTemplateId is required for subscription products.'
      );
    }

    const exists = await subscriptionTemplateExists(nextSubscriptionTemplateId);
    if (!exists) {
      return toMutationError(
        'subscription_template_not_found',
        'subscriptionTemplateId does not exist.'
      );
    }

    if (input.nextPrice) {
      return toMutationError(
        'price_not_allowed_for_subscription',
        'Price updates are not allowed for subscription products.'
      );
    }
  }

  if (
    nextKind === 'one_time' &&
    existing.kind !== 'one_time' &&
    !input.nextPrice
  ) {
    return toMutationError(
      'one_time_price_required',
      'Switching a product to one_time requires a new active price.'
    );
  }

  if (input.productKey && input.productKey !== existing.productKey) {
    if (
      await productKeyExists({
        productKey: input.productKey,
        excludeProductId: existing.id
      })
    ) {
      return toMutationError(
        'duplicate_product_key',
        `Product key "${input.productKey}" is already in use.`
      );
    }
  }

  const db = getCommerceProductsDb();
  const actorUserId = resolveActorUserId(context);

  try {
    await db.transaction(async (tx: any) => {
      const setValues: Partial<typeof modCommerceProducts.$inferInsert> & {
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
        updatedByUserId: actorUserId
      };

      if (input.productKey !== undefined) {
        setValues.productKey = input.productKey;
      }

      if (input.name !== undefined) {
        setValues.name = input.name;
      }

      if (input.description !== undefined) {
        setValues.description = input.description;
      }

      if (input.kind !== undefined) {
        setValues.kind = nextKind;
      }

      if (input.kind !== undefined || input.subscriptionTemplateId !== undefined) {
        setValues.subscriptionTemplateId = nextSubscriptionTemplateId;
      }

      if (input.metadata !== undefined) {
        setValues.metadata = serializeMetadata(input.metadata) ?? null;
      }

      await tx
        .update(modCommerceProducts)
        .set(setValues)
        .where(eq(modCommerceProducts.id, existing.id));

      if (input.nextPrice) {
        if (nextKind !== 'one_time') {
          throw new Error('invalid_kind_for_price_update');
        }

        await deactivateCurrentPrices({
          tx,
          productId: existing.id
        });
        await insertActivePrice({
          tx,
          productId: existing.id,
          price: input.nextPrice
        });
      }

      await ensurePublicationRow({
        tx,
        productId: existing.id
      });
    });
  } catch (error) {
    console.error('[mod.commerce.products] update failed', error);
    return toMutationError('operation_failed', 'Unable to update product.');
  }

  const updated = await getCommerceProductById(existing.id);
  if (!updated) {
    return toMutationError('operation_failed', 'Updated product was not found.');
  }

  return {
    ok: true,
    product: updated
  };
}

export async function publishCommerceProduct(
  productId: number,
  payload: CommerceProductPublicationPayload,
  context: MutationContext = {}
): Promise<CommerceProductMutationResult> {
  const existing = await getCommerceProductById(productId);
  if (!existing) {
    return toMutationError('not_found', 'Product not found.');
  }

  if (existing.kind === 'one_time' && !existing.currentPrice) {
    return toMutationError(
      'one_time_product_missing_active_price',
      'Cannot publish one_time product without an active price.'
    );
  }

  const db = getCommerceProductsDb();
  const actorUserId = resolveActorUserId(context);
  const now = new Date();
  const metadataText = serializeMetadata(payload.metadata);

  try {
    await db.transaction(async (tx: any) => {
      await ensurePublicationRow({
        tx,
        productId: existing.id
      });

      const [currentPublication] = await tx
        .select({
          metadata: modCommerceProductPublication.metadata
        })
        .from(modCommerceProductPublication)
        .where(eq(modCommerceProductPublication.productId, existing.id))
        .limit(1);

      await tx
        .update(modCommerceProductPublication)
        .set({
          isPublished: true,
          publishedAt: now,
          unpublishedAt: null,
          publishedByUserId: actorUserId,
          metadata:
            metadataText === undefined
              ? currentPublication?.metadata ?? null
              : metadataText,
          updatedAt: now
        })
        .where(eq(modCommerceProductPublication.productId, existing.id));
    });
  } catch (error) {
    console.error('[mod.commerce.products] publish failed', error);
    return toMutationError('operation_failed', 'Unable to publish product.');
  }

  const published = await getCommerceProductById(existing.id);
  if (!published) {
    return toMutationError('operation_failed', 'Published product was not found.');
  }

  return {
    ok: true,
    product: published
  };
}

export async function unpublishCommerceProduct(
  productId: number,
  payload: CommerceProductPublicationPayload,
  context: MutationContext = {}
): Promise<CommerceProductMutationResult> {
  const existing = await getCommerceProductById(productId);
  if (!existing) {
    return toMutationError('not_found', 'Product not found.');
  }

  const db = getCommerceProductsDb();
  const actorUserId = resolveActorUserId(context);
  const now = new Date();
  const metadataText = serializeMetadata(payload.metadata);

  try {
    await db.transaction(async (tx: any) => {
      await ensurePublicationRow({
        tx,
        productId: existing.id
      });

      const [currentPublication] = await tx
        .select({
          metadata: modCommerceProductPublication.metadata
        })
        .from(modCommerceProductPublication)
        .where(eq(modCommerceProductPublication.productId, existing.id))
        .limit(1);

      await tx
        .update(modCommerceProductPublication)
        .set({
          isPublished: false,
          publishedByUserId: actorUserId,
          unpublishedAt: now,
          metadata:
            metadataText === undefined
              ? currentPublication?.metadata ?? null
              : metadataText,
          updatedAt: now
        })
        .where(eq(modCommerceProductPublication.productId, existing.id));
    });
  } catch (error) {
    console.error('[mod.commerce.products] unpublish failed', error);
    return toMutationError('operation_failed', 'Unable to unpublish product.');
  }

  const unpublished = await getCommerceProductById(existing.id);
  if (!unpublished) {
    return toMutationError(
      'operation_failed',
      'Unpublished product was not found.'
    );
  }

  return {
    ok: true,
    product: unpublished
  };
}
