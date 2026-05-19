import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'region',
  displayName: 'Region',
  jsonApiType: 'regions',
  endpoint: 'regions',
  operations: ['getAll', 'get'],
  fields: [],
};
