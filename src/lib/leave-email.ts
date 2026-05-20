/**
 * Leave notification email content. Used by the leave notify API route.
 */

function emailLayout(title: string, content: string): string {
	return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #334155;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 32px 16px;
      box-sizing: border-box;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #f1f5f9;
      border-radius: 20px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.015);
      overflow: hidden;
    }
    .header {
      padding: 32px 32px 24px;
      border-bottom: 1px solid #f8fafc;
      text-align: center;
    }
    .logo-container {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .logo-text {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .logo-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #2563eb;
    }
    .content {
      padding: 32px;
      text-align: left;
    }
    .title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 18px;
      letter-spacing: -0.3px;
    }
    .card {
      background-color: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 16px;
      padding: 20px;
      margin: 24px 0;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
    }
    .table td {
      padding: 8px 0;
      font-size: 13px;
      vertical-align: top;
    }
    .table td.label {
      color: #64748b;
      width: 130px;
      font-weight: 750;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.8px;
    }
    .table td.val {
      color: #1e293b;
      font-weight: 700;
    }
    .footer {
      padding: 24px 32px 32px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #f8fafc;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid transparent;
    }
    .badge-deduction {
      background-color: #fef2f2;
      color: #ef4444;
      border-color: #fecaca;
    }
    .badge-approved {
      background-color: #f0fdf4;
      color: #16a34a;
      border-color: #bbf7d0;
    }
    .badge-rejected {
      background-color: #fef2f2;
      color: #dc2626;
      border-color: #fecaca;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-container">
          <span class="logo-text">MaveriX</span>
          <span class="logo-dot"></span>
        </div>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        This is an automated notification from MaveriX HRM.<br>Please do not reply directly to this message.
      </div>
    </div>
  </div>
</body>
</html>
	`.trim();
}

function calculateDays(startDate: string, endDate: string, halfDay?: boolean | null): number {
	if (halfDay) return 0.5;
	const start = new Date(startDate);
	const end = new Date(endDate);
	const diffTime = Math.abs(end.getTime() - start.getTime());
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

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
	const { employeeName, employeeEmail, leaveTypeName, startDate, endDate, reason, halfDay } = params;
	const period = halfDay ? "Half day" : `${startDate} to ${endDate}`;
	const daysCount = calculateDays(startDate, endDate, halfDay);
	const daysText = halfDay ? "0.5 Days (Half Day)" : `${daysCount} Day${daysCount !== 1 ? "s" : ""}`;

	const content = `
    <!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--<![endif]-->
  <title>New Leave Request Submitted</title>
  
  <style type="text/css">
    /* Outlook & Client Reset Rules */
    #outlook a { padding: 0; }
    .ReadMsgBody { width: 100%; }
    .ExternalClass { width: 100%; }
    .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { line-height: 100%; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    
    /* Core Base Resets */
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f8fafc !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    table {
      border-collapse: collapse !important;
    }
    a {
      text-decoration: none !important;
    }

    /* Mobile-responsive overrides */
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 16px 8px !important;
      }
      .email-content {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 8px !important;
      }
      .email-header {
        padding: 24px 20px 16px 20px !important;
      }
      .email-body {
        padding: 24px 20px !important;
      }
      .email-footer {
        padding: 0 20px 24px 20px !important;
      }
      .details-card {
        padding: 16px !important;
      }
      .label {
        width: 35% !important;
        font-size: 13px !important;
      }
      .val {
        font-size: 13px !important;
      }
      .logo {
        height: 32px !important;
        width: auto !important;
      }
      .title {
        font-size: 18px !important;
      }
      .cta-button {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box;
        text-align: center !important;
        padding: 14px 20px !important;
      }
    }
  </style>

  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Outer Wrapper Table for email backing -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #f8fafc; table-layout: fixed;">
    <tr>
      <td class="email-wrapper" align="center" style="padding: 40px 16px; background-color: #f8fafc;">
        
        <!-- Main Email Container -->
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="570" style="width:570px;">
        <tr>
        <td align="center" valign="top" width="570">
        <![endif]-->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-content" style="max-width: 570px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.025); overflow: hidden;">
          
          <!-- Header (Logo & Title) -->
          <tr>
            <td class="email-header" style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #f1f5f9; text-align: left;">
              <!-- Strict height and width properties to prevent logo from breaking in desktop Outlook & web Gmail -->
              <img class="logo" 
                   src="https://www.maverix.online/_next/image?url=%2Fmaverix-logo.png&w=384&q=75" 
                   alt="Maverix Logo" 
                   width="150" 
                   style="height: auto; width: 150px; max-width: 100%; display: block; margin-bottom: 16px; border: 0;" />
              <h1 class="title" style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; letter-spacing: -0.025em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                New Leave Request Submitted
              </h1>
            </td>
          </tr>

          <!-- Email Body Content -->
          <tr>
            <td class="email-body" style="padding: 32px;">
              <p class="greeting" style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Hello Administrator,
              </p>
              <p class="intro-text" style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <strong>${employeeName}</strong> (${employeeEmail}) has submitted a new leave request. Below are the submission details:
              </p>

              <!-- Details Card Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="details-card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%; box-sizing: border-box; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="details-table">
                      
                      <!-- Employee Name -->
                      <tr>
                        <td class="label" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 500; color: #64748b; width: 35%; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          Employee
                        </td>
                        <td class="val" align="right" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          ${employeeName}
                        </td>
                      </tr>

                      <!-- Leave Type -->
                      <tr>
                        <td class="label" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 500; color: #64748b; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          Leave Type
                        </td>
                        <td class="val" align="right" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          ${leaveTypeName}
                        </td>
                      </tr>

                      <!-- Period -->
                      <tr>
                        <td class="label" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 500; color: #64748b; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          Period
                        </td>
                        <td class="val" align="right" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          ${period}
                        </td>
                      </tr>

                      <!-- Total Days -->
                      <tr>
                        <td class="label" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 500; color: #64748b; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          Total Days
                        </td>
                        <td class="val" align="right" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          ${daysText}
                        </td>
                      </tr>

                      <!-- Reason for Leave -->
                      <tr>
                        <td class="label" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 500; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          Reason
                        </td>
                        <td class="val" align="right" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 500; color: #334155; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 250px; word-wrap: break-word;">
                          ${reason || "—"}
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer & Actions Panel -->
          <tr>
            <td class="email-footer" style="padding: 0 32px 32px 32px; text-align: left;">
             
              <!-- Divider Line and Core Footer Info (Matches original styling guidelines) -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style=" padding-top: 24px;">
                <tr>
                  <td style="text-align: center; font-size: 12px; line-height: 1.6; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    <p style="margin: 0 0 4px 0; font-weight: 500; color: #64748b;">&copy; MaveriX - Smart HRM</p>
                    <p style="margin: 0; color: #94a3b8;">
                      All Rights Reserved. Made with ❤️ by 
                      <a href="https://iconicchandu.vercel.app/" target="_blank" style="color: #4f46e5; text-decoration: none; font-weight: 600;">Iconic Chandu</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->

      </td>
    </tr>
  </table>

</body>
</html>
	`;
	return content;
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
	halfDay?: boolean | null;
}): string {
	const { employeeName, leaveTypeName, startDate, endDate, status, halfDay } = params;
	const statusLabel = status === "approved" ? "Approved" : "Rejected";
	const badgeClass = status === "approved" ? "badge-approved" : "badge-rejected";
	const daysCount = calculateDays(startDate, endDate, halfDay);
	const daysText = halfDay ? "0.5 Days (Half Day)" : `${daysCount} Day${daysCount !== 1 ? "s" : ""}`;

	const content = `
    <!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--<![endif]-->
  <title>Leave Request Update</title>
  
  <style type="text/css">
    /* Outlook & Client Reset Rules */
    #outlook a { padding: 0; }
    .ReadMsgBody { width: 100%; }
    .ExternalClass { width: 100%; }
    .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { line-height: 100%; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    
    /* Core Base Resets */
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f8fafc !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    table {
      border-collapse: collapse !important;
    }
    a {
      text-decoration: none !important;
    }

    /* Mobile-responsive styles */
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 16px 8px !important;
      }
      .email-content {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 8px !important;
      }
      .email-header {
        padding: 24px 20px 16px 20px !important;
      }
      .email-body {
        padding: 24px 20px !important;
      }
      .email-footer {
        padding: 0 20px 24px 20px !important;
      }
      .details-card {
        padding: 16px !important;
      }
      .label {
        width: 40% !important;
        font-size: 13px !important;
      }
      .val {
        font-size: 13px !important;
      }
      .logo {
        height: 32px !important;
        width: auto !important;
      }
      .title {
        font-size: 18px !important;
      }
      .cta-button {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box;
        text-align: center !important;
        padding: 14px 20px !important;
      }
    }
  </style>

  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Outer Wrapper Table -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #f8fafc; table-layout: fixed;">
    <tr>
      <td class="email-wrapper" align="center" style="padding: 40px 16px; background-color: #f8fafc;">
        
        <!-- Main Email Container -->
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="570" style="width:570px;">
        <tr>
        <td align="center" valign="top" width="570">
        <![endif]-->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-content" style="max-width: 570px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.025); overflow: hidden;">
          
          <!-- Header (Logo & Title) -->
          <tr>
            <td class="email-header" style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #f1f5f9; text-align: left;">
              <!-- Using explicit width/height for image protection across Outlook/Gmail client resets -->
              <img class="logo" 
                   src="https://www.maverix.online/_next/image?url=%2Fmaverix-logo.png&w=384&q=75" 
                   alt="Maverix Logo" 
                   width="150" 
                   style="height: auto; width: 150px; max-width: 100%; display: block; margin-bottom: 16px; border: 0;" />
              <h1 class="title" style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; letter-spacing: -0.025em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Leave Request Update
              </h1>
            </td>
          </tr>

          <!-- Email Body Content -->
          <tr>
            <td class="email-body" style="padding: 32px;">
              <p class="greeting" style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Hello ${employeeName},
              </p>
              <p class="intro-text" style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Your leave request has been reviewed and updated. Below are the finalized details of your request:
              </p>

              <!-- Details Card Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="details-card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%; box-sizing: border-box; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="details-table">
                      
                      <!-- Leave Type -->
                      <tr>
                        <td class="label" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 500; color: #64748b; width: 35%; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          Leave Type
                        </td>
                        <td class="val" align="right" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          ${leaveTypeName}
                        </td>
                      </tr>

                      <!-- Period -->
                      <tr>
                        <td class="label" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 500; color: #64748b; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          Period
                        </td>
                        <td class="val" align="right" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          ${startDate} to ${endDate}
                        </td>
                      </tr>

                      <!-- Total Days -->
                      <tr>
                        <td class="label" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 500; color: #64748b; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          Total Days
                        </td>
                        <td class="val" align="right" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          ${daysText}
                        </td>
                      </tr>

                      <!-- Status Badge Row -->
                      <tr>
                        <td class="label" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 500; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          Status
                        </td>
                        <td class="val" align="right" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 600; color: #1e293b; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          
                          <!-- Dynamic badges configured with high contrast colors for accessibility -->
                          <!-- Standard Email CSS styles badges. Added fallbacks directly into style block too -->
                          <span class="badge ${badgeClass}" style="display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 600; border-radius: 9999px; text-transform: capitalize; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                            ${statusLabel}
                          </span>
                          
                          <!-- Inline Badge Color Fallback Overrides -->
                          <style type="text/css">
                            /* Styles mapped dynamically depending on back-end class names injected */
                            .approved, .status-approved { background-color: #dcfce7 !important; color: #15803d !important; }
                            .pending, .status-pending { background-color: #fef3c7 !important; color: #b45309 !important; }
                            .rejected, .status-rejected, .denied { background-color: #fee2e2 !important; color: #b91c1c !important; }
                          </style>

                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer & Actions Panel -->
          <tr>
            <td class="email-footer" style="padding: 0 32px 32px 32px; text-align: left;">
              <!-- Divider Line and Core Footer Info -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="padding-top: 24px;">
                <tr>
                  <td style="text-align: center; font-size: 12px; line-height: 1.6; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    <p style="margin: 0 0 4px 0; font-weight: 500;">&copy; MaveriX - Smart HRM</p>
                    <p style="margin: 0; color: #94a3b8;">
                      All Rights Reserved. Made with ❤️ by 
                      <a href="https://iconicchandu.vercel.app/" target="_blank" style="color: #4f46e5; text-decoration: none; font-weight: 600;">Iconic Chandu</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->

      </td>
    </tr>
  </table>

</body>
</html>
	`;
	return content;
}

export function deductionSubject(daysDeducted: number, leaveTypeName: string): string {
	return `Leave Balance Deduction: ${daysDeducted} Day${daysDeducted !== 1 ? "s" : ""} ${leaveTypeName}`;
}

export function deductionBody(params: {
	employeeName: string;
	deductedBy: string;
	leaveTypeName: string;
	daysDeducted: number;
	deductionDate: string;
	reason: string;
}): string {
	const { employeeName, deductedBy, leaveTypeName, daysDeducted, deductionDate, reason } = params;
	const formattedDate = new Date(deductionDate).toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	const content = `
    <!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--<![endif]-->
  <title>Leave Balance Deducted</title>
  
  <style type="text/css">
    /* Outlook & Client Reset Rules */
    #outlook a { padding: 0; }
    .ReadMsgBody { width: 100%; }
    .ExternalClass { width: 100%; }
    .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { line-height: 100%; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    
    /* Core Base Resets */
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f8fafc !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    table {
      border-collapse: collapse !important;
    }
    a {
      text-decoration: none !important;
    }

    /* Mobile-responsive overrides */
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 16px 8px !important;
      }
      .email-content {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 8px !important;
      }
      .email-header {
        padding: 24px 20px 16px 20px !important;
      }
      .email-body {
        padding: 24px 20px !important;
      }
      .email-footer {
        padding: 0 20px 24px 20px !important;
      }
      .details-card {
        padding: 16px !important;
      }
      .label {
        width: 35% !important;
        font-size: 13px !important;
      }
      .val {
        font-size: 13px !important;
      }
      .logo {
        height: 32px !important;
        width: auto !important;
      }
      .title {
        font-size: 18px !important;
      }
      .cta-button {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box;
        text-align: center !important;
        padding: 14px 20px !important;
      }
    }
  </style>

  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Outer Wrapper Table for email backing -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #f8fafc; table-layout: fixed;">
    <tr>
      <td class="email-wrapper" align="center" style="padding: 40px 16px; background-color: #f8fafc;">
        
        <!-- Main Email Container -->
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="570" style="width:570px;">
        <tr>
        <td align="center" valign="top" width="570">
        <![endif]-->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-content" style="max-width: 570px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.025); overflow: hidden;">
          
          <!-- Header (Logo & Title) -->
          <tr>
            <td class="email-header" style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #f1f5f9; text-align: left;">
              <!-- Strict dimensional configuration ensures logo safety on mobile/Outlook screens -->
              <img class="logo" 
                   src="https://www.maverix.online/_next/image?url=%2Fmaverix-logo.png&w=384&q=75" 
                   alt="Maverix Logo" 
                   width="150" 
                   style="height: auto; width: 150px; max-width: 100%; display: block; margin-bottom: 16px; border: 0;" />
              <h1 class="title" style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; letter-spacing: -0.025em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Leave Balance Deducted
              </h1>
            </td>
          </tr>

          <!-- Email Body Content -->
          <tr>
            <td class="email-body" style="padding: 32px;">
              <p class="greeting" style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Hello <strong>${employeeName}</strong>,
              </p>
              <p class="intro-text" style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                This email is to notify you that a deduction has been made from your leave balance. Below are the specific transaction details:
              </p>

              <!-- Details Card Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="details-card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%; box-sizing: border-box; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="details-table">
                      
                      <!-- Deducted By -->
                      <tr>
                        <td class="label" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 500; color: #64748b; width: 35%; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          Deducted By
                        </td>
                        <td class="val" align="right" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          ${deductedBy}
                        </td>
                      </tr>

                      <!-- Leave Type -->
                      <tr>
                        <td class="label" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 500; color: #64748b; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          Leave Type
                        </td>
                        <td class="val" align="right" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          ${leaveTypeName}
                        </td>
                      </tr>

                      <!-- Days Deducted (Styled as an informative high-contrast tag) -->
                      <tr>
                        <td class="label" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 500; color: #64748b; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          Days Deducted
                        </td>
                        <td class="val" align="right" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          <span class="badge badge-deduction" style="display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 600; border-radius: 9999px; text-transform: capitalize; background-color: #fee2e2 !important; color: #b91c1c !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                            ${daysDeducted} Day${daysDeducted !== 1 ? "s" : ""}
                          </span>
                        </td>
                      </tr>

                      <!-- Date of Transaction -->
                      <tr>
                        <td class="label" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 500; color: #64748b; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          Date
                        </td>
                        <td class="val" align="right" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          ${formattedDate}
                        </td>
                      </tr>

                      <!-- Reason -->
                      <tr>
                        <td class="label" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 500; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          Reason
                        </td>
                        <td class="val" align="right" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 500; color: #334155; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 250px; word-wrap: break-word;">
                          ${reason || "—"}
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer & Actions Panel -->
          <tr>
            <td class="email-footer" style="padding: 0 32px 32px 32px; text-align: left;">
              
             
             
              <!-- Divider Line and Core Footer Info (Matches original styling guidelines) -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="padding-top: 24px;">
                <tr>
                  <td style="text-align: center; font-size: 12px; line-height: 1.6; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    <p style="margin: 0 0 4px 0; font-weight: 500; color: #64748b;">&copy; MaveriX - Smart HRM</p>
                    <p style="margin: 0; color: #94a3b8;">
                      All Rights Reserved. Made with ❤️ by 
                      <a href="https://iconicchandu.vercel.app/" target="_blank" style="color: #4f46e5; text-decoration: none; font-weight: 600;">Iconic Chandu</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->

      </td>
    </tr>
  </table>

</body>
</html>
	`;
	return content;
}
