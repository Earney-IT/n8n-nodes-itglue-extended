// GATED: endpoint unverified against the live IT Glue API. Excluded from enabledResources until confirmed by scripts/verify-endpoints.ts (Task 19 Part B).

import { ResourceDescriptor } from '../../types';

export const descriptor: ResourceDescriptor = {
  name: 'networkGlue',
  displayName: 'Network Glue',
  jsonApiType: 'networks',
  endpoint: 'networks',
  operations: ['getAll', 'get'],
  orgScoped: true,
  fields: [],
  filters: [
    {
      name: 'organizationId',
      attribute: 'organization-id',
      displayName: 'Organization ID',
      type: 'string',
      description: 'Filter by organization ID',
    },
  ],
  gated: true,
};
