import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';
import { itGlueApiRequest, itGlueApiRequestAllItems } from '../../transport/request';
import { buildJsonApiBody, flattenResource } from '../../engine/jsonapi';

type ExportOperation = 'getAll' | 'get' | 'create' | 'delete' | 'createAndWait';

const POLL_CAP = 60;
const POLL_INTERVAL_MS = 2000;

export async function executeExport(
	this: IExecuteFunctions,
	index: number,
	opts: { sleep?: (ms: number) => Promise<void> } = {},
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', index) as ExportOperation;
	const self = this;
	const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

	function req(name: string): string {
		const val = self.getNodeParameter(name, index, '') as unknown;
		if (!val && val !== 0 && val !== '0') {
			throw new NodeOperationError(
				self.getNode(),
				`"${name}" is required for "${operation}" on Export.`,
				{ itemIndex: index },
			);
		}
		return String(val);
	}

	switch (operation) {
		case 'getAll': {
			const returnAll = self.getNodeParameter('returnAll', index, false) as boolean;
			const qs: IDataObject = {};
			let items: IDataObject[];
			if (returnAll) {
				items = await itGlueApiRequestAllItems.call(this, 'GET', 'exports', {}, qs);
			} else {
				qs['page[size]'] = self.getNodeParameter('limit', index, 50);
				const resp = await itGlueApiRequest.call(this, 'GET', 'exports', {}, qs);
				items = (resp.data as IDataObject[]) ?? [];
			}
			return this.helpers.returnJsonArray(items.map((r) => flattenResource(r)));
		}

		case 'get': {
			const exportId = req('exportId');
			const resp = await itGlueApiRequest.call(this, 'GET', `exports/${exportId}`);
			if (!resp.data) {
				throw new NodeOperationError(
					self.getNode(),
					'IT Glue returned no data for get on Export.',
					{ itemIndex: index },
				);
			}
			return this.helpers.returnJsonArray([flattenResource(resp.data as IDataObject)]);
		}

		case 'create': {
			const attributes: IDataObject = {};
			const format = self.getNodeParameter('format', index, '') as string;
			if (format) attributes.format = format;
			const resourceType = self.getNodeParameter('resourceType', index, '') as string;
			if (resourceType) attributes['resource-type'] = resourceType;
			const resourceId = self.getNodeParameter('resourceId', index, '') as string;
			if (resourceId) attributes['resource-id'] = resourceId;
			const includeRelated = self.getNodeParameter('includeRelated', index, '') as string;
			if (includeRelated) attributes['include-related'] = includeRelated;
			const body = buildJsonApiBody('exports', attributes);
			const resp = await itGlueApiRequest.call(this, 'POST', 'exports', body);
			if (!resp.data) {
				throw new NodeOperationError(
					self.getNode(),
					'IT Glue returned no data for create on Export.',
					{ itemIndex: index },
				);
			}
			return this.helpers.returnJsonArray([flattenResource(resp.data as IDataObject)]);
		}

		case 'delete': {
			const exportId = req('exportId');
			await itGlueApiRequest.call(this, 'DELETE', `exports/${exportId}`);
			return this.helpers.returnJsonArray([{ success: true, id: exportId }]);
		}

		case 'createAndWait': {
			// Step 1: create the export job
			const attributes: IDataObject = {};
			const format = self.getNodeParameter('format', index, '') as string;
			if (format) attributes.format = format;
			const resourceType = self.getNodeParameter('resourceType', index, '') as string;
			if (resourceType) attributes['resource-type'] = resourceType;
			const resourceId = self.getNodeParameter('resourceId', index, '') as string;
			if (resourceId) attributes['resource-id'] = resourceId;
			const includeRelated = self.getNodeParameter('includeRelated', index, '') as string;
			if (includeRelated) attributes['include-related'] = includeRelated;
			const body = buildJsonApiBody('exports', attributes);
			const createResp = await itGlueApiRequest.call(this, 'POST', 'exports', body);
			if (!createResp.data) {
				throw new NodeOperationError(
					self.getNode(),
					'IT Glue returned no data for createAndWait on Export.',
					{ itemIndex: index },
				);
			}

			const exportData = createResp.data as IDataObject;
			const exportId = String(exportData.id);
			const createAttrs = (exportData.attributes ?? {}) as IDataObject;
			const createStatus = String(createAttrs.status ?? '');

			// If already terminal on create response, return immediately
			if (createStatus === 'completed' || createStatus === 'done') {
				return this.helpers.returnJsonArray([flattenResource(exportData)]);
			}
			if (createStatus === 'failed' || createStatus === 'error') {
				throw new NodeOperationError(
					self.getNode(),
					`Export ${exportId} ${createStatus}.`,
					{ itemIndex: index },
				);
			}

			// Step 2: poll until terminal
			let polls = 0;
			for (;;) {
				if (polls >= POLL_CAP) {
					throw new NodeOperationError(
						self.getNode(),
						`Export ${exportId} did not complete after ${POLL_CAP} polls.`,
						{ itemIndex: index },
					);
				}
				await sleep(POLL_INTERVAL_MS);
				polls++;
				const pollResp = await itGlueApiRequest.call(this, 'GET', `exports/${exportId}`);
				if (!pollResp.data) continue;
				const pollData = pollResp.data as IDataObject;
				const pollAttrs = (pollData.attributes ?? {}) as IDataObject;
				const status = String(pollAttrs.status ?? '');
				if (status === 'completed' || status === 'done') {
					return this.helpers.returnJsonArray([flattenResource(pollData)]);
				}
				if (status === 'failed' || status === 'error') {
					throw new NodeOperationError(
						self.getNode(),
						`Export ${exportId} ${status}.`,
						{ itemIndex: index },
					);
				}
				// else still pending/processing — loop
			}
		}

		default: {
			const _exhaustive: never = operation;
			throw new NodeOperationError(
				self.getNode(),
				`Unknown operation "${String(_exhaustive)}" on Export.`,
				{ itemIndex: index },
			);
		}
	}
}
