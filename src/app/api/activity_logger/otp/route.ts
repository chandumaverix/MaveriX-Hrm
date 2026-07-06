import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import crypto from "crypto";

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
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || "maverix-default-otp-secret-key-998877";

export async function POST(request: Request) {
  try {
    const { action, email, otp, token } = await request.json();

    if (!email || email !== "iconic.chandu777@gmail.com") {
      return NextResponse.json(
        { error: "Unauthorized email account. Access restricted." },
        { status: 403 }
      );
    }

    if (action === "send") {
      // 1. Generate a 6-digit random OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

      // 2. Build transport & Send mail
      const transport = getTransport();
      if (!transport) {
        return NextResponse.json(
          { error: "SMTP mail server is not configured." },
          { status: 500 }
        );
      }

      await transport.sendMail({
        from: from(),
        to: email,
        subject: "Activity Logger OTP Verification",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px; max-width: 480px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 16px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; font-size: 24px; font-weight: bold;">
                M
              </div>
            </div>
            <h2 style="font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; text-align: center; margin: 0 0 8px 0;">Activity Logger Access</h2>
            <p style="font-size: 13px; color: #64748b; text-align: center; margin: 0 0 28px 0; line-height: 1.6;">Use the verification code below to authorize your access to the Activity Logger dashboard.</p>
            <div style="font-size: 32px; font-weight: 900; color: #4f46e5; letter-spacing: 6px; text-align: center; padding: 18px; background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; margin-bottom: 28px; font-family: monospace;">
              ${generatedOtp}
            </div>
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">This OTP is valid for 5 minutes.<br />If you did not request this verification, please ignore this email.</p>
          </div>
        `,
      });

      // 3. Generate stateless encrypted signature
      const expires = Date.now() + 5 * 60 * 1000; // 5 mins validity
      const dataToSign = `${email}:${generatedOtp}:${expires}`;
      const hash = crypto.createHmac("sha256", SECRET).update(dataToSign).digest("hex");
      const generatedToken = `${expires}:${hash}`;

      return NextResponse.json({ ok: true, token: generatedToken });
    }

    if (action === "verify") {
      if (!otp || !token) {
        return NextResponse.json(
          { error: "Missing verification parameters." },
          { status: 400 }
        );
      }

      const [expiresStr, tokenHash] = token.split(":");
      const expires = Number(expiresStr);

      if (Date.now() > expires) {
        return NextResponse.json(
          { error: "The verification code has expired. Please request a new one." },
          { status: 400 }
        );
      }

      const dataToSign = `${email}:${otp}:${expires}`;
      const hash = crypto.createHmac("sha256", SECRET).update(dataToSign).digest("hex");

      if (hash !== tokenHash) {
        return NextResponse.json(
          { error: "Incorrect verification code. Please try again." },
          { status: 400 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error." },
      { status: 500 }
    );
  }
}
