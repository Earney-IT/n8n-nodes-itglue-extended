// GATED: endpoint unverified against the live IT Glue API. Excluded from enabledResources until confirmed by scripts/verify-endpoints.ts (Task 19 Part B).
// Copilot has no confirmed public REST endpoint; gated, expected to be dropped at live verification unless confirmed.

import { ResourceDescriptor } from '../../types';

export const descriptor: ResourceDescriptor = {
  name: 'copilot',
  displayName: 'Copilot',
  jsonApiType: 'copilots',
  endpoint: 'copilots',
  operations: ['getAll', 'get'],
  fields: [],
  gated: true,
};
