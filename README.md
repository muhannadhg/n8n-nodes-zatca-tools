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

1. Create a free account at [zatcatools.com](https://zatcatools.com/start?utm_source=github&utm_medium=readme&utm_campaign=n8n) and connect it to ZATCA (or start in trial mode).
2. Settings → API → copy the key (`ztk_live_…`).
3. In n8n, add a **ZATCA Tools API** credential and paste it.

The credential test calls `GET /account`, so a wrong key fails immediately rather than at the first invoice.

## Common questions

**Do I need ZATCA credentials to try this?** No. A free ZATCA Tools account has a trial mode that onboards against ZATCA's own developer sandbox (test VAT `399999999900003`, fixed OTP `123345`), so the node issues real signed, reported test invoices before you touch production. How the sandbox works: [sandbox quickstart](https://github.com/muhannadhg/zatca-tools-examples/blob/main/docs/zatca-sandbox-quickstart.md).

**What does the node not do?** It never builds XML, signs, or talks to ZATCA itself — the service does (UBL 2.1, XAdES signature, ICV/PIH chain, TLV QR, reporting/clearance). Your workflow sends invoice JSON and gets back the status, QR, XML and PDF.

**Can one workflow invoice for several establishments?** One credential = one establishment (one certificate, one invoice chain). Use one credential per establishment, or the [Partner API](https://zatcatools.com/docs/partner-api?utm_source=github&utm_medium=readme&utm_campaign=n8n) if you run a platform that invoices on behalf of many merchants.

**An invoice came back rejected — where do I look?** The response carries the ZATCA rule code (`BR-KSA-…`). One-line fixes for the common ones: [rejection codes cheat sheet](https://github.com/muhannadhg/zatca-tools-examples/blob/main/docs/zatca-error-codes-cheatsheet.md).

## VAT per line (1.1.0)

Each invoice line can carry its own **VAT Treatment**: Standard Rate (15%), Zero-Rated (0%), Exempt or Out of Scope. Left on *Establishment Default*, it takes your establishment's own treatment, as every line did before 1.1.0. A zero-rated or exempt line may name its **Exemption Reason** (ZATCA's `VATEX-SA-…` list). The reason is optional: left empty, the line takes the reason its sibling lines name, else the one your establishment used last, else none, which ZATCA accepts with a warning. One invoice can mix treatments, for example a taxed haircut beside a tip that is out of scope.

Turn on **Prices Include VAT** under Additional Fields to send what the customer pays. Each line's VAT is then taken out at its own rate.

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
