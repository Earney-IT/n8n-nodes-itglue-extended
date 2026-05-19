import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { registry } from '../registry';
import { ResourceDescriptor } from '../registry/types';
import { executeGeneric } from './crud';
import { executePassword } from '../resources/special/passwords';
import { executeFlexibleAsset } from '../resources/special/flexibleAssets';
import { executeAttachment } from '../resources/special/attachments';
import { executeRelatedItem } from '../resources/special/relatedItems';
import { executeExport } from '../resources/special/exports';
import { executeDocument } from '../resources/special/documents';

type SpecialHandler = (
	this: IExecuteFunctions,
	index: number,
) => Promise<INodeExecutionData[]>;

const SPECIAL_HANDLERS: Record<NonNullable<ResourceDescriptor['special']>, SpecialHandler> = {
	passwords: executePassword,
	flexibleAssets: executeFlexibleAsset,
	attachments: executeAttachment,
	relatedItems: executeRelatedItem,
	exports: executeExport as SpecialHandler,
	documents: executeDocument,
};

/**
 * Resolve the selected `resource` param to its descriptor and route to the
 * correct handler. Special resources go to their dedicated handler (which
 * owns security/redaction); everything else uses the generic CRUD engine.
 *
 * `this` is passed UNCHANGED to every handler so the fail-closed reveal gate
 * sees the real `isToolExecution()` signal.
 */
export async function dispatch(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const resource = this.getNodeParameter('resource', index) as string;
	const descriptor = registry.find((r) => r.name === resource);

	if (!descriptor) {
		throw new NodeOperationError(
			this.getNode(),
			`Unsupported resource: ${resource}`,
			{ itemIndex: index },
		);
	}

	if (descriptor.special) {
		const handler = SPECIAL_HANDLERS[descriptor.special];
		return handler.call(this, index);
	}

	return executeGeneric.call(this, descriptor, index);
}
