import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { enabledResources } from './registry';
import { buildResourceProperties } from './engine/properties';
import { dispatch } from './engine/dispatch';
import { loadOptions } from './methods';

const sortedResources = [...enabledResources].sort((a, b) =>
	a.displayName.localeCompare(b.displayName),
);

const resourceOptions = sortedResources.map((d) => ({
	name: d.displayName,
	value: d.name,
}));

const resourceDefault =
	sortedResources.find((d) => d.name === 'organization')?.name ??
	sortedResources[0].name;

// Class name must match the filename root (`ItGlueExtended` ← ItGlueExtended.node.js)
// so n8n's community-package loader can find the exported node class by name.
export class ItGlueExtended implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'IT Glue Extended',
		// Internal name is `itGlueExtended` (not `itGlue`) to avoid a
		// case-insensitive collision with the third-party `n8n-nodes-itglue`
		// package (which uses `iTGlue`); n8n enforces a unique constraint on
		// installed-node names that treats both as identical.
		name: 'itGlueExtended',
		icon: 'file:itglue.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Search and manage IT Glue documentation: organizations, configurations, contacts, passwords (create/rotate — values never returned to AI), documents, flexible assets, SSL certificates, tickets, and more. Use for IT asset lookup, MSP documentation, password rotation, and config inventory.',
		defaults: {
			name: 'IT Glue Extended',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'itglueApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: resourceOptions,
				default: resourceDefault,
			},
			...enabledResources.flatMap(buildResourceProperties),
		],
	};

	methods = { loadOptions };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const res = await dispatch.call(this, i);
				if (!res || res.length === 0) {
					// n8n #26202: AI Agent tools must never emit an empty array.
					out.push({
						json: {
							found: 0,
							resource: this.getNodeParameter('resource', i, ''),
							operation: this.getNodeParameter('operation', i, ''),
						},
					});
				} else {
					out.push(...res);
				}
			} catch (err) {
				if (this.continueOnFail()) {
					out.push({ json: { error: (err as Error).message }, pairedItem: i });
				} else {
					const e = err as { context?: { itemIndex?: number } };
					if (e.context) e.context.itemIndex = i;
					throw err;
				}
			}
		}

		return [out];
	}
}
