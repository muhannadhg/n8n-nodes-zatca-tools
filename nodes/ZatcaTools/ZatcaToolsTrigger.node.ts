import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

/**
 * Fires when a document is issued.
 *
 * Polling, not webhooks: the trigger keeps the `created_at` of the newest
 * document it has seen and asks only for what came after it, so a one-minute
 * schedule costs one small query and nothing is ever replayed.
 *
 * The first run is deliberately silent — it records the watermark and emits
 * nothing. Without that, switching a workflow on would fire it once for every
 * invoice in the account's history: a year of documents re-sent to an
 * accountant, or worse, re-posted to whatever the workflow does next.
 */
export class ZatcaToolsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ZATCA Tools Trigger',
		name: 'zatcaToolsTrigger',
		icon: { light: 'file:zatcatools.png', dark: 'file:zatcatools.png' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts a workflow when an e-invoice or note is issued',
		defaults: { name: 'ZATCA Tools Trigger' },
		usableAsTool: true,
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'zatcaToolsApi', required: true }],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{ name: 'Invoice Issued', value: 'invoice' },
					{ name: 'Credit Note Issued', value: 'credit' },
					{ name: 'Debit Note Issued', value: 'debit' },
					{ name: 'Any Document Issued', value: 'all' },
				],
				default: 'invoice',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Any', value: '' },
					{ name: 'Accepted', value: 'accepted' },
					{ name: 'Accepted With Warnings', value: 'warnings' },
					{ name: 'Rejected', value: 'rejected' },
				],
				default: '',
				description: 'Rejected is the one worth alerting a human about',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const credentials = await this.getCredentials('zatcaToolsApi');
		const baseUrl = ((credentials.baseUrl as string) || 'https://zatcatools.com/api/v1').replace(
			/\/+$/,
			'',
		);

		const event = this.getNodeParameter('event') as string;
		const status = this.getNodeParameter('status') as string;

		const state = this.getWorkflowStaticData('node');
		const since = state.lastCreatedAt as string | undefined;

		const qs: IDataObject = { kind: event, per_page: 100 };
		if (status) qs.status = status;
		if (since) qs.since = since;

		let response: IDataObject;
		try {
			response = (await this.helpers.httpRequestWithAuthentication.call(this, 'zatcaToolsApi', {
				method: 'GET',
				url: `${baseUrl}/invoices`,
				qs,
				json: true,
			})) as IDataObject;
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}

		const documents = ((response.data as IDataObject[]) || []).slice();
		if (documents.length === 0) {
			return null;
		}

		// The API answers newest first; the newest is the next watermark.
		state.lastCreatedAt = (documents[0].created_at as string) ?? since;

		// First run: remember where we are, emit nothing.
		if (!since && !this.getMode().startsWith('manual')) {
			return null;
		}

		// Oldest first, so a workflow processes them in the order they happened.
		documents.reverse();

		return [this.helpers.returnJsonArray(documents)];
	}
}
