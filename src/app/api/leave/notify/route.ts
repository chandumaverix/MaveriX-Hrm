import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import nodemailer from "nodemailer";
import {
	newRequestSubject,
	newRequestBody,
	statusUpdateSubject,
	statusUpdateBody,
} from "@/lib/leave-email";

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

type NewRequestPayload = {
	type: "new_request";
	employeeName: string;
	employeeEmail: string;
	leaveTypeName: string;
	startDate: string;
	endDate: string;
	reason: string;
	halfDay?: boolean | null;
};

type StatusUpdatePayload = {
	type: "status_update";
	employeeEmail: string;
	employeeName: string;
	leaveTypeName: string;
	startDate: string;
	endDate: string;
	status: "approved" | "rejected";
};

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as
			| NewRequestPayload
			| StatusUpdatePayload;
		if (!body?.type) {
			return NextResponse.json(
				{ error: "Missing type" },
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

		if (body.type === "new_request") {
			const {
				employeeName,
				employeeEmail,
				leaveTypeName,
				startDate,
				endDate,
				reason,
				halfDay,
			} = body;
			const supabase = await createClient();
			const { data: admins } = await supabase
				.from("employees")
				.select("email")
				.eq("is_active", true)
				.in("role", ["admin", "hr"]);
			const to = (admins ?? [])
				.map((r) => r.email)
				.filter(Boolean) as string[];
			if (to.length === 0) {
				return NextResponse.json({
					ok: true,
					skipped: "No admin/HR emails",
				});
			}
			await transport.sendMail({
				from: from(),
				to,
				subject: newRequestSubject(employeeName),
				html: newRequestBody({
					employeeName,
					employeeEmail,
					leaveTypeName,
					startDate,
					endDate,
					reason: reason ?? "",
					halfDay,
				}),
			});
			return NextResponse.json({ ok: true });
		}

		if (body.type === "status_update") {
			const {
				employeeEmail,
				employeeName,
				leaveTypeName,
				startDate,
				endDate,
				status,
			} = body;
			if (!employeeEmail) {
				return NextResponse.json(
					{ error: "Missing employeeEmail" },
					{ status: 400 }
				);
			}
			await transport.sendMail({
				from: from(),
				to: employeeEmail,
				subject: statusUpdateSubject(status),
				html: statusUpdateBody({
					employeeName,
					leaveTypeName,
					startDate,
					endDate,
					status,
				}),
			});
			return NextResponse.json({ ok: true });
		}

		return NextResponse.json({ error: "Unknown type" }, { status: 400 });
	} catch (e) {
		return NextResponse.json(
			{ error: e instanceof Error ? e.message : "Send failed" },
			{ status: 500 }
		);
	}
}
