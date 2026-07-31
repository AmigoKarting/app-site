import {
  ChannelSkip,
  type Message,
  type NotificationChannel,
  type Recipient,
  type SendOutcome,
} from "../types";
import { MockEmailProvider } from "../providers/email/mock";
import { ResendEmailProvider } from "../providers/email/resend";
import type { EmailProvider } from "../providers/email/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailChannel implements NotificationChannel {
  readonly id = "email" as const;
  readonly displayName = "Email";

  private providerCache: EmailProvider | null = null;

  /** Sélection paresseuse: l'env peut changer entre tests. */
  private getProvider(): EmailProvider {
    if (this.providerCache) return this.providerCache;
    const requested = (process.env.EMAIL_PROVIDER ?? "mock").replace(/^﻿/, "").trim().toLowerCase();
    let provider: EmailProvider;
    switch (requested) {
      case "resend": {
        provider = new ResendEmailProvider();
        break;
      }
      case "mock":
      default: {
        provider = new MockEmailProvider();
        break;
      }
    }
    this.providerCache = provider;
    return provider;
  }

  isAvailable(): boolean {
    return this.getProvider().isConfigured();
  }

  resolveRecipient(recipient: Recipient): string | null {
    const email = recipient.email?.trim();
    if (!email || !EMAIL_RE.test(email)) return null;
    return email;
  }

  async send(to: string, message: Message): Promise<SendOutcome> {
    const provider = this.getProvider();
    if (!provider.isConfigured()) {
      throw new ChannelSkip("Provider email non configuré");
    }
    return provider.send(to, message);
  }
}
