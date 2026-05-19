import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'operatingSystem',
  displayName: 'Operating System',
  jsonApiType: 'operating_systems',
  endpoint: 'operating_systems',
  operations: ['getAll', 'get'],
  fields: [],
};
