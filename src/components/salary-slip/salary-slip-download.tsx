"use client";

import { useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Download } from "lucide-react";
import { SalarySlip, type SalarySlipData } from "./salary-slip";
import { numberToWords } from "@/lib/number-to-words";

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

function formatRupee(n: number): string {
	return `Rs. ${n.toLocaleString("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

/** Fetch logo from URL and return as base64 data URL, or null on failure */
async function fetchLogoAsDataUrl(logoUrl: string): Promise<string | null> {
	try {
		const url = logoUrl.startsWith("http")
			? logoUrl
			: `${
					typeof window !== "undefined" ? window.location.origin : ""
			  }${logoUrl}`;
		const res = await fetch(url);
		if (!res.ok) return null;
		const blob = await res.blob();
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result as string);
			reader.onerror = () => resolve(null);
			reader.readAsDataURL(blob);
		});
	} catch {
		return null;
	}
}

/** Get image dimensions from data URL (preserves aspect ratio when drawing in PDF) */
function getImageDimensions(
	dataUrl: string
): Promise<{ width: number; height: number }> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () =>
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
		img.onerror = () => reject(new Error("Failed to load image"));
		img.src = dataUrl;
	});
}

const MARGIN = 10;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CONTENT_LEFT = MARGIN;

const MAX_LOGO_W_MM = 28;
const MAX_LOGO_H_MM = 14;

/** Build PDF from data using jsPDF (logo as base64 image; text/draw only for rest to avoid lab color) */
function buildPdf(
	data: SalarySlipData,
	logoDataUrl: string | null,
	logoImgWidth?: number,
	logoImgHeight?: number
): jsPDF {
	const pdf = new jsPDF({ unit: "mm", format: "a4" });
	const company = data.company ?? { name: "Company Name", address: [] };
	const monthName = MONTHS[data.month - 1] ?? "N/A";
	const totalEarningsFull = data.earnings.reduce((s, e) => s + e.full, 0);
	const totalEarningsActual = data.earnings.reduce((s, e) => s + e.actual, 0);
	const totalLOP = data.earnings.reduce((s, e) => s + (e.lop ?? 0), 0);
	const amountInWords = numberToWords(data.netPay);

	pdf.setDrawColor(0, 0, 0);
	pdf.setTextColor(0, 0, 0);
	pdf.setFillColor(255, 255, 255);

	let y = MARGIN + 4;
	const lineH = 6;
	const small = 9;
	const normal = 11;
	const title = 14;

	// Logo (top center) — preserve aspect ratio like preview (max 28×14 mm)
	if (logoDataUrl) {
		let logoW = MAX_LOGO_W_MM;
		let logoH = MAX_LOGO_H_MM;
		if (
			logoImgWidth != null &&
			logoImgHeight != null &&
			logoImgWidth > 0 &&
			logoImgHeight > 0
		) {
			// Fit within max box, keep aspect ratio
			logoW = Math.min(
				MAX_LOGO_W_MM,
				(logoImgWidth * MAX_LOGO_H_MM) / logoImgHeight
			);
			logoH = Math.min(
				MAX_LOGO_H_MM,
				(logoImgHeight * MAX_LOGO_W_MM) / logoImgWidth
			);
		}
		const logoX = (PAGE_W - logoW) / 2;
		const logoFormat = logoDataUrl.startsWith("data:image/jpeg")
			? "JPEG"
			: "PNG";
		pdf.addImage(logoDataUrl, logoFormat, logoX, y, logoW, logoH);
		y += logoH + 4;
	}

	pdf.setFontSize(title);
	pdf.setFont("helvetica", "bold");
	pdf.text(company.name, PAGE_W / 2, y, { align: "center" });
	y += lineH;
	pdf.setFont("helvetica", "normal");
	pdf.setFontSize(small);
	(company.address ?? []).forEach((line) => {
		pdf.text(line, PAGE_W / 2, y, { align: "center" });
		y += lineH - 1;
	});
	y += 6;

	// Outer border around entire slip
	pdf.rect(MARGIN, MARGIN, CONTENT_W, PAGE_H - MARGIN * 2);

	// Payslip title
	pdf.setFontSize(normal);
	pdf.setFont("helvetica", "bold");
	pdf.text(
		`Payslip for the month of ${monthName} ${data.year}`,
		CONTENT_LEFT + 4,
		y
	);
	y += lineH + 4;

	// Two columns: Employee (left), Bank (right)
	const leftX = CONTENT_LEFT + 4;
	const rightX = CONTENT_LEFT + CONTENT_W / 2 + 4;

	pdf.setFont("helvetica", "normal");
	pdf.setFontSize(small);

	// Left column — Employee details
	let yLeft = y;
	pdf.text(`Name: ${data.employee.name}`, leftX, yLeft);
	yLeft += lineH;
	if (data.employee.dateOfJoining != null) {
		pdf.text(
			`Date of joining: ${data.employee.dateOfJoining}`,
			leftX,
			yLeft
		);
		yLeft += lineH;
	}
	if (data.employee.department != null) {
		pdf.text(`Department: ${data.employee.department}`, leftX, yLeft);
		yLeft += lineH;
	}
	if (data.employee.address) {
		pdf.text(`Address: ${data.employee.address}`, leftX, yLeft);
		yLeft += lineH;
	}

	// Right column — Bank details
	let yRight = y;
	if (data.bank) {
		if (data.bank.bankName) {
			pdf.text(`Bank Name: ${data.bank.bankName}`, rightX, yRight);
			yRight += lineH;
		}
		if (data.bank.accountNo) {
			pdf.text(`Bank Account No: ${data.bank.accountNo}`, rightX, yRight);
			yRight += lineH;
		}
		if (data.bank.panNo) {
			pdf.text(`PAN No: ${data.bank.panNo}`, rightX, yRight);
			yRight += lineH;
		}
	}

	y = Math.max(yLeft, yRight) + 6;

	// Earnings table with border
	const col1 = CONTENT_LEFT + 4;
	const col2 = 92;
	const col3 = 122;
	const col4 = 152;
	const tableRight = 196;
	const earningsStartY = y;

	pdf.setFont("helvetica", "bold");
	pdf.setFontSize(small);
	pdf.text("Earnings", col1, y);
	pdf.text("Full", col2, y);
	pdf.text("Actual", col3, y);
	pdf.text("LOP", col4, y);
	y += lineH;
	pdf.setFont("helvetica", "normal");
	data.earnings.forEach((e) => {
		pdf.text(e.component, col1, y);
		pdf.text(formatRupee(e.full), col2, y);
		pdf.text(formatRupee(e.actual), col3, y);
		pdf.text(e.lop != null ? formatRupee(e.lop) : "-", col4, y);
		y += lineH;
	});
	pdf.setFont("helvetica", "bold");
	pdf.text("Total Earnings", col1, y);
	pdf.text(formatRupee(totalEarningsFull), col2, y);
	pdf.text(formatRupee(totalEarningsActual), col3, y);
	pdf.text(totalLOP > 0 ? formatRupee(totalLOP) : "-", col4, y);
	y += lineH;
	const earningsEndY = y;
	pdf.rect(
		col1 - 2,
		earningsStartY - 4,
		tableRight - col1 + 4,
		earningsEndY - earningsStartY + 2
	);
	y += 4;

	// Deductions table with border
	const dedStartY = y;
	pdf.setFont("helvetica", "bold");
	pdf.text("Deductions", col1, y);
	pdf.text("Actual", col3, y);
	y += lineH;
	pdf.setFont("helvetica", "normal");
	(data.deductions ?? []).forEach((d) => {
		pdf.text(d.component, col1, y);
		pdf.text(formatRupee(d.amount), col3, y);
		y += lineH;
	});
	pdf.setFont("helvetica", "bold");
	pdf.text("Total Deductions", col1, y);
	pdf.text(formatRupee(data.totalDeductions), col3, y);
	y += lineH;
	const dedEndY = y;
	pdf.rect(
		col1 - 2,
		dedStartY - 4,
		tableRight - col1 + 4,
		dedEndY - dedStartY + 2
	);
	y += 4;

	pdf.setFont("helvetica", "normal");
	pdf.text(
		"Net Pay for the month (Total Earnings - Total Deductions):",
		col1,
		y
	);
	y += lineH;
	pdf.setFont("helvetica", "bold");
	pdf.setFontSize(normal);
	pdf.text(formatRupee(data.netPay), col1, y);
	y += lineH;
	pdf.setFont("helvetica", "normal");
	pdf.setFontSize(small);
	pdf.text(`(In rupees in words: ${amountInWords})`, col1, y);

	return pdf;
}

interface SalarySlipDownloadProps {
	data: SalarySlipData;
	filename?: string;
	trigger?: React.ReactNode;
}

export function SalarySlipDownload({
	data,
	filename,
	trigger,
}: SalarySlipDownloadProps) {
	const slipRef = useRef<HTMLDivElement>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);

	const defaultFilename = `Payslip_${data.employee.name.replace(
		/\s+/g,
		"_"
	)}_${MONTHS[data.month - 1]}_${data.year}.pdf`;

	const handleDownload = async () => {
		setIsDownloading(true);
		try {
			const logoUrl = data.company?.logoUrl ?? "/paysliplogo.png";
			const logoDataUrl = await fetchLogoAsDataUrl(logoUrl);
			let logoW: number | undefined;
			let logoH: number | undefined;
			if (logoDataUrl) {
				try {
					const dim = await getImageDimensions(logoDataUrl);
					logoW = dim.width;
					logoH = dim.height;
				} catch {
					// use default box if dimensions fail
				}
			}
			const pdf = buildPdf(data, logoDataUrl, logoW, logoH);
			pdf.save(filename ?? defaultFilename);
		} catch (err) {
			console.error("PDF generation failed:", err);
		} finally {
			setIsDownloading(false);
		}
	};

	return (
		<>
			{trigger ? (
				<div onClick={() => setIsOpen(true)}>{trigger}</div>
			) : (
				<Button
					variant='outline'
					size='sm'
					onClick={() => setIsOpen(true)}>
					<Download className='mr-2 h-4 w-4' />
					Download Slip
				</Button>
			)}
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className='max-w-[640px] max-h-[90vh] overflow-auto p-0'>
					<DialogHeader className='p-6 pb-0'>
						<DialogTitle>Salary Slip</DialogTitle>
					</DialogHeader>
					<div className='p-6 pt-4'>
						<div
							style={{
								backgroundColor: "#f3f4f6",
								borderRadius: "8px",
								overflow: "hidden",
							}}>
							<SalarySlip ref={slipRef} data={data} />
						</div>
						<div className='flex justify-end mt-4'>
							<Button
								onClick={handleDownload}
								disabled={isDownloading}>
								{isDownloading ? (
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								) : (
									<Download className='mr-2 h-4 w-4' />
								)}
								Download PDF
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
