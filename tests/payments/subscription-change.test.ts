import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCarryoverPlan } from '../../lib/payments/subscription-change';

test('buildCarryoverPlan prefers current period end when in the future', () => {
  const now = new Date('2026-02-05T00:00:00.000Z');
  const currentPeriodEnd = new Date('2026-02-10T00:00:00.000Z');

  const plan = buildCarryoverPlan({ now, currentPeriodEnd });

  assert.equal(plan.effectiveAt.toISOString(), currentPeriodEnd.toISOString());
  assert.equal(plan.basis, 'current_period_end');
  assert.equal(plan.carryoverDays, 5);
});

test('buildCarryoverPlan uses trial end when it is later than now', () => {
  const now = new Date('2026-02-05T00:00:00.000Z');
  const trialEndsAt = new Date('2026-02-07T00:00:00.000Z');

  const plan = buildCarryoverPlan({ now, trialEndsAt });

  assert.equal(plan.effectiveAt.toISOString(), trialEndsAt.toISOString());
  assert.equal(plan.basis, 'trial_end');
  assert.equal(plan.carryoverDays, 2);
});

test('buildCarryoverPlan picks the latest of current period end or trial end', () => {
  const now = new Date('2026-02-05T00:00:00.000Z');
  const currentPeriodEnd = new Date('2026-02-08T00:00:00.000Z');
  const trialEndsAt = new Date('2026-02-12T00:00:00.000Z');

  const plan = buildCarryoverPlan({ now, currentPeriodEnd, trialEndsAt });

  assert.equal(plan.effectiveAt.toISOString(), trialEndsAt.toISOString());
  assert.equal(plan.basis, 'trial_end');
  assert.equal(plan.carryoverDays, 7);
});

test('buildCarryoverPlan falls back to now when no future dates exist', () => {
  const now = new Date('2026-02-05T00:00:00.000Z');
  const currentPeriodEnd = new Date('2026-02-01T00:00:00.000Z');
  const trialEndsAt = new Date('2026-02-03T00:00:00.000Z');

  const plan = buildCarryoverPlan({ now, currentPeriodEnd, trialEndsAt });

  assert.equal(plan.effectiveAt.toISOString(), now.toISOString());
  assert.equal(plan.basis, 'now');
  assert.equal(plan.carryoverDays, 0);
});
