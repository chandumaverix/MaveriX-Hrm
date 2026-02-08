export const MAX_CLOCKING_TIME = "11:00 AM"; // If User clock in after this time, he will be marked as late.
export const MAX_LATE_DAYS = 3; // If User is late for more than 3 days in a month, so after that every day .5 casual leave will be deducted from his leaves.
export const AUTO_CLOCK_OUT_TIME = "7:30 PM"; // Auto clock out all user after this time.

// Company info for salary slips and other documents.
export const companyConfig = {
	name: "Mavericks and Musers Media Pvt. Ltd.",
	logoUrl: "/paysliplogo.png",
	address: [
		"79A, B Block Shyam Nagar",
		"Near Brahmakumaris center Sujatganj",
		"Kanpur, Uttar Pradesh, India",
	],
};
