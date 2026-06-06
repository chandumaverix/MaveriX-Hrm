import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { payslipSubject, payslipBody } from "@/lib/finance-email";

function getTransport() {
	const host = "smtp.gmail.com";
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;
	if (!host || !user || !pass) return null;
	const port = 587;
	return nodemailer.createTransport({
		host,
		port,
		secure: false,
		auth: { user, pass },
	});
}

const from = () => `Maverix <${process.env.EMAIL_FROM}>`;

export async function POST(request: Request) {
	try {
		const { employeeEmail, employeeName, monthName, year, pdfBase64 } = await request.json();

		if (!employeeEmail || !employeeName || !monthName || !year) {
			return NextResponse.json(
				{ error: "Missing required fields (employeeEmail, employeeName, monthName, year)" },
				{ status: 400 }
			);
		}

		const transport = getTransport();
		if (!transport) {
			return NextResponse.json({
				ok: true,
				skipped: "Email not configured",
			});
		}

		const attachments = [];
		if (pdfBase64) {
			const cleanBase64 = pdfBase64.includes("base64,")
				? pdfBase64.split("base64,")[1]
				: pdfBase64;
			attachments.push({
				filename: `Payslip_${employeeName.replace(/\s+/g, "_")}_${monthName}_${year}.pdf`,
				content: Buffer.from(cleanBase64, "base64"),
				contentType: "application/pdf",
			});
		}

		await transport.sendMail({
			from: from(),
			to: employeeEmail,
			subject: payslipSubject(monthName, year),
			html: payslipBody({ employeeName, monthName, year }),
			attachments,
		});

		return NextResponse.json({ ok: true });
	} catch (e) {
		return NextResponse.json(
			{ error: e instanceof Error ? e.message : "Send failed" },
			{ status: 500 }
		);
	}
}
