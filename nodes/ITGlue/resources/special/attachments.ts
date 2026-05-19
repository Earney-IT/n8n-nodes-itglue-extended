import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';
import { itGlueApiRequest, itGlueApiRequestAllItems } from '../../transport/request';
import { buildJsonApiBody, flattenResource } from '../../engine/jsonapi';

type AttachmentOperation = 'getAll' | 'get' | 'create' | 'update' | 'delete' | 'bulkDelete';

export async function executeAttachment(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', index) as AttachmentOperation;
	const self = this;

	function req(name: string, val: unknown): string {
		if (!val && val !== 0 && val !== '0') {
			throw new NodeOperationError(
				self.getNode(),
				`"${name}" is required for "${operation}" on Attachment.`,
				{ itemIndex: index },
			);
		}
		return String(val);
	}

	const resourceType = req(
		'resourceType',
		this.getNodeParameter('resourceType', index, '') as string,
	);
	const resourceId = req(
		'resourceId',
		this.getNodeParameter('resourceId', index, '') as string,
	);

	const base = `${resourceType}/${resourceId}/relationships/attachments`;
	const qs: IDataObject = {};

	switch (operation) {
		case 'getAll': {
			const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
			let items: IDataObject[];
			if (returnAll) {
				items = await itGlueApiRequestAllItems.call(this, 'GET', base, {}, qs);
			} else {
				qs['page[size]'] = this.getNodeParameter('limit', index, 50);
				const resp = await itGlueApiRequest.call(this, 'GET', base, {}, qs);
				items = (resp.data as IDataObject[]) ?? [];
			}
			return this.helpers.returnJsonArray(items.map((r) => flattenResource(r)));
		}

		case 'get': {
			const attachmentId = req(
				'attachmentId',
				this.getNodeParameter('attachmentId', index, '') as string,
			);
			const resp = await itGlueApiRequest.call(this, 'GET', `${base}/${attachmentId}`, {}, qs);
			if (!resp.data) {
				throw new NodeOperationError(
					self.getNode(),
					'IT Glue returned no data for get on Attachment.',
					{ itemIndex: index },
				);
			}
			return this.helpers.returnJsonArray([flattenResource(resp.data as IDataObject)]);
		}

		case 'create': {
			const fileBase64 = this.getNodeParameter('fileBase64', index, '') as string;
			let base64 = fileBase64;

			if (!base64) {
				const binaryProp = this.getNodeParameter('binaryPropertyName', index, '') as string;
				if (binaryProp) {
					const buf = await this.helpers.getBinaryDataBuffer(index, binaryProp);
					base64 = buf.toString('base64');
				}
			}

			if (!base64) {
				throw new NodeOperationError(
					self.getNode(),
					'Provide fileBase64 or a binaryPropertyName for the attachment.',
					{ itemIndex: index },
				);
			}

			const fileName = this.getNodeParameter('fileName', index, '') as string;
			const attributes: IDataObject = { attachment: base64 };
			if (fileName) {
				attributes['attachment-file-name'] = fileName;
			}

			const body = buildJsonApiBody('attachments', attributes);
			const resp = await itGlueApiRequest.call(this, 'POST', base, body);
			if (!resp.data) {
				throw new NodeOperationError(
					self.getNode(),
					'IT Glue returned no data for create on Attachment.',
					{ itemIndex: index },
				);
			}
			return this.helpers.returnJsonArray([flattenResource(resp.data as IDataObject)]);
		}

		case 'update': {
			const attachmentId = req(
				'attachmentId',
				this.getNodeParameter('attachmentId', index, '') as string,
			);
			const name = this.getNodeParameter('name', index, '') as string;
			const attributes: IDataObject = {};
			if (name) {
				attributes.name = name;
			}
			const body = buildJsonApiBody('attachments', attributes, undefined, attachmentId);
			const resp = await itGlueApiRequest.call(this, 'PATCH', `${base}/${attachmentId}`, body);
			if (!resp.data) {
				throw new NodeOperationError(
					self.getNode(),
					'IT Glue returned no data for update on Attachment.',
					{ itemIndex: index },
				);
			}
			return this.helpers.returnJsonArray([flattenResource(resp.data as IDataObject)]);
		}

		case 'delete': {
			const attachmentId = req(
				'attachmentId',
				this.getNodeParameter('attachmentId', index, '') as string,
			);
			await itGlueApiRequest.call(this, 'DELETE', base, {
				data: [{ type: 'attachments', id: attachmentId }],
			});
			return this.helpers.returnJsonArray([{ success: true, id: attachmentId }]);
		}

		case 'bulkDelete': {
			const ids = this.getNodeParameter('attachmentIds', index, []) as string[];
			await itGlueApiRequest.call(this, 'DELETE', base, {
				data: ids.map((id) => ({ type: 'attachments', id: String(id) })),
			});
			return this.helpers.returnJsonArray([{ success: true, deleted: ids }]);
		}

		default: {
			const _exhaustive: never = operation;
			throw new NodeOperationError(
				self.getNode(),
				`Unknown operation "${String(_exhaustive)}" on Attachment.`,
				{ itemIndex: index },
			);
		}
	}
}
