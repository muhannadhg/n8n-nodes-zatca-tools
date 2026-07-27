# n8n-nodes-zatca-tools

Issue **Saudi ZATCA Phase 2 e-invoices** from any n8n workflow — signed, QR-coded, and reported to the Zakat, Tax and Customs Authority.

[ZATCA Tools](https://zatcatools.com) is a Saudi e-invoicing service. This node talks to its REST API, so your workflow never handles certificates, XML signing or the Fatoora platform.

[Installation](#installation) · [Operations](#operations) · [Credentials](#credentials) · [Compatibility](#compatibility) · [Resources](#resources)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) and use the package name:

```
n8n-nodes-zatca-tools
```

## Operations

### ZATCA Tools

| Resource | Operation | What it does |
| --- | --- | --- |
| Invoice | Create | Builds, signs and reports a tax invoice. Simplified (B2C) or Standard (B2B). |
| Invoice | Get | One invoice by uuid, with its ZATCA status and links. |
| Invoice | Get Many | Newest first; filter by kind, status or `since`. |
| Invoice | Email | Sends the signed PDF to the buyer. |
| Note | Create | A credit note (reduce) or debit note (increase) against an issued invoice. |
| Account | Get | Your establishment and the invoices left in your quota. |

### ZATCA Tools Trigger

Fires when a document is issued — an invoice, a credit note, a debit note, or any of them. Poll-based, so no public webhook URL is needed.

The first run records where it is and emits nothing. Without that, switching a workflow on would fire it once for every invoice in your history.

## Credentials

1. Create a free account at [zatcatools.com](https://zatcatools.com) and connect it to ZATCA.
2. Settings → API → copy the key (`ztk_live_…`).
3. In n8n, add a **ZATCA Tools API** credential and paste it.

The credential test calls `GET /account`, so a wrong key fails immediately rather than at the first invoice.

## Two things worth knowing

**Set `External ID`.** It is your own id for the sale (`order-5501`). Send it again — after a retry, a duplicated run, a re-activated workflow — and you get the *same* invoice back instead of a second one. An e-invoice cannot be deleted once ZATCA has accepted it, so this is the difference between a mistake and a permanent one.

**Cancelling is a credit note, not a delete.** The `Cancel the Whole Invoice` toggle reverses an invoice for its open balance, computed on the server so an earlier partial refund is never credited twice. To put a cancelled sale back, issue a **debit note**.

## Compatibility

Tested against n8n 1.x with `n8n-workflow` 2.x. Requires Node 20.15+.

## Resources

* [ZATCA Tools API documentation](https://zatcatools.com/docs/api)
* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](LICENSE.md)
