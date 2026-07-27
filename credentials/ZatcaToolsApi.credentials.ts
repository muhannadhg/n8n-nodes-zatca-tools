import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class ZatcaToolsApi implements ICredentialType {
	name = 'zatcaToolsApi';

	displayName = 'ZATCA Tools API';

	icon: Icon = { light: 'file:zatcatools.png', dark: 'file:zatcatools.dark.png' };

	// eslint-disable-next-line n8n-nodes-base/cred-class-field-documentation-url-miscased -- the linter's camelCase fix turns this into an identifier, and its own next rule then demands a URL.
	documentationUrl = 'https://zatcatools.com/docs/api';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'From your ZATCA Tools dashboard → Settings → API. One active key per establishment.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://zatcatools.com/api/v1',
			description: 'Only change this if you were given a different endpoint.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	/**
	 * Account lookup: the cheapest call that proves the key works, and it fails
	 * loudly on a key that is valid but belongs to no connected establishment.
	 */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/account',
		},
	};
}
