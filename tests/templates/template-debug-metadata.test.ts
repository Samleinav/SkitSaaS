import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getTemplateDebugMetadataAttributes,
  isTemplateDebugMetadataEnabled
} from '../../lib/templates/debug';

const PROCESS_ENV = process.env as Record<string, string | undefined>;

test('template debug metadata is disabled in production by default', () => {
  const previousNodeEnv = PROCESS_ENV.NODE_ENV;
  const previousDebugFlag = PROCESS_ENV.NEXT_PUBLIC_TEMPLATE_DEBUG_METADATA;

  PROCESS_ENV.NODE_ENV = 'production';
  delete PROCESS_ENV.NEXT_PUBLIC_TEMPLATE_DEBUG_METADATA;

  try {
    assert.equal(isTemplateDebugMetadataEnabled(), false);
    assert.deepEqual(
      getTemplateDebugMetadataAttributes({
        componentId: 'ui.table',
        templateId: 'ui.table',
        templateSource: 'theme_code'
      }),
      {}
    );
  } finally {
    PROCESS_ENV.NODE_ENV = previousNodeEnv;
    PROCESS_ENV.NEXT_PUBLIC_TEMPLATE_DEBUG_METADATA = previousDebugFlag;
  }
});

test('template debug metadata is enabled in development', () => {
  const previousNodeEnv = PROCESS_ENV.NODE_ENV;
  const previousDebugFlag = PROCESS_ENV.NEXT_PUBLIC_TEMPLATE_DEBUG_METADATA;

  PROCESS_ENV.NODE_ENV = 'development';
  delete PROCESS_ENV.NEXT_PUBLIC_TEMPLATE_DEBUG_METADATA;

  try {
    assert.equal(isTemplateDebugMetadataEnabled(), true);
    assert.deepEqual(
      getTemplateDebugMetadataAttributes({
        componentId: 'ui.table',
        templateId: 'theme.table',
        templateSource: 'theme_code'
      }),
      {
        'data-template-component': 'ui.table',
        'data-template-id': 'theme.table',
        'data-template-source': 'theme_code'
      }
    );
  } finally {
    PROCESS_ENV.NODE_ENV = previousNodeEnv;
    PROCESS_ENV.NEXT_PUBLIC_TEMPLATE_DEBUG_METADATA = previousDebugFlag;
  }
});

test('template debug metadata can be enabled in production by explicit flag', () => {
  const previousNodeEnv = PROCESS_ENV.NODE_ENV;
  const previousDebugFlag = PROCESS_ENV.NEXT_PUBLIC_TEMPLATE_DEBUG_METADATA;

  PROCESS_ENV.NODE_ENV = 'production';
  PROCESS_ENV.NEXT_PUBLIC_TEMPLATE_DEBUG_METADATA = '1';

  try {
    assert.equal(isTemplateDebugMetadataEnabled(), true);
    assert.deepEqual(
      getTemplateDebugMetadataAttributes({
        componentId: 'ui.alert-dialog',
        templateId: 'theme.dialog',
        templateSource: 'theme_code'
      }),
      {
        'data-template-component': 'ui.alert-dialog',
        'data-template-id': 'theme.dialog',
        'data-template-source': 'theme_code'
      }
    );
  } finally {
    PROCESS_ENV.NODE_ENV = previousNodeEnv;
    PROCESS_ENV.NEXT_PUBLIC_TEMPLATE_DEBUG_METADATA = previousDebugFlag;
  }
});

