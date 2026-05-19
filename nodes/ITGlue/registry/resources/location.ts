import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'location',
  displayName: 'Location',
  jsonApiType: 'locations',
  endpoint: 'locations',
  operations: ['getAll', 'get', 'create', 'update', 'delete', 'bulkDelete'],
  orgScoped: true,
  fields: [
    // organizationId is auto-emitted by the orgScoped block in
    // buildResourceProperties (create/getAll); an explicit field here
    // would collide with the reserved-name guard.
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The location name',
    },
    {
      name: 'address1',
      attribute: 'address-1',
      displayName: 'Address',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The street address',
    },
    {
      name: 'city',
      attribute: 'city',
      displayName: 'City',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The city',
    },
    {
      name: 'regionId',
      attribute: 'region-id',
      displayName: 'Region ID',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The region/state ID',
    },
    {
      name: 'countryId',
      attribute: 'country-id',
      displayName: 'Country ID',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The country ID',
    },
    {
      name: 'postalCode',
      attribute: 'postal-code',
      displayName: 'Postal Code',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The postal/zip code',
    },
    {
      name: 'phone',
      attribute: 'phone',
      displayName: 'Phone',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The location phone number',
    },
  ],
};
