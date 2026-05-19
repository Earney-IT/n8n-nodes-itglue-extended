// GATED: endpoint unverified against the live IT Glue API. Excluded from enabledResources until confirmed by scripts/verify-endpoints.ts (Task 19 Part B).

import { ResourceDescriptor } from '../../types';

export const descriptor: ResourceDescriptor = {
  name: 'sslCertificate',
  displayName: 'SSL Certificate',
  jsonApiType: 'ssl_certificates',
  endpoint: 'ssl_certificates',
  operations: ['getAll', 'get', 'create', 'update', 'delete'],
  orgScoped: true,
  fields: [
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The SSL certificate name',
    },
    {
      name: 'organizationId',
      attribute: 'organization-id',
      displayName: 'Organization',
      type: 'options',
      loadOptionsMethod: 'getOrganizations',
      onOperations: ['create', 'update'],
      description: 'The organization this certificate belongs to',
    },
    {
      name: 'commonName',
      attribute: 'common-name',
      displayName: 'Common Name',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The certificate common name (CN)',
    },
    {
      name: 'issuer',
      attribute: 'issuer',
      displayName: 'Issuer',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The certificate issuer',
    },
    {
      name: 'expiresAt',
      attribute: 'expires-at',
      displayName: 'Expires At',
      type: 'dateTime',
      onOperations: ['create', 'update'],
      description: 'The certificate expiration date/time',
    },
  ],
  filters: [
    {
      name: 'organizationId',
      attribute: 'organization-id',
      displayName: 'Organization ID',
      type: 'string',
      description: 'Filter by organization ID',
    },
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      description: 'Filter by certificate name',
    },
  ],
  includes: ['attachments', 'related_items'],
  gated: true,
};
