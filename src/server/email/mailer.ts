import nodemailer, { type Transporter } from "nodemailer";
import { getEnv } from "../env";
import { renderEmail, type EmailTemplate } from "./templates";

let transporter: Transporter | undefined;

function getTransporter(): Transporter {
  if (transporter) return transporter;
  const env = getEnv();
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER && env.SMTP_PASSWORD ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } } : {}),
  });
  return transporter;
}

/** Envoi effectif (appelé uniquement par le worker). */
export async function deliverEmail(to: string, template: EmailTemplate, params: { url: string }): Promise<void> {
  const rendered = renderEmail(template, params);
  await getTransporter().sendMail({
    from: getEnv().SMTP_FROM,
    to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
}
