import { FREQUENCIES } from "../../constants/transactions.js";
import {
	amountField,
	choiceField,
	dateField,
	masterField,
	textField,
	yearsField,
} from "./fieldSpec.js";
const instructions = `You read life insurance (LI) policy documents for an insurance back-office system, and pick out the details needed to record the policy.
The document may be a policy schedule, a welcome letter, or a premium receipt. The insurer is the company that issued the policy, not the agent or distributor named in it.
The client is the policyholder (proposer). The date of birth is the policyholder's, or the life assured's when the document gives only that one.
Terms are counted in whole years: "premium paying term" is how long premiums are paid, "policy term" is how long the cover lasts.
GST is the total tax charged on the premium: add CGST, SGST/UTGST and IGST together. Life policies often show no GST, which gives 0 only when the document states it.`;

const fields = [
	textField("policyNo", "Policy number", 60),
	textField("clientName", "Full name of the policyholder / proposer, without a title such as Mr or Mrs", 120),
	textField(
		"location",
		"District of the policyholder's address, without the street, village, pin code or state. When the address shows no district, use its city or town",
		100,
	),
	dateField(
		"policyDate",
		"Date the policy was issued. When no issue date is printed, use the date of commencement",
	),
	masterField("insurer", "Insurance company that issued the policy"),
	masterField("businessType", "Type of business, such as new or renewal, when the document says so"),
	masterField("lob", "Line of business that matches the policy"),
	masterField("productType", "Name of the plan / product that matches the policy"),
	dateField("dateOfBirth", "Date of birth of the policyholder"),
	dateField("commencementDate", "Date of commencement of the policy (risk commencement date)"),
	yearsField("paymentTermYears", "Premium paying term in years"),
	yearsField("policyTermYears", "Policy term in years"),
	choiceField("frequency", "How often the premium is paid", FREQUENCIES),
	dateField("nextDueDate", "Date the next premium falls due"),
	dateField("actualPaymentDate", "Date the premium was actually paid / received"),
	amountField(
		"premiumPerMonth",
		"Premium for one month before GST; give it only when the premium is paid monthly",
	),
	amountField("sumAssured", "Sum assured"),
	amountField("netPremium", "Premium before GST for the payment this document is about"),
	amountField("gst", "Total GST charged on that payment"),
];

export const liExtractor = { instructions, fields };
