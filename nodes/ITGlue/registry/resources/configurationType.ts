import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'configurationType',
  displayName: 'Configuration Type',
  jsonApiType: 'configuration_types',
  endpoint: 'configuration_types',
  operations: ['getAll', 'get', 'create', 'update'],
  fields: [
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The configuration type name',
    },
  ],
};
