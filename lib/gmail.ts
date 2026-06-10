import nodemailer from "nodemailer";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
  settings: {
    gmail_user: string;
    gmail_app_password: string;
    sender_name: string;
  };
}

export async function sendEmail({ to, subject, html, attachments, settings }: SendEmailParams) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: settings.gmail_user,
      pass: settings.gmail_app_password,
    },
  });

  await transporter.sendMail({
    from: `"${settings.sender_name}" <${settings.gmail_user}>`,
    to,
    subject,
    html,
    attachments,
  });
}
