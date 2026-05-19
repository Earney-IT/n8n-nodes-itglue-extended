import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'country',
  displayName: 'Country',
  jsonApiType: 'countries',
  endpoint: 'countries',
  operations: ['getAll', 'get'],
  fields: [],
};
