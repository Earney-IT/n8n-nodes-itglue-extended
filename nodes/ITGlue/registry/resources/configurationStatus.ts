import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'configurationStatus',
  displayName: 'Configuration Status',
  jsonApiType: 'configuration_statuses',
  endpoint: 'configuration_statuses',
  operations: ['getAll', 'get', 'create', 'update'],
  fields: [
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The configuration status name',
    },
  ],
};
