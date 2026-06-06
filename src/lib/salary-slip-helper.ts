import type { Employee, FinanceRecord } from "./types";
import { companyConfig } from "./constant";
import type { SalarySlipData } from "@/components/salary-slip/salary-slip";

export function getSalarySlipData(
	employee: Employee,
	month: number,
	year: number,
	allFinanceRecords: FinanceRecord[]
): SalarySlipData {
	// Filter finance records for this employee, month, and year
	const periodRecords = allFinanceRecords.filter(
		(r) =>
			r.employee_id === employee.id &&
			r.month === month &&
			r.year === year
	);

	const salary = periodRecords
		.filter((r) => r.type === "salary")
		.reduce((sum, r) => sum + Number(r.amount), 0);
	const bonus = periodRecords
		.filter((r) => r.type === "bonus")
		.reduce((sum, r) => sum + Number(r.amount), 0);
	const reimbursement = periodRecords
		.filter((r) => r.type === "reimbursement")
		.reduce((sum, r) => sum + Number(r.amount), 0);
	const deduction = periodRecords
		.filter((r) => r.type === "deduction")
		.reduce((sum, r) => sum + Number(r.amount), 0);

	const deductions = periodRecords
		.filter((r) => r.type === "deduction" && Number(r.amount) > 0)
		.map((r) => ({
			component: r.description || "Deduction",
			amount: Number(r.amount),
		}));

	const earnings = [
		...(salary > 0
			? [
					{
						component: "Basic",
						full: salary,
						actual: salary,
					},
			  ]
			: []),
		...(bonus > 0
			? [
					{
						component: "Special Allowance",
						full: bonus,
						actual: bonus,
					},
			  ]
			: []),
		...(reimbursement > 0
			? [
					{
						component: "Reimbursement",
						full: reimbursement,
						actual: reimbursement,
					},
			  ]
			: []),
	];

	return {
		company: {
			name: companyConfig.name,
			logoUrl: companyConfig.logoUrl,
			address: companyConfig.address,
		},
		employee: {
			name: `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim(),
			dateOfJoining: employee.joining_date
				? new Date(employee.joining_date).toLocaleDateString("en-IN", {
						day: "numeric",
						month: "long",
						year: "numeric",
				  })
				: undefined,
			department: employee.designation ?? undefined,
			address: employee.address ?? undefined,
		},
		month,
		year,
		bank: {
			bankName: employee.bank_name ?? undefined,
			accountNo: employee.bank_account_number ?? undefined,
			panNo: employee.pan_number ?? undefined,
		},
		earnings: earnings.length > 0 ? earnings : [{ component: "Basic", full: 0, actual: 0 }],
		deductions,
		totalDeductions: deduction,
		netPay: salary + bonus - deduction + reimbursement,
	};
}
