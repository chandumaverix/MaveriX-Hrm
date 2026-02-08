/**
 * Leave notification email content. Used by the leave notify API route.
 */

export function newRequestSubject(employeeName: string): string {
	return `Leave request from ${employeeName}`;
}

export function newRequestBody(params: {
	employeeName: string;
	employeeEmail: string;
	leaveTypeName: string;
	startDate: string;
	endDate: string;
	reason: string;
	halfDay?: boolean | null;
}): string {
	const { employeeName, leaveTypeName, startDate, endDate, reason, halfDay } =
		params;
	const period = halfDay ? "Half day" : `${startDate} to ${endDate}`;
	return `
<p><strong>${employeeName}</strong> has submitted a leave request.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr><td style="padding: 6px 12px 6px 0; color: #666;">Leave type</td><td style="padding: 6px 0;"><strong>${leaveTypeName}</strong></td></tr>
  <tr><td style="padding: 6px 12px 6px 0; color: #666;">Period</td><td style="padding: 6px 0;">${period}</td></tr>
  <tr><td style="padding: 6px 12px 6px 0; color: #666;">Reason</td><td style="padding: 6px 0;">${
		reason || "—"
  }</td></tr>
</table>
<p style="color: #666; font-size: 14px;">Please review in the Leave management section.</p>
`.trim();
}

export function statusUpdateSubject(status: "approved" | "rejected"): string {
	return `Leave request ${status}`;
}

export function statusUpdateBody(params: {
	employeeName: string;
	leaveTypeName: string;
	startDate: string;
	endDate: string;
	status: "approved" | "rejected";
}): string {
	const { employeeName, leaveTypeName, startDate, endDate, status } = params;
	const statusLabel = status === "approved" ? "Approved" : "Rejected";
	const statusColor = status === "approved" ? "#16a34a" : "#dc2626";
	return `
<p>Your leave request has been <strong style="color: ${statusColor}">${statusLabel}</strong>.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr><td style="padding: 6px 12px 6px 0; color: #666;">Leave type</td><td style="padding: 6px 0;">${leaveTypeName}</td></tr>
  <tr><td style="padding: 6px 12px 6px 0; color: #666;">Period</td><td style="padding: 6px 0;">${startDate} to ${endDate}</td></tr>
</table>
<p style="color: #666; font-size: 14px;">You can view the details in your Leave requests.</p>
`.trim();
}
