import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'manufacturer',
  displayName: 'Manufacturer',
  jsonApiType: 'manufacturers',
  endpoint: 'manufacturers',
  operations: ['getAll', 'get', 'create', 'update'],
  fields: [
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The manufacturer name',
    },
  ],
};
