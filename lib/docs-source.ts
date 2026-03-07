import { docs } from '@/.source';
import { loader } from 'fumadocs-core/source';
import type { Source } from 'fumadocs-core/source';

export const docsSource = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource() as Source,
});
