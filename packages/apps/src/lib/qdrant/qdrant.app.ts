import { createApp } from '@lecca-io/toolkit';

import { listIndexes } from './actions/list-collections.action';
import { queryVectors } from './actions/query-vectors.action';
import { upsertPoint } from './actions/upsert-vector.action';
import { qdrantApiKey } from './connections/qdrant.api-key';

export const qdrant = createApp({
  id: 'qdrant',
  name: 'Qdrant',
  description:
    'High-performance, massive-scale vector search engine for the next generation of AI.',
  logoUrl: 'https://lecca-io.s3.us-east-2.amazonaws.com/assets/apps/qdrant.svg',
  actions: [queryVectors, upsertPoint, listIndexes],
  triggers: [],
  connections: [qdrantApiKey],
});
