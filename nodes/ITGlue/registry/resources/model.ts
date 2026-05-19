import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'model',
  displayName: 'Model',
  jsonApiType: 'models',
  endpoint: 'models',
  operations: ['getAll', 'get', 'create', 'update', 'bulkUpdate'],
  fields: [
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The model name',
    },
    {
      name: 'manufacturerId',
      attribute: 'manufacturer-id',
      displayName: 'Manufacturer',
      type: 'options',
      loadOptionsMethod: 'getManufacturers',
      onOperations: ['create', 'update'],
      description: 'The manufacturer of this model',
    },
  ],
};
