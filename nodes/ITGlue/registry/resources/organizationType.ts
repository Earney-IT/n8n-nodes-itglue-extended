import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'organizationType',
  displayName: 'Organization Type',
  jsonApiType: 'organization_types',
  endpoint: 'organization_types',
  operations: ['getAll', 'get', 'create', 'update'],
  fields: [
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The organization type name',
    },
  ],
};
