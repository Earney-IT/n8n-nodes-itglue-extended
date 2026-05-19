import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'domain',
  displayName: 'Domain',
  jsonApiType: 'domains',
  endpoint: 'domains',
  operations: ['getAll', 'get'],
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
};
