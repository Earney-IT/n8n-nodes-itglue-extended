import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';
import { itGlueApiRequest } from '../../transport/request';
import { buildJsonApiBody, flattenResource } from '../../engine/jsonapi';

type RelatedItemOperation = 'create' | 'update' | 'bulkDelete';

export async function executeRelatedItem(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', index) as RelatedItemOperation;
	const self = this;

	function req(name: string): string {
		const val = self.getNodeParameter(name, index, '') as unknown;
		if (!val && val !== 0 && val !== '0') {
			throw new NodeOperationError(
				self.getNode(),
				`"${name}" is required for "${operation}" on Related Item.`,
				{ itemIndex: index },
			);
		}
		return String(val);
	}

	const resourceType = req('resourceType');
	const resourceId = req('resourceId');
	const base = `${resourceType}/${resourceId}/relationships/related_items`;

	switch (operation) {
		case 'create': {
			const destinationId = req('destinationId');
			const destinationType = req('destinationType');
			const notes = self.getNodeParameter('notes', index, '') as string;
			const attributes: IDataObject = {
				'destination-id': destinationId,
				'destination-type': destinationType,
				...(notes ? { notes } : {}),
			};
			const body = buildJsonApiBody('related_items', attributes);
			const resp = await itGlueApiRequest.call(this, 'POST', base, body);
			if (!resp.data) {
				throw new NodeOperationError(
					self.getNode(),
					'IT Glue returned no data for create on Related Item.',
					{ itemIndex: index },
				);
			}
			return this.helpers.returnJsonArray([flattenResource(resp.data as IDataObject)]);
		}

		case 'update': {
			const relatedItemId = req('relatedItemId');
			const notes = self.getNodeParameter('notes', index, '') as string;
			const attributes: IDataObject = {
				...(notes ? { notes } : {}),
			};
			const body = buildJsonApiBody('related_items', attributes, undefined, relatedItemId);
			const resp = await itGlueApiRequest.call(this, 'PATCH', `${base}/${relatedItemId}`, body);
			if (!resp.data) {
				throw new NodeOperationError(
					self.getNode(),
					'IT Glue returned no data for update on Related Item.',
					{ itemIndex: index },
				);
			}
			return this.helpers.returnJsonArray([flattenResource(resp.data as IDataObject)]);
		}

		case 'bulkDelete': {
			const ids = self.getNodeParameter('relatedItemIds', index, []) as string[];
			if (!Array.isArray(ids) || ids.length === 0) {
				throw new NodeOperationError(
					self.getNode(),
					'"relatedItemIds" must contain at least one ID for bulkDelete on Related Item.',
					{ itemIndex: index },
				);
			}
			await itGlueApiRequest.call(this, 'DELETE', base, {
				data: ids.map((id) => ({ type: 'related_items', id: String(id) })),
			});
			return this.helpers.returnJsonArray([{ success: true, deleted: ids }]);
		}

		default: {
			const _exhaustive: never = operation;
			throw new NodeOperationError(
				self.getNode(),
				`Unknown operation "${String(_exhaustive)}" on Related Item.`,
				{ itemIndex: index },
			);
		}
	}
}
