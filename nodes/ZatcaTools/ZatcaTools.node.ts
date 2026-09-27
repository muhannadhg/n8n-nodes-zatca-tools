import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

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
		icon: { light: 'file:zatcatools.svg', dark: 'file:zatcatools.dark.svg' },
		group: ['output'],
		version: 1,
		// Exposed to AI agents as a tool: issuing an invoice is a well-defined
		// action with an idempotency key, so a retry cannot double-charge.
		usableAsTool: true,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Issue Saudi e-invoices, credit notes and debit notes',
		defaults: { name: 'ZATCA Tools' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
							{
						displayName: 'Exemption Reason',
						name: 'tax_reason_code',
						type: 'options',
						options: [
									{
										name: 'Exempt: Financial Services (VATEX-SA-29)',
										value: 'VATEX-SA-29',
									},
									{
										name: 'Exempt: Life Insurance (VATEX-SA-29-7)',
										value: 'VATEX-SA-29-7',
									},
									{
										name: 'Exempt: Real Estate Transactions (VATEX-SA-30)',
										value: 'VATEX-SA-30',
									},
									{
										name: 'None',
										value: '',
									},
									{
										name: 'Zero-Rated: Export of Goods (VATEX-SA-32)',
										value: 'VATEX-SA-32',
									},
									{
										name: 'Zero-Rated: Export of Services (VATEX-SA-33)',
										value: 'VATEX-SA-33',
									},
									{
										name: 'Zero-Rated: International Transport of Goods (VATEX-SA-34-1)',
										value: 'VATEX-SA-34-1',
									},
									{
										name: 'Zero-Rated: International Transport of Passengers (VATEX-SA-34-2)',
										value: 'VATEX-SA-34-2',
									},
									{
										name: 'Zero-Rated: Medicines and Medical Equipment (VATEX-SA-35)',
										value: 'VATEX-SA-35',
									},
									{
										name: 'Zero-Rated: Private Education to Citizen (VATEX-SA-EDU)',
										value: 'VATEX-SA-EDU',
									},
									{
										name: 'Zero-Rated: Private Healthcare to Citizen (VATEX-SA-HEA)',
										value: 'VATEX-SA-HEA',
									},
									{
										name: 'Zero-Rated: Qualifying Metals (VATEX-SA-36)',
										value: 'VATEX-SA-36',
									},
									{
										name: 'Zero-Rated: Services Connected to International Passenger Transport (VATEX-SA-34-3)',
										value: 'VATEX-SA-34-3',
									},
									{
										name: 'Zero-Rated: Services Relating to Goods or Passenger Transportation (VATEX-SA-34-5)',
										value: 'VATEX-SA-34-5',
									},
									{
										name: 'Zero-Rated: Supply of a Qualifying Means of Transport (VATEX-SA-34-4)',
										value: 'VATEX-SA-34-4',
									},
								],
						default: '',
						description: 'Optional, for a Zero-Rated or Exempt line, and it must belong to that treatment. Left empty, the line takes the reason the other lines of its treatment name on this invoice, else the one this establishment used last, else none (ZATCA accepts with a warning). Out of Scope always carries VATEX-SA-OOS.',
							},
							{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
							},
							{
						displayName: 'Quantity',
						name: 'quantity',
						type: 'number',
						default: 1
							},
							{
						displayName: 'Unit Price',
						name: 'unit_price',
						type: 'number',
						default: 0,
						description: 'Net of VAT, and the 15 percent is added for you. Turn on Prices Include VAT under Additional Fields to send what the customer pays.',
							},
							{
						displayName: 'VAT Treatment',
						name: 'tax_category',
						type: 'options',
						options: [
									{
										name: 'Establishment Default',
										value: '',
									},
									{
										name: 'Exempt',
										value: 'E',
									},
									{
										name: 'Out of Scope',
										value: 'O',
									},
									{
										name: 'Standard Rate (15%)',
										value: 'S',
									},
									{
										name: 'Zero-Rated (0%)',
										value: 'Z',
									},
					],
						default: '',
						description: 'How ZATCA treats this line. Lines of one invoice may differ, such as a taxed service beside a tip that is out of scope.',
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
							'4 letters + 4 digits. The street, building number, city and postal code a tax invoice needs are resolved from it.',
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
					{
						displayName: 'Prices Include VAT',
						name: 'prices_include_vat',
						type: 'boolean',
						default: false,
						description:
							'Whether the unit prices (and the discount) are what the customer pays, VAT included — each line’s VAT is then taken out at its own rate',
						routing: { send: { type: 'body', property: 'prices_include_vat' } },
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
