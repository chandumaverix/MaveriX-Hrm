/**
 * Converts a number to words for Indian rupees (e.g. 5806.45 -> "Five Thousand Eight Hundred Six Only")
 */
const ones = [
	"",
	"One",
	"Two",
	"Three",
	"Four",
	"Five",
	"Six",
	"Seven",
	"Eight",
	"Nine",
];
const tens = [
	"",
	"Ten",
	"Twenty",
	"Thirty",
	"Forty",
	"Fifty",
	"Sixty",
	"Seventy",
	"Eighty",
	"Ninety",
];
const teens = [
	"Ten",
	"Eleven",
	"Twelve",
	"Thirteen",
	"Fourteen",
	"Fifteen",
	"Sixteen",
	"Seventeen",
	"Eighteen",
	"Nineteen",
];

function convertHundreds(n: number): string {
	if (n === 0) return "";
	if (n < 10) return ones[n];
	if (n < 20) return teens[n - 10];
	if (n < 100) return `${tens[Math.floor(n / 10)]} ${ones[n % 10]}`.trim();
	return `${ones[Math.floor(n / 100)]} Hundred ${convertHundreds(
		n % 100
	)}`.trim();
}

export function numberToWords(num: number): string {
	if (num === 0) return "Zero Only";
	const intPart = Math.floor(num);
	if (intPart === 0) return "Zero Only";

	const lakh = Math.floor(intPart / 100000);
	const thousand = Math.floor((intPart % 100000) / 1000);
	const hundred = intPart % 1000;

	const parts: string[] = [];
	if (lakh > 0) parts.push(`${convertHundreds(lakh)} Lakh`);
	if (thousand > 0) parts.push(`${convertHundreds(thousand)} Thousand`);
	if (hundred > 0) parts.push(convertHundreds(hundred));

	return (parts.join(" ") + " Only").trim();
}
