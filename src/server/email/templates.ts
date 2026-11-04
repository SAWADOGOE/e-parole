export const EMAIL_TEMPLATES = ["verify-email", "reset-password", "account-exists"] as const;
export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function layout(title: string, intro: string, actionLabel: string, url: string, outro: string): string {
  const safeUrl = escapeHtml(url);
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F7F5EF;font-family:Inter,Arial,sans-serif;color:#202B30">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#FBFAF6;border:1px solid #DDD7C8;border-radius:16px">
<tr><td style="padding:32px">
<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:22px;color:#103B39">e·Parole</p>
<h1 style="margin:0 0 16px;font-size:20px;color:#103B39">${escapeHtml(title)}</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:24px">${escapeHtml(intro)}</p>
<p style="margin:0 0 24px"><a href="${safeUrl}" style="display:inline-block;background:#256F62;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">${escapeHtml(actionLabel)}</a></p>
<p style="margin:0 0 8px;font-size:14px;line-height:20px;color:#5E6B70">${escapeHtml(outro)}</p>
<p style="margin:0;font-size:12px;line-height:18px;color:#5E6B70;word-break:break-all">${safeUrl}</p>
</td></tr></table>
<p style="margin:16px 0 0;font-size:12px;color:#5E6B70">Grandir dans la foi, ensemble.</p>
</td></tr></table></body></html>`;
}

/** Emails transactionnels : vouvoiement (docs/03-EVANGELICAL-IDENTITY.md, ton éditorial). */
export function renderEmail(template: EmailTemplate, params: { url: string }): RenderedEmail {
  switch (template) {
    case "verify-email": {
      const subject = "Confirmez votre adresse email — e-Parole";
      const intro = "Bienvenue sur e-Parole. Confirmez votre adresse email pour commencer à publier, prier et rejoindre des communautés.";
      const outro = "Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.";
      return {
        subject,
        text: `${intro}\n\n${params.url}\n\n${outro}`,
        html: layout("Confirmez votre adresse email", intro, "Confirmer mon adresse", params.url, outro),
      };
    }
    case "reset-password": {
      const subject = "Réinitialisation de votre mot de passe — e-Parole";
      const intro = "Une demande de réinitialisation du mot de passe a été faite pour votre compte.";
      const outro = "Ce lien expire dans 1 heure. Si vous n'avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.";
      return {
        subject,
        text: `${intro}\n\n${params.url}\n\n${outro}`,
        html: layout("Réinitialiser votre mot de passe", intro, "Choisir un nouveau mot de passe", params.url, outro),
      };
    }
    case "account-exists": {
      const subject = "Tentative d'inscription avec votre adresse — e-Parole";
      const intro = "Quelqu'un a essayé de créer un compte e-Parole avec votre adresse email, qui est déjà inscrite.";
      const outro = "Si c'était vous, connectez-vous ou réinitialisez votre mot de passe. Sinon, vous pouvez ignorer ce message.";
      return {
        subject,
        text: `${intro}\n\n${params.url}\n\n${outro}`,
        html: layout("Votre adresse est déjà inscrite", intro, "Me connecter", params.url, outro),
      };
    }
    default: {
      const exhaustive: never = template;
      return exhaustive;
    }
  }
}
