import {
	amountField,
	dateField,
	gstNumberField,
	masterField,
	percentField,
	textField,
} from "./fieldSpec.js";

const instructions = `You read general insurance (GI) policy documents (motor, health, fire, travel and similar) for an insurance back-office system, and pick out the details needed to record the policy.
The document may be a policy schedule, a certificate, or a cover letter with the schedule attached. The insurer is the company that issued the policy, not the broker or agent named in it.
The client is the policyholder (proposer / insured).
GST is the total tax charged: add CGST, SGST/UTGST and IGST together. A document that shows these as zero gives 0.
Premium: "netPremium" is the premium before GST. Motor policies split it into own-damage and third-party premium; when the document does not split it, give only "netPremium".`;

const fields = [
	textField("policyNo", "Policy number", 60),
	textField("clientName", "Full name of the policyholder / proposer, without a title such as Mr or Mrs", 120),
	textField(
		"insurerAddress",
		"Full address of the insurer's office that issued or services the policy, as printed (look for \"Issuing Office Address\", \"Servicing Office\" or \"Branch Address\"). Not the registered or head office. null when the document gives no such address",
		250,
	),
	dateField(
		"policyDate",
		"Date the policy was issued. When no issue date is printed, use the date the policy period starts",
	),
	masterField("insurer", "Insurance company that issued the policy"),
	masterField("businessType", "Type of business, such as new or renewal, when the document says so"),
	masterField("lob", "Line of business, such as motor or health, that matches the policy"),
	textField("productType", "Name of the plan / product, as printed on the policy", 100),
	gstNumberField("clientGst", "GSTIN of the client, when the client has one printed in the document"),
	textField("vehicleNo", "Vehicle registration number (motor policies only)", 20),
	textField("maker", "Vehicle manufacturer (motor policies only)", 60),
	textField("model", "Vehicle model and variant (motor policies only)", 60),
	dateField("mfgDate", "Vehicle manufacturing date (motor policies only); null when only a year is given"),
	percentField("ncb", "No Claim Bonus percentage (motor policies only)"),
	dateField("policyPeriodFrom", "First day of the policy period"),
	dateField("policyPeriodTo", "Last day of the policy period"),
	amountField("odPremium", "Own-damage premium before GST (motor policies only)"),
	amountField("thirdPartyCover", "Third-party liability premium before GST (motor policies only)"),
	amountField("netPremium", "Total premium before GST"),
	amountField("gst", "Total GST charged"),
];

// An unsplit premium (e.g. health) goes into own-damage, since the form sums own-damage + third-party.
const normalize = (values) => {
	const { odPremium, thirdPartyCover, netPremium } = values;
	if (odPremium === null && thirdPartyCover === null && netPremium !== null)
		return { ...values, odPremium: netPremium };
	return values;
};

export const giExtractor = { instructions, fields, normalize };
