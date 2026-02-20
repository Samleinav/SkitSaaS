import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeClassNames,
  readString,
  toNumberOrFallback,
  toStringOrFallback,
  toStringOrNull
} from '../../app/sdk/src/index';

test('template SDK utils normalize string and number values deterministically', () => {
  assert.equal(toStringOrNull('  admin  '), 'admin');
  assert.equal(toStringOrNull('   '), null);
  assert.equal(toStringOrNull(7), null);

  assert.equal(toStringOrFallback('  pro  ', 'basic'), 'pro');
  assert.equal(toStringOrFallback('   ', 'basic'), 'basic');
  assert.equal(toStringOrFallback(undefined, 'basic'), 'basic');

  assert.equal(readString({ title: '  Hello  ' }, 'title'), 'Hello');
  assert.equal(readString({ title: 42 }, 'title', 'fallback'), 'fallback');
  assert.equal(readString(undefined, 'title', 'fallback'), 'fallback');

  assert.equal(toNumberOrFallback(4, 2), 4);
  assert.equal(toNumberOrFallback(Number.NaN, 2), 2);
  assert.equal(toNumberOrFallback('4', 2), 2);
});

test('template SDK utils merge class names without falsy entries', () => {
  assert.equal(
    mergeClassNames('rounded', null, 'border', undefined, false, 'px-3'),
    'rounded border px-3'
  );
});
