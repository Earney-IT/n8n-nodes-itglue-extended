import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';
import { itGlueApiRequest, itGlueApiRequestAllItems } from '../../transport/request';
import { buildJsonApiBody, flattenResource } from '../../engine/jsonapi';

type DocumentOperation = 'getAll' | 'get' | 'create' | 'update' | 'delete' | 'publish';
type DocumentResource = 'document' | 'section' | 'image';

interface ResourceConfig {
	endpoint: string;
	type: string;
	idParam: string;
}

const RESOURCE_CONFIG: Record<DocumentResource, ResourceConfig> = {
	document: { endpoint: 'documents', type: 'documents', idParam: 'documentId' },
	section: { endpoint: 'document_sections', type: 'document_sections', idParam: 'sectionId' },
	image: { endpoint: 'document_images', type: 'document_images', idParam: 'imageId' },
};

export async function executeDocument(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', index) as DocumentOperation;
	const documentResource = this.getNodeParameter('documentResource', index, 'document') as DocumentResource;
	const self = this;

	const config = RESOURCE_CONFIG[documentResource];
	if (!config) {
		throw new NodeOperationError(
			self.getNode(),
			`Unknown documentResource "${documentResource}".`,
			{ itemIndex: index },
		);
	}

	const { endpoint, type, idParam } = config;

	function req(name: string): string {
		const val = self.getNodeParameter(name, index, '') as unknown;
		if (!val && val !== 0 && val !== '0') {
			throw new NodeOperationError(
				self.getNode(),
				`"${name}" is required for "${operation}" on Document.`,
				{ itemIndex: index },
			);
		}
		return String(val);
	}

	function collectAttributes(requireDocumentId = false): IDataObject {
		const attributes: IDataObject = {};
		const name = self.getNodeParameter('name', index, '') as string;
		if (name) attributes.name = name;
		const content = self.getNodeParameter('content', index, '') as string;
		if (content) attributes.content = content;
		// Set parent document-id for sections and images (not for documents themselves)
		if (documentResource !== 'document') {
			const docId = self.getNodeParameter('parentDocumentId', index, '') as string;
			if (requireDocumentId && !docId) {
				throw new NodeOperationError(
					self.getNode(),
					`"parentDocumentId" is required to create a ${documentResource} (sections and images belong to a document).`,
					{ itemIndex: index },
				);
			}
			if (docId) attributes['document-id'] = docId;
		}
		return attributes;
	}

	switch (operation) {
		case 'getAll': {
			const returnAll = self.getNodeParameter('returnAll', index, false) as boolean;
			const qs: IDataObject = {};
			let items: IDataObject[];
			if (returnAll) {
				items = await itGlueApiRequestAllItems.call(this, 'GET', endpoint, {}, qs);
			} else {
				qs['page[size]'] = self.getNodeParameter('limit', index, 50);
				const resp = await itGlueApiRequest.call(this, 'GET', endpoint, {}, qs);
				items = (resp.data as IDataObject[]) ?? [];
			}
			return this.helpers.returnJsonArray(items.map((r) => flattenResource(r)));
		}

		case 'get': {
			const id = req(idParam);
			const resp = await itGlueApiRequest.call(this, 'GET', `${endpoint}/${id}`);
			if (!resp.data) {
				throw new NodeOperationError(
					self.getNode(),
					`IT Glue returned no data for get on Document (${documentResource}).`,
					{ itemIndex: index },
				);
			}
			return this.helpers.returnJsonArray([flattenResource(resp.data as IDataObject)]);
		}

		case 'create': {
			const attributes = collectAttributes(true);
			const body = buildJsonApiBody(type, attributes);
			const resp = await itGlueApiRequest.call(this, 'POST', endpoint, body);
			if (!resp.data) {
				throw new NodeOperationError(
					self.getNode(),
					`IT Glue returned no data for create on Document (${documentResource}).`,
					{ itemIndex: index },
				);
			}
			return this.helpers.returnJsonArray([flattenResource(resp.data as IDataObject)]);
		}

		case 'update': {
			const id = req(idParam);
			const attributes = collectAttributes();
			if (Object.keys(attributes).length === 0) {
				throw new NodeOperationError(
					self.getNode(),
					'Provide at least one field to update (name, content).',
					{ itemIndex: index },
				);
			}
			const body = buildJsonApiBody(type, attributes, undefined, id);
			const resp = await itGlueApiRequest.call(this, 'PATCH', `${endpoint}/${id}`, body);
			if (!resp.data) {
				throw new NodeOperationError(
					self.getNode(),
					`IT Glue returned no data for update on Document (${documentResource}).`,
					{ itemIndex: index },
				);
			}
			return this.helpers.returnJsonArray([flattenResource(resp.data as IDataObject)]);
		}

		case 'delete': {
			const id = req(idParam);
			await itGlueApiRequest.call(this, 'DELETE', `${endpoint}/${id}`);
			return this.helpers.returnJsonArray([{ success: true, id }]);
		}

		case 'publish': {
			if (documentResource !== 'document') {
				throw new NodeOperationError(
					self.getNode(),
					`publish is only valid for documentResource 'document'.`,
					{ itemIndex: index },
				);
			}
			const id = req('documentId');
			const body = buildJsonApiBody('documents', { published: true }, undefined, id);
			const resp = await itGlueApiRequest.call(this, 'PATCH', `documents/${id}`, body);
			if (!resp.data) {
				throw new NodeOperationError(
					self.getNode(),
					'IT Glue returned no data for publish on Document.',
					{ itemIndex: index },
				);
			}
			return this.helpers.returnJsonArray([flattenResource(resp.data as IDataObject)]);
		}

		default: {
			const _exhaustive: never = operation;
			throw new NodeOperationError(
				self.getNode(),
				`Unknown operation "${String(_exhaustive)}" on Document.`,
				{ itemIndex: index },
			);
		}
	}
}
