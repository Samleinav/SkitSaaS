import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkFeature,
  configureSubscriptionFeatures,
  consumeQuota,
  getPlanFeatureNumber,
  getPlanFeatureValue,
  getQuotaStatus
} from '../../app/sdk/src/server';

const TEAM_CTX = {
  teamId: 77,
  userId: null
} as const;

test('SDK plan feature reads stay separate from usage-tracked quota helpers', async () => {
  let used = 2;

  configureSubscriptionFeatures({
    async getPlanFeatureValue(featureKey) {
      switch (featureKey) {
        case 'mod.analytics.reports.daily.max':
          return {
            found: true,
            valueType: 'number',
            rawValue: '25'
          };
        case 'mod.analytics.research.enabled':
          return {
            found: true,
            valueType: 'boolean',
            rawValue: 'enabled'
          };
        case 'mod.analytics.model.tier':
          return {
            found: true,
            valueType: 'text',
            rawValue: 'deep'
          };
        case 'mod.analytics.experimental':
          return {
            found: true,
            valueType: 'null',
            rawValue: null
          };
        default:
          return {
            found: false,
            valueType: null,
            rawValue: null
          };
      }
    },

    async getFeatureLimit(featureKey) {
      if (featureKey === 'mod.analytics.reports.daily.max') {
        return { enabled: true, limit: 25 };
      }

      if (featureKey === 'mod.analytics.research.enabled') {
        return { enabled: true, limit: null };
      }

      return { enabled: false, limit: null };
    },

    async getUsage() {
      return {
        used,
        resetAt: new Date('2026-04-01T00:00:00.000Z')
      };
    },

    async incrementUsage(_featureKey, _ctx, amount) {
      used += amount;
      return { used };
    }
  });

  assert.equal(
    await getPlanFeatureNumber('mod.analytics.reports.daily.max', TEAM_CTX),
    25
  );
  assert.equal(
    await getPlanFeatureNumber('mod.analytics.missing.max', TEAM_CTX, 5),
    5
  );

  const boolFeature = await getPlanFeatureValue(
    'mod.analytics.research.enabled',
    TEAM_CTX
  );
  assert.deepEqual(boolFeature, {
    found: true,
    valueType: 'boolean',
    rawValue: 'enabled',
    booleanValue: true,
    numberValue: null,
    textValue: null
  });

  const textFeature = await getPlanFeatureValue(
    'mod.analytics.model.tier',
    TEAM_CTX
  );
  assert.deepEqual(textFeature, {
    found: true,
    valueType: 'text',
    rawValue: 'deep',
    booleanValue: null,
    numberValue: null,
    textValue: 'deep'
  });

  const nullFeature = await getPlanFeatureValue(
    'mod.analytics.experimental',
    TEAM_CTX
  );
  assert.deepEqual(nullFeature, {
    found: true,
    valueType: 'null',
    rawValue: null,
    booleanValue: null,
    numberValue: null,
    textValue: null
  });

  const missingFeature = await getPlanFeatureValue(
    'mod.analytics.missing.max',
    TEAM_CTX
  );
  assert.deepEqual(missingFeature, {
    found: false,
    valueType: null,
    rawValue: null,
    booleanValue: null,
    numberValue: null,
    textValue: null
  });

  const feature = await checkFeature('mod.analytics.reports.daily.max', TEAM_CTX);
  assert.deepEqual(feature, {
    enabled: true,
    limit: 25,
    used: 2,
    exhausted: false
  });

  const status = await getQuotaStatus('mod.analytics.reports.daily.max', TEAM_CTX);
  assert.equal(status.limit, 25);
  assert.equal(status.used, 2);
  assert.equal(status.remaining, 23);
  assert.equal(status.resetAt?.toISOString(), '2026-04-01T00:00:00.000Z');

  const consumed = await consumeQuota('mod.analytics.reports.daily.max', TEAM_CTX, {
    amount: 3,
    strict: true
  });
  assert.deepEqual(consumed, {
    consumed: true,
    used: 5,
    exhausted: false,
    remaining: 20
  });
});

test('SDK plan feature reads fail clearly when the host adapter has not published them', async () => {
  configureSubscriptionFeatures({
    async getFeatureLimit() {
      return { enabled: false, limit: null };
    },
    async getUsage() {
      return { used: 0 };
    },
    async incrementUsage() {
      return { used: 0 };
    }
  });

  await assert.rejects(
    () => getPlanFeatureValue('mod.analytics.reports.daily.max', TEAM_CTX),
    /does not provide getPlanFeatureValue/
  );
});
