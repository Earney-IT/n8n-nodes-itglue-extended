import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'flexibleAssetType',
  displayName: 'Flexible Asset Type',
  jsonApiType: 'flexible_asset_types',
  endpoint: 'flexible_asset_types',
  operations: ['getAll', 'get', 'create', 'update'],
  fields: [
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The flexible asset type name',
    },
    {
      name: 'description',
      attribute: 'description',
      displayName: 'Description',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'A description of this flexible asset type',
    },
    {
      name: 'icon',
      attribute: 'icon',
      displayName: 'Icon',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The icon name for this flexible asset type',
    },
    {
      name: 'enabled',
      attribute: 'enabled',
      displayName: 'Enabled',
      type: 'boolean',
      default: true,
      onOperations: ['create', 'update'],
      description: 'Whether this flexible asset type is enabled',
    },
  ],
};
