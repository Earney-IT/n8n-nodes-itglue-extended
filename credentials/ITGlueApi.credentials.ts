import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ITGlueApi implements ICredentialType {
	name = 'itglueApi';

	displayName = 'IT Glue API';

	documentationUrl = 'https://github.com/Earney-IT/n8n-nodes-itglue-extended';

	properties: INodeProperties[] = [
		{
			displayName: 'Region',
			name: 'region',
			type: 'options',
			default: 'api',
			noDataExpression: true,
			options: [
				{
					name: 'US',
					value: 'api',
				},
				{
					name: 'Europe',
					value: 'api.eu',
				},
				{
					name: 'Australia',
					value: 'api.au',
				},
			],
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
				'Content-Type': 'application/vnd.api+json',
				'User-Agent': 'n8n-nodes-itglue-extended',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{"https://" + $credentials.region + ".itglue.com"}}',
			url: '/organizations',
			method: 'GET',
			qs: { 'page[size]': 1 },
		},
	};
}
