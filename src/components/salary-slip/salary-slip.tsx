"use client";

import { forwardRef } from "react";
import { numberToWords } from "@/lib/number-to-words";

export interface SalarySlipCompany {
	name: string;
	logoUrl?: string;
	address?: string[];
}

export interface SalarySlipEmployee {
	name: string;
	dateOfJoining?: string;
	department?: string;
	/** Employee residential address (from employee table), not bank address */
	address?: string;
	location?: string;
}

export interface SalarySlipWorkDays {
	effective?: number;
	daysInMonth?: number;
}

export interface SalarySlipBank {
	bankName?: string;
	accountNo?: string;
	pfNo?: string;
	pfUan?: string;
	esiNo?: string;
	panNo?: string;
}

export interface SalarySlipEarning {
	component: string;
	full: number;
	actual: number;
	lop?: number;
}

export interface SalarySlipDeduction {
	component: string;
	amount: number;
}

export interface SalarySlipData {
	company?: SalarySlipCompany;
	employee: SalarySlipEmployee;
	month: number;
	year: number;
	workDays?: SalarySlipWorkDays;
	bank?: SalarySlipBank;
	earnings: SalarySlipEarning[];
	deductions?: SalarySlipDeduction[];
	totalDeductions: number;
	netPay: number;
}

const defaultCompany: SalarySlipCompany = {
	name: "Company Name",
	address: ["Address Line 1", "Address Line 2", "City, State"],
};

function formatRupee(n: number): string {
	return `Rs. ${n.toLocaleString("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

export const SalarySlip = forwardRef<HTMLDivElement, { data: SalarySlipData }>(
	function SalarySlip({ data }, ref) {
		const company = data.company ?? defaultCompany;
		const monthName = MONTHS[data.month - 1] ?? "N/A";
		const totalEarningsFull = data.earnings.reduce((s, e) => s + e.full, 0);
		const totalEarningsActual = data.earnings.reduce(
			(s, e) => s + e.actual,
			0
		);
		const totalLOP = data.earnings.reduce((s, e) => s + (e.lop ?? 0), 0);
		const amountInWords = numberToWords(data.netPay);

		return (
			<div
				ref={ref}
				style={{
					backgroundColor: "#ffffff",
					color: "#000000",
					padding: "24px",
					maxWidth: "595px",
					margin: "0 auto",
					fontFamily: "sans-serif",
					fontSize: "12px",
					lineHeight: 1.4,
				}}>
				{/* Logo and company name - centered */}
				<div style={{ textAlign: "center", marginBottom: "16px" }}>
					{company.logoUrl && (
						<img
							src={company.logoUrl}
							alt='Company logo'
							style={{
								maxHeight: "30px",
								maxWidth: "140px",
								width: "auto",
								height: "auto",
								objectFit: "contain",
								margin: "5px auto",
								display: "block",
							}}
						/>
					)}
					<p
						style={{
							fontWeight: 700,
							fontSize: "16px",
							margin: "0 0 4px 0",
						}}>
						{company.name}
					</p>
					{company.address?.map((line, i) => (
						<p key={i} style={{ margin: "0", fontSize: "11px" }}>
							{line}
						</p>
					))}
				</div>

				{/* Title */}
				<p
					style={{
						fontWeight: 700,
						fontSize: "14px",
						margin: "0 0 16px 0",
					}}>
					Payslip for the month of {monthName} {data.year}
				</p>

				{/* Employee details (left) | Bank details (right) */}
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: "24px",
						marginBottom: "16px",
						alignItems: "start",
					}}>
					<div>
						<p style={{ margin: "0 0 4px 0" }}>
							Name: {data.employee.name}
						</p>
						{data.employee.dateOfJoining != null && (
							<p style={{ margin: "0 0 4px 0" }}>
								Date of joining: {data.employee.dateOfJoining}
							</p>
						)}
						{data.employee.department != null && (
							<p style={{ margin: "0 0 4px 0" }}>
								Department: {data.employee.department}
							</p>
						)}
						{data.employee.address != null &&
							data.employee.address !== "" && (
								<p style={{ margin: "0 0 4px 0" }}>
									Address: {data.employee.address}
								</p>
							)}
						{data.workDays?.effective != null && (
							<p style={{ margin: "0 0 4px 0" }}>
								Effective work days: {data.workDays.effective}
							</p>
						)}
						{data.workDays?.daysInMonth != null && (
							<p style={{ margin: "0 0 4px 0" }}>
								Days in month: {data.workDays.daysInMonth}
							</p>
						)}
					</div>
					{data.bank && (
						<div>
							{data.bank.bankName != null && (
								<p style={{ margin: "0 0 4px 0" }}>
									Bank Name: {data.bank.bankName}
								</p>
							)}
							{data.bank.accountNo != null && (
								<p style={{ margin: "0 0 4px 0" }}>
									Bank Account No: {data.bank.accountNo}
								</p>
							)}
							{data.bank.pfNo != null && (
								<p style={{ margin: "0 0 4px 0" }}>
									PF No: {data.bank.pfNo}
								</p>
							)}
							{data.bank.pfUan != null && (
								<p style={{ margin: "0 0 4px 0" }}>
									PF UAN: {data.bank.pfUan}
								</p>
							)}
							{data.bank.esiNo != null && (
								<p style={{ margin: "0 0 4px 0" }}>
									ESI No: {data.bank.esiNo}
								</p>
							)}
							{data.bank.panNo != null && (
								<p style={{ margin: "0 0 4px 0" }}>
									PAN No: {data.bank.panNo}
								</p>
							)}
						</div>
					)}
				</div>

				{/* Earnings table */}
				<div style={{ marginBottom: "16px" }}>
					<table
						style={{
							width: "100%",
							borderCollapse: "collapse",
							fontSize: "11px",
						}}>
						<thead>
							<tr style={{ borderBottom: "1px solid #000000" }}>
								<th
									style={{
										textAlign: "left",
										padding: "4px 8px 4px 0",
									}}>
									Earnings
								</th>
								<th
									style={{
										textAlign: "right",
										padding: "4px 8px",
									}}>
									Full
								</th>
								<th
									style={{
										textAlign: "right",
										padding: "4px 8px",
									}}>
									Actual
								</th>
								<th
									style={{
										textAlign: "right",
										padding: "4px 8px",
									}}>
									LOP
								</th>
							</tr>
						</thead>
						<tbody>
							{data.earnings.map((e, i) => (
								<tr
									key={i}
									style={{
										borderBottom: "1px solid #d1d5db",
									}}>
									<td style={{ padding: "4px 8px 4px 0" }}>
										{e.component}
									</td>
									<td
										style={{
											textAlign: "right",
											padding: "4px 8px",
										}}>
										{formatRupee(e.full)}
									</td>
									<td
										style={{
											textAlign: "right",
											padding: "4px 8px",
										}}>
										{formatRupee(e.actual)}
									</td>
									<td
										style={{
											textAlign: "right",
											padding: "4px 8px",
										}}>
										{e.lop != null
											? formatRupee(e.lop)
											: "-"}
									</td>
								</tr>
							))}
							<tr
								style={{
									borderBottom: "2px solid #000000",
									fontWeight: 600,
								}}>
								<td style={{ padding: "4px 8px 4px 0" }}>
									Total Earnings
								</td>
								<td
									style={{
										textAlign: "right",
										padding: "4px 8px",
									}}>
									{formatRupee(totalEarningsFull)}
								</td>
								<td
									style={{
										textAlign: "right",
										padding: "4px 8px",
									}}>
									{formatRupee(totalEarningsActual)}
								</td>
								<td
									style={{
										textAlign: "right",
										padding: "4px 8px",
									}}>
									{totalLOP > 0 ? formatRupee(totalLOP) : "-"}
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				{/* Deductions */}
				<div style={{ marginBottom: "16px" }}>
					<table
						style={{
							width: "100%",
							borderCollapse: "collapse",
							fontSize: "11px",
						}}>
						<thead>
							<tr style={{ borderBottom: "1px solid #000000" }}>
								<th
									style={{
										textAlign: "left",
										padding: "4px 8px 4px 0",
									}}>
									Deductions
								</th>
								<th
									style={{
										textAlign: "right",
										padding: "4px 8px",
									}}>
									Actual
								</th>
							</tr>
						</thead>
						<tbody>
							{data.deductions?.map((d, i) => (
								<tr
									key={i}
									style={{
										borderBottom: "1px solid #d1d5db",
									}}>
									<td style={{ padding: "4px 8px 4px 0" }}>
										{d.component}
									</td>
									<td
										style={{
											textAlign: "right",
											padding: "4px 8px",
										}}>
										{formatRupee(d.amount)}
									</td>
								</tr>
							))}
							<tr
								style={{
									borderBottom: "2px solid #000000",
									fontWeight: 600,
								}}>
								<td style={{ padding: "4px 8px 4px 0" }}>
									Total Deductions
								</td>
								<td
									style={{
										textAlign: "right",
										padding: "4px 8px",
									}}>
									{formatRupee(data.totalDeductions)}
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				{/* Net Pay */}
				<div style={{ marginTop: "16px" }}>
					<p style={{ margin: "0 0 4px 0" }}>
						Net Pay for the month (Total Earnings - Total
						Deductions):
					</p>
					<p
						style={{
							fontWeight: 700,
							fontSize: "14px",
							margin: "0 0 8px 0",
						}}>
						{formatRupee(data.netPay)}
					</p>
					<p
						style={{
							fontSize: "11px",
							fontStyle: "italic",
							margin: 0,
						}}>
						(In rupees in words: {amountInWords})
					</p>
				</div>
			</div>
		);
	}
);
