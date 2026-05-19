import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'organizationStatus',
  displayName: 'Organization Status',
  jsonApiType: 'organization_statuses',
  endpoint: 'organization_statuses',
  operations: ['getAll', 'get', 'create', 'update'],
  fields: [
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The organization status name',
    },
  ],
};
