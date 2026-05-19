import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'flexibleAssetField',
  displayName: 'Flexible Asset Field',
  jsonApiType: 'flexible_asset_fields',
  endpoint: 'flexible_asset_fields',
  operations: ['getAll', 'get', 'create', 'update', 'delete', 'bulkUpdate'],
  fields: [
    {
      name: 'flexibleAssetTypeId',
      attribute: 'flexible-asset-type-id',
      displayName: 'Flexible Asset Type ID',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The ID of the flexible asset type this field belongs to',
    },
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The field name',
    },
    {
      name: 'kind',
      attribute: 'kind',
      displayName: 'Kind',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The field kind/type (e.g. Text, Number, etc.)',
    },
    {
      name: 'order',
      attribute: 'order',
      displayName: 'Order',
      type: 'number',
      onOperations: ['create', 'update'],
      description: 'The display order of the field',
    },
    {
      name: 'required',
      attribute: 'required',
      displayName: 'Required',
      type: 'boolean',
      default: false,
      onOperations: ['create', 'update'],
      description: 'Whether this field is required',
    },
  ],
};
