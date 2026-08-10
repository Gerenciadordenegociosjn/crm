import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env["SMTP_HOST"];
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];
  const port = Number(process.env["SMTP_PORT"] ?? "587");

  if (!host || !user || !pass) {
    console.warn("[mailer] SMTP not configured — emails will be logged only.");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const transport = createTransport();

export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const from = process.env["SMTP_FROM"] ?? process.env["SMTP_USER"] ?? "noreply@mapey.com.br";

  if (!transport) {
    // Fallback: log the email so the dev can see the reset link
    console.log("\n========== EMAIL (SMTP not configured) ==========");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(html.replace(/<[^>]+>/g, ""));
    console.log("=================================================\n");
    return;
  }

  await transport.sendMail({ from, to, subject, html });
}
