import type { Message, SendOutcome } from "../../types";
import type { EmailProvider } from "./types";

/**
 * Provider Resend (https://resend.com).
 * Activé si RESEND_API_KEY et EMAIL_FROM sont définis et que
 * EMAIL_PROVIDER=resend.
 */
export class ResendEmailProvider implements EmailProvider {
  readonly id = "resend";

  isConfigured(): boolean {
    return Boolean(this.clean(process.env.RESEND_API_KEY) && this.clean(process.env.EMAIL_FROM));
  }

  private clean(v: string | undefined): string | undefined {
    return v?.replace(/^﻿/, "").trim();
  }

  async send(to: string, message: Message): Promise<SendOutcome> {
    const apiKey = this.clean(process.env.RESEND_API_KEY);
    const from = this.clean(process.env.EMAIL_FROM);
    if (!apiKey || !from) {
      throw new Error("Resend non configuré (RESEND_API_KEY / EMAIL_FROM manquants)");
    }

    const payload: Record<string, unknown> = {
      from,
      to: [to],
      subject: message.subject,
      text: message.body,
    };
    if (message.htmlBody) payload.html = message.htmlBody;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Resend ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as { id?: string };
    return {
      provider: this.id,
      providerMessageId: data.id ?? `resend_${Date.now()}`,
    };
  }
}
