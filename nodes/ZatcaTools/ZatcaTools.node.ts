import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

/**
 * Issue Saudi ZATCA Phase 2 documents from a workflow.
 *
 * Declarative style: n8n builds the HTTP calls from this description, so there
 * is no request code to drift from the API.
 *
 * Two things are deliberate. `external_id` is exposed on every create operation
 * and described plainly, because a workflow that retries — and every workflow
 * retries eventually — must not double-invoice a customer. And a credit note is
 * offered in a "cancel the whole invoice" form as well as an itemised one,
 * because an issued invoice can never be deleted: reversing it IS the
 * cancellation, and the open balance is computed server-side where the earlier
 * refunds are known.
 */
export class ZatcaTools implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ZATCA Tools',
		name: 'zatcaTools',
		icon: 'file:zatcatools.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Issue Saudi e-invoices, credit notes and debit notes',
		defaults: { name: 'ZATCA Tools' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'zatcaToolsApi', required: true }],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: { Accept: 'application/json' },
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Invoice', value: 'invoice' },
					{ name: 'Note', value: 'note' },
					{ name: 'Account', value: 'account' },
				],
				default: 'invoice',
			},

			/* ------------------------------------------------------ invoice */
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['invoice'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Issue an invoice',
						description: 'Build, sign and report a tax invoice',
						routing: { request: { method: 'POST', url: '/invoices' } },
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get an invoice',
						routing: { request: { method: 'GET', url: '=/invoices/{{$parameter["uuid"]}}' } },
					},
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many invoices',
						routing: { request: { method: 'GET', url: '/invoices' } },
					},
					{
						name: 'Email',
						value: 'email',
						action: 'Email an invoice',
						description: 'Send the PDF to the buyer',
						routing: { request: { method: 'POST', url: '=/invoices/{{$parameter["uuid"]}}/email' } },
					},
				],
				default: 'create',
			},
			{
				displayName: 'UUID',
				name: 'uuid',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['invoice'], operation: ['get', 'email'] } },
			},
			{
				displayName: 'Send To',
				name: 'to',
				type: 'string',
				placeholder: 'buyer@example.com',
				default: '',
				description: 'Leave empty to send to your own account address',
				displayOptions: { show: { resource: ['invoice'], operation: ['email'] } },
				routing: { send: { type: 'body', property: 'to' } },
			},
			{
				displayName: 'Invoice Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Simplified (B2C)', value: 'simplified' },
					{ name: 'Standard (B2B)', value: 'standard' },
				],
				default: 'simplified',
				description:
					'Standard is cleared by ZATCA before issuing and needs the buyer’s VAT number and national address. Simplified is reported after issuing.',
				displayOptions: { show: { resource: ['invoice'], operation: ['create'] } },
				routing: { send: { type: 'body', property: 'type' } },
			},
			{
				displayName: 'Lines',
				name: 'lines',
				placeholder: 'Add line',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				displayOptions: { show: { resource: ['invoice'], operation: ['create'] } },
				options: [
					{
						name: 'line',
						displayName: 'Line',
						values: [
							{ displayName: 'Name', name: 'name', type: 'string', default: '' },
							{ displayName: 'Quantity', name: 'quantity', type: 'number', default: 1 },
							{
								displayName: 'Unit Price',
								name: 'unit_price',
								type: 'number',
								default: 0,
								description: 'NET of VAT — the 15% is added for you',
							},
						],
					},
				],
				routing: { send: { type: 'body', property: 'lines', value: '={{$value.line}}' } },
			},
			{
				displayName: 'External ID',
				name: 'external_id',
				type: 'string',
				default: '',
				placeholder: 'order-5501',
				description: 'Your own ID for this sale. Sending it again returns the SAME invoice instead of issuing a second one — set it whenever a workflow could run twice.',
				displayOptions: { show: { resource: ['invoice'], operation: ['create'] } },
				routing: { send: { type: 'body', property: 'external_id' } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add field',
				default: {},
				displayOptions: { show: { resource: ['invoice'], operation: ['create'] } },
				options: [
					{
						displayName: 'Buyer Commercial Registration',
						name: 'customerCr',
						type: 'string',
						default: '',
						routing: { send: { type: 'body', property: 'customer.cr_number' } },
					},
					{
						displayName: 'Buyer Email',
						name: 'customer_email',
						type: 'string',
						default: '',
						description: 'We email them the signed PDF with its QR code',
						routing: { send: { type: 'body', property: 'customer_email' } },
					},
					{
						displayName: 'Buyer Name',
						name: 'customerName',
						type: 'string',
						default: '',
						routing: { send: { type: 'body', property: 'customer.name' } },
					},
					{
						displayName: 'Buyer National Address',
						name: 'customerShortAddress',
						type: 'string',
						default: '',
						placeholder: 'RRRD2929',
						description:
							'العنوان الوطني — 4 letters + 4 digits. The street, building number, city and postal code a tax invoice needs are resolved from it.',
						routing: { send: { type: 'body', property: 'customer.short_address' } },
					},
					{
						displayName: 'Buyer VAT Number',
						name: 'customerVat',
						type: 'string',
						default: '',
						placeholder: '3XXXXXXXXXXXXX3',
						routing: { send: { type: 'body', property: 'customer.vat_number' } },
					},
					{
						displayName: 'Discount',
						name: 'discount',
						type: 'number',
						default: 0,
						description: 'NET discount on the whole invoice',
						routing: { send: { type: 'body', property: 'discount' } },
					},
					{
						displayName: 'Issue Date',
						name: 'issue_date',
						type: 'string',
						default: '',
						placeholder: 'YYYY-MM-DD',
						description: 'Defaults to today. Dated in Saudi time.',
						routing: { send: { type: 'body', property: 'issue_date' } },
					},
				],
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add filter',
				default: {},
				displayOptions: { show: { resource: ['invoice'], operation: ['getAll'] } },
				options: [
					{
						displayName: 'Kind',
						name: 'kind',
						type: 'options',
						options: [
							{ name: 'Invoice', value: 'invoice' },
							{ name: 'Credit Note', value: 'credit' },
							{ name: 'Debit Note', value: 'debit' },
							{ name: 'All', value: 'all' },
						],
						default: 'invoice',
						routing: { send: { type: 'query', property: 'kind' } },
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{ name: 'Accepted', value: 'accepted' },
							{ name: 'Accepted With Warnings', value: 'warnings' },
							{ name: 'Rejected', value: 'rejected' },
							{ name: 'Draft', value: 'draft' },
						],
						default: 'accepted',
						routing: { send: { type: 'query', property: 'status' } },
					},
					{
						displayName: 'Since',
						name: 'since',
						type: 'dateTime',
						default: '',
						routing: { send: { type: 'query', property: 'since' } },
					},
				],
			},

			/* --------------------------------------------------------- note */
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['note'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Issue a credit or debit note',
						routing: { request: { method: 'POST', url: '/notes' } },
					},
				],
				default: 'create',
			},
			{
				displayName: 'Kind',
				name: 'kind',
				type: 'options',
				options: [
					{ name: 'Credit Note (Reduce)', value: 'credit' },
					{ name: 'Debit Note (Increase)', value: 'debit' },
				],
				default: 'credit',
				displayOptions: { show: { resource: ['note'] } },
				routing: { send: { type: 'body', property: 'kind' } },
			},
			{
				displayName: 'Invoice UUID',
				name: 'invoice_uuid',
				type: 'string',
				default: '',
				required: true,
				description: 'The issued invoice this note adjusts',
				displayOptions: { show: { resource: ['note'] } },
				routing: { send: { type: 'body', property: 'invoice_uuid' } },
			},
			{
				displayName: 'Reason',
				name: 'reason',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'Order cancelled',
				description: 'Mandatory on every note (ZATCA rule BR-KSA-17)',
				displayOptions: { show: { resource: ['note'] } },
				routing: { send: { type: 'body', property: 'reason' } },
			},
			{
				displayName: 'Cancel the Whole Invoice',
				name: 'full',
				type: 'boolean',
				default: false,
				description:
					'Whether to reverse the invoice entirely. We compute its open balance, so earlier partial refunds are never credited twice. Leave off to itemise below.',
				displayOptions: { show: { resource: ['note'] } },
				routing: { send: { type: 'body', property: 'full' } },
			},
			{
				displayName: 'Lines',
				name: 'lines',
				placeholder: 'Add line',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				displayOptions: { show: { resource: ['note'], full: [false] } },
				options: [
					{
						name: 'line',
						displayName: 'Line',
						values: [
							{ displayName: 'Name', name: 'name', type: 'string', default: '' },
							{ displayName: 'Quantity', name: 'quantity', type: 'number', default: 1 },
							{ displayName: 'Unit Price', name: 'unit_price', type: 'number', default: 0 },
						],
					},
				],
				routing: { send: { type: 'body', property: 'lines', value: '={{$value.line}}' } },
			},
			{
				displayName: 'External ID',
				name: 'external_id',
				type: 'string',
				default: '',
				description: 'Your own ID for this adjustment, so a retry never issues it twice',
				displayOptions: { show: { resource: ['note'] } },
				routing: { send: { type: 'body', property: 'external_id' } },
			},

			/* ------------------------------------------------------ account */
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						action: 'Get the establishment and remaining quota',
						routing: { request: { method: 'GET', url: '/account' } },
					},
				],
				default: 'get',
			},
		],
	};
}
