/**
 * Finance/Payslip notification email templates. Used by the finance notify API route.
 */

export function payslipSubject(monthName: string, year: number): string {
	return `Salary Slip Published for ${monthName} ${year}`;
}

export function payslipBody(params: {
	employeeName: string;
	monthName: string;
	year: number;
}): string {
	const { employeeName, monthName, year } = params;

	return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--<![endif]-->
  <title>Salary Slip Published</title>
  
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
              <img class="logo" 
                   src="https://www.maverix.online/_next/image?url=%2Fmaverix-logo.png&w=384&q=75" 
                   alt="Maverix Logo" 
                   width="150" 
                   style="height: auto; width: 150px; max-width: 100%; display: block; margin-bottom: 16px; border: 0;" />
              <h1 class="title" style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; letter-spacing: -0.025em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Salary Slip Published
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
                Your salary slip for the month of <strong>${monthName} ${year}</strong> has been generated and is now available. We have attached the payslip PDF to this email for your reference.
              </p>

              <!-- Details Card Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="details-card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%; box-sizing: border-box; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="details-table">
                      
                      <!-- Period -->
                      <tr>
                        <td class="label" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 500; color: #64748b; width: 35%; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          Period
                        </td>
                        <td class="val" align="right" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #edf2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          ${monthName} ${year}
                        </td>
                      </tr>

                      <!-- Status -->
                      <tr>
                        <td class="label" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 500; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          Status
                        </td>
                        <td class="val" align="right" style="padding: 10px 0; font-size: 14px; line-height: 1.5; font-weight: 600; color: #16a34a; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                          Published & Allocated
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
              
              <p class="intro-text" style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                You can also view, print, or download all your historical salary slips directly from the employee finance dashboard.
              </p>
            </td>
          </tr>

          <!-- Footer & Actions Panel -->
          <tr>
            <td class="email-footer" style="padding: 0 32px 32px 32px; text-align: left;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
                <tr>
                  <td style="text-align: center; font-size: 12px; line-height: 1.6; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    <p style="margin: 0 0 4px 0; font-weight: 500; color: #64748b;">&copy; MaveriX - Smart HRM</p>
                    <p style="margin: 0; color: #94a3b8;">
                      All Rights Reserved.
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
	`.trim();
}
