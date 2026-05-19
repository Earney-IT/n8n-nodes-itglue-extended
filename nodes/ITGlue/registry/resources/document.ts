import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'document',
  displayName: 'Document',
  jsonApiType: 'documents',
  endpoint: 'documents',
  special: 'documents',
  idParam: 'documentId',
  operations: ['getAll', 'get', 'create', 'update', 'delete', 'publish'],
  fields: [
    {
      name: 'documentResource',
      attribute: 'document-resource',
      displayName: 'Document Resource',
      type: 'options',
      options: [
        { name: 'Document', value: 'document' },
        { name: 'Section', value: 'section' },
        { name: 'Image', value: 'image' },
      ],
      required: true,
      default: 'document',
      onOperations: ['getAll', 'get', 'create', 'update', 'delete', 'publish'],
      description: 'The type of document resource to operate on',
    },
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The document name',
    },
    {
      name: 'content',
      attribute: 'content',
      displayName: 'Content',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The document content (HTML or markdown)',
    },
    {
      // Parent document ID for section/image create; also used by document branch for get/update/delete
      name: 'documentId',
      attribute: 'document-id',
      displayName: 'Document ID',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'Parent document ID (required for Section/Image create)',
    },
    {
      // Section ID used when documentResource=section for get/update/delete
      name: 'sectionId',
      attribute: 'section-id',
      displayName: 'Section ID',
      type: 'string',
      onOperations: ['get', 'update', 'delete'],
      description: 'The section ID (used when Document Resource is Section)',
    },
    {
      // Image ID used when documentResource=image for get/update/delete
      name: 'imageId',
      attribute: 'image-id',
      displayName: 'Image ID',
      type: 'string',
      onOperations: ['get', 'update', 'delete'],
      description: 'The image ID (used when Document Resource is Image)',
    },
  ],
};
