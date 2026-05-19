import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'flexibleAsset',
  displayName: 'Flexible Asset',
  jsonApiType: 'flexible_assets',
  endpoint: 'flexible_assets',
  special: 'flexibleAssets',
  idParam: 'flexibleAssetId',
  orgScoped: true,
  operations: ['getAll', 'get', 'create', 'update', 'delete', 'bulkDelete'],
  fields: [
    {
      name: 'flexibleAssetTypeId',
      attribute: 'flexible-asset-type-id',
      displayName: 'Flexible Asset Type',
      type: 'options',
      loadOptionsMethod: 'getFlexibleAssetTypes',
      required: true,
      onOperations: ['create', 'update', 'getAll'],
      description: 'The flexible asset type. Required for create and getAll (IT Glue requires filter[flexible-asset-type-id])',
    },
    // organizationId is auto-emitted by the orgScoped block in
    // buildResourceProperties (create/getAll); an explicit field here
    // would collide with the reserved-name guard.
    {
      name: 'traits',
      attribute: 'traits',
      displayName: 'Traits',
      type: 'json',
      default: '{"trait":[]}',
      onOperations: ['create', 'update'],
      description: 'Flexible asset field values. JSON object of shape { "trait": [ { "name": "field-name-key", "value": fieldValue } ] }. Use the Flexible Asset Type to discover field name-keys.',
    },
    {
      name: 'flexibleAssetIds',
      attribute: 'flexible-asset-ids',
      displayName: 'Flexible Asset IDs',
      type: 'json',
      default: '[]',
      onOperations: ['bulkDelete'],
      description: 'JSON array of flexible asset IDs to delete in bulk',
    },
  ],
  includes: ['organization', 'attachments', 'related_items'],
};
