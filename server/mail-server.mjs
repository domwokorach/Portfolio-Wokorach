import http from "node:http";
import { URL } from "node:url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { google } from "googleapis";

dotenv.config();

const parsedPort = Number.parseInt(process.env.PORT ?? "", 10);
const PORT = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3000;
const HOST = process.env.NODE_ENV === "production" ? "0.0.0.0" : process.env.MAIL_API_HOST ?? "0.0.0.0";
const MAIL_PRIVACY_MODE = process.env.MAIL_PRIVACY_MODE !== "false";

function redactMessages(messages) {
  if (!MAIL_PRIVACY_MODE) {
    return messages;
  }

  return messages.map((message) => ({
    ...message,
    from: "Private Sender",
    fromEmail: "hidden@private.local",
    subject: "Private message",
    preview: "Message details are hidden for privacy.",
    body: "Message details are hidden for privacy.",
    avatar: "🔒",
    starred: false
  }));
}

function isGmailAccount() {
  const mailUser = process.env.MAIL_USER?.toLowerCase() ?? "";
  const smtpHost = process.env.MAIL_SMTP_HOST?.toLowerCase() ?? "";
  const imapHost = process.env.MAIL_IMAP_HOST?.toLowerCase() ?? "";

  return mailUser.endsWith("@gmail.com") || smtpHost.includes("gmail.com") || imapHost.includes("gmail.com");
}

function hasGoogleOAuthCredentials() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI &&
      process.env.GOOGLE_REFRESH_TOKEN
  );
}

function shouldUseGoogleMailApi() {
  return isGmailAccount() && hasGoogleOAuthCredentials();
}

function getMailConfigError({ requireIncomingMail = false } = {}) {
  if (!process.env.MAIL_USER) {
    return "MAIL_USER is missing";
  }

  if (!process.env.MAIL_FROM) {
    return "MAIL_FROM is missing";
  }

  if (shouldUseGoogleMailApi()) {
    return null;
  }

  if (requireIncomingMail) {
    if (!process.env.MAIL_IMAP_HOST) {
      return "MAIL_IMAP_HOST is missing";
    }

    if (!process.env.MAIL_IMAP_PORT) {
      return "MAIL_IMAP_PORT is missing";
    }
  }

  if (!process.env.MAIL_PASS) {
    return "MAIL_PASS is missing. Use an app password or configure Google OAuth variables for Gmail.";
  }

  return null;
}

function getGoogleOAuthConfigError() {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return "GOOGLE_CLIENT_ID is missing";
  }

  if (!process.env.GOOGLE_CLIENT_SECRET) {
    return "GOOGLE_CLIENT_SECRET is missing";
  }

  if (!process.env.GOOGLE_REDIRECT_URI) {
    return "GOOGLE_REDIRECT_URI is missing";
  }

  return null;
}

function createGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function createTransporter() {
  if (shouldUseGoogleMailApi()) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.MAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN
      }
    });
  }

  return nodemailer.createTransport({
    host: process.env.MAIL_SMTP_HOST,
    port: Number(process.env.MAIL_SMTP_PORT ?? 587),
    secure: process.env.MAIL_SMTP_SECURE === "true",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });
}

async function checkMailAuthHealth() {
  const mailConfigError = getMailConfigError();

  if (mailConfigError) {
    throw new Error(mailConfigError);
  }

  const transporter = createTransporter();
  await transporter.verify();

  return {
    ok: true,
    mode: shouldUseGoogleMailApi() ? "gmail-oauth2" : "smtp"
  };
}

const folderMap = {
  Inbox: ["INBOX"],
  Sent: ["Sent", "Sent Messages", "Sent Items", "Sent Mail"],
  Drafts: ["Drafts"],
  Starred: ["Flagged"],
  Trash: ["Trash", "Deleted Messages", "Deleted Items"]
};

const gmailLabelMap = {
  Inbox: ["INBOX"],
  Sent: ["SENT"],
  Drafts: ["DRAFT"],
  Starred: ["STARRED"],
  Trash: ["TRASH"]
};

const requiredEnv = process.env.RESEND_API_KEY
  ? []
  : [
      "MAIL_USER",
      "MAIL_FROM",
      ...(shouldUseGoogleMailApi()
        ? ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI", "GOOGLE_REFRESH_TOKEN"]
        : ["MAIL_IMAP_HOST", "MAIL_IMAP_PORT", "MAIL_IMAP_SECURE", "MAIL_SMTP_HOST", "MAIL_SMTP_PORT", "MAIL_SMTP_SECURE", "MAIL_PASS"])
    ];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.warn(`[mail] Missing ${key}`);
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  response.end(JSON.stringify(payload));
}

function getMessageAvatar(from) {
  if (!from) return "✉️";
  const lowered = from.toLowerCase();
  if (lowered.includes("apple")) return "";
  if (lowered.includes("github")) return "🐙";
  if (lowered.includes("google")) return "G";
  if (lowered.includes("vercel")) return "▲";
  return from.trim().charAt(0).toUpperCase() || "✉️";
}

function formatTime(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function parseAddress(address) {
  if (!address?.length) return { name: "", email: "" };
  const first = address[0];
  return {
    name: first.name ?? first.address ?? "",
    email: first.address ?? ""
  };
}

function parseAddressHeader(value) {
  if (!value) {
    return { name: "Unknown", email: "" };
  }

  const email = value.match(/<([^>]+)>/)?.[1] ?? value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const name = value
    .replace(/<[^>]+>/g, "")
    .replace(/^["']|["']$/g, "")
    .trim();

  return {
    name: name || email || "Unknown",
    email
  };
}

function getHeaderValue(headers, name) {
  return headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function decodeBase64Url(value) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function findBodyData(payload, mimeType) {
  if (!payload) {
    return null;
  }

  if (payload.mimeType === mimeType && payload.body?.data) {
    return payload.body.data;
  }

  for (const part of payload.parts ?? []) {
    const nested = findBodyData(part, mimeType);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function extractGmailBody(payload) {
  const plainText = findBodyData(payload, "text/plain");

  if (plainText) {
    return decodeBase64Url(plainText).trim();
  }

  const htmlText = findBodyData(payload, "text/html");
  if (htmlText) {
    return stripHtml(decodeBase64Url(htmlText));
  }

  return "";
}

function createAuthenticatedGoogleClient() {
  const oauth2Client = createGoogleOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
  return oauth2Client;
}

async function listGmailMessages(folderName) {
  const gmail = google.gmail({
    version: "v1",
    auth: createAuthenticatedGoogleClient()
  });
  const labelIds = gmailLabelMap[folderName] ?? gmailLabelMap.Inbox;
  const result = await gmail.users.messages.list({
    userId: "me",
    labelIds,
    maxResults: 20
  });
  const messageRefs = result.data.messages ?? [];

  if (!messageRefs.length) {
    return [];
  }

  const detailedMessages = await Promise.all(
    messageRefs.map(({ id }) =>
      gmail.users.messages.get({
        userId: "me",
        id,
        format: "full"
      })
    )
  );

  return detailedMessages.map(({ data }) => {
    const headers = data.payload?.headers ?? [];
    const fromHeader = parseAddressHeader(getHeaderValue(headers, "from"));
    const subject = getHeaderValue(headers, "subject") || "(No subject)";
    const body = extractGmailBody(data.payload);
    const preview = body.slice(0, 120) || data.snippet || "No preview available.";
    const internalDate = data.internalDate ? new Date(Number(data.internalDate)) : null;
    const labelIds = data.labelIds ?? [];

    return {
      id: data.id ?? "",
      from: fromHeader.name,
      fromEmail: fromHeader.email,
      subject,
      preview,
      body: body || data.snippet || preview,
      time: formatTime(internalDate),
      folder: folderName,
      unread: labelIds.includes("UNREAD"),
      starred: labelIds.includes("STARRED"),
      avatar: getMessageAvatar(fromHeader.name || fromHeader.email)
    };
  });
}

async function listMessages(folderName) {
  if (shouldUseGoogleMailApi()) {
    return listGmailMessages(folderName);
  }

  const client = new ImapFlow({
    host: process.env.MAIL_IMAP_HOST,
    port: Number(process.env.MAIL_IMAP_PORT ?? 993),
    secure: process.env.MAIL_IMAP_SECURE === "true",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });

  // ImapFlow emits socket/auth errors asynchronously; handle them to avoid process crashes.
  client.on("error", (error) => {
    console.error("[mail] IMAP client error", error);
  });

  const mailboxCandidates = folderMap[folderName] ?? folderMap.Inbox;
  const messages = [];

  await client.connect();

  try {
    let mailboxOpened = false;

    for (const mailboxName of mailboxCandidates) {
      try {
        await client.mailboxOpen(mailboxName);
        mailboxOpened = true;
        break;
      } catch {
        console.warn(`[mail] Unable to open mailbox ${mailboxName}`);
      }
    }

    if (!mailboxOpened) {
      return [];
    }

    const uids = await client.search({ seen: false }, { uid: true });
    const fetchUids = (uids.length ? uids : await client.search({}, { uid: true }))
      .slice(-20)
      .reverse();

    for await (const message of client.fetch(fetchUids, { envelope: true, flags: true, internalDate: true, source: true })) {
      const parsed = await simpleParser(message.source);
      const from = parseAddress(message.envelope?.from).name || parsed.from?.value?.[0]?.name || parsed.from?.value?.[0]?.address || "Unknown";
      const fromEmail = parseAddress(message.envelope?.from).email || parsed.from?.value?.[0]?.address || "";
      const text = parsed.text?.trim() || parsed.html?.toString().replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "";
      const preview = text.slice(0, 120) || "No preview available.";

      messages.push({
        id: String(message.uid),
        from,
        fromEmail,
        subject: message.envelope?.subject || parsed.subject || "(No subject)",
        preview,
        body: text || preview,
        time: formatTime(message.internalDate ?? parsed.date),
        folder: folderName,
        unread: !message.flags.includes("\\Seen"),
        starred: message.flags.includes("\\Flagged"),
        avatar: getMessageAvatar(from)
      });
    }
  } finally {
    await client.logout().catch(() => {});
  }

  return messages;
}

async function readBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    });
    response.end();
    return;
  }

  if (requestUrl.pathname === "/" || requestUrl.pathname === "/healthz") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (requestUrl.pathname === "/api/mail/health" && request.method === "GET") {
    if (process.env.RESEND_API_KEY) {
      sendJson(response, 200, { ok: true, mode: "resend" });
      return;
    }

    try {
      const health = await checkMailAuthHealth();
      sendJson(response, 200, health);
    } catch (error) {
      sendJson(response, 503, {
        ok: false,
        error: error instanceof Error ? error.message : "Mail authentication check failed"
      });
    }

    return;
  }

  if (requestUrl.pathname === "/auth/google" && request.method === "GET") {
    const oauthConfigError = getGoogleOAuthConfigError();

    if (oauthConfigError) {
      sendJson(response, 503, { error: oauthConfigError });
      return;
    }

    const oauth2Client = createGoogleOAuthClient();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://mail.google.com/"],
      prompt: "consent"
    });

    response.writeHead(302, { Location: authUrl });
    response.end();
    return;
  }

  if ((requestUrl.pathname === "/oauth2callback" || requestUrl.pathname === "/oauth2/callback") && request.method === "GET") {
    try {
      const oauthConfigError = getGoogleOAuthConfigError();

      if (oauthConfigError) {
        sendJson(response, 503, { error: oauthConfigError });
        return;
      }

      const code = requestUrl.searchParams.get("code");

      if (!code) {
        sendJson(response, 400, { error: "Missing OAuth code" });
        return;
      }

      const oauth2Client = createGoogleOAuthClient();
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      sendJson(response, 200, {
        ok: true,
        message: "Gmail connected",
        refreshToken: tokens.refresh_token ?? null,
        note: "Store refreshToken securely and set GOOGLE_REFRESH_TOKEN in Railway variables."
      });
    } catch (error) {
      console.error("[mail] OAuth callback failed", error);
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "OAuth callback failed"
      });
    }

    return;
  }

  if (requestUrl.pathname === "/emails" && request.method === "GET") {
    try {
      const oauthConfigError = getGoogleOAuthConfigError();

      if (oauthConfigError) {
        sendJson(response, 503, { error: oauthConfigError });
        return;
      }

      if (!process.env.GOOGLE_REFRESH_TOKEN) {
        sendJson(response, 503, { error: "GOOGLE_REFRESH_TOKEN is missing" });
        return;
      }

      sendJson(response, 200, {
        ok: true,
        messages: redactMessages(await listGmailMessages("Inbox")),
        privacyMode: MAIL_PRIVACY_MODE
      });
    } catch (error) {
      console.error("[mail] Gmail list failed", error);
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Failed to list Gmail messages"
      });
    }

    return;
  }

  if (requestUrl.pathname === "/api/mail/messages" && request.method === "GET") {
    const folder = requestUrl.searchParams.get("folder") ?? "Inbox";

    try {
      const mailConfigError = getMailConfigError({ requireIncomingMail: true });

      if (mailConfigError) {
        sendJson(response, 503, { error: mailConfigError });
        return;
      }

      const messages = await listMessages(folder);
      sendJson(response, 200, {
        messages: redactMessages(messages),
        privacyMode: MAIL_PRIVACY_MODE
      });
    } catch (error) {
      console.error("[mail] Failed to load messages", error);
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Failed to load messages"
      });
    }

    return;
  }

  if (requestUrl.pathname === "/api/mail/send" && request.method === "POST") {
    try {
      const body = await readBody(request);

      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const from = process.env.CONTACT_FROM_EMAIL || "onboarding@resend.dev";
        const to = process.env.CONTACT_TO_EMAIL || body.to;
        const senderEmail = typeof body.replyTo === "string" && body.replyTo.includes("@")
          ? body.replyTo
          : null;

        const { data, error } = await resend.emails.send({
          from,
          to,
          // lets you hit Reply directly to the visitor in your email client
          replyTo: senderEmail ?? undefined,
          subject: body.subject ?? "Portfolio message",
          text: body.text ?? "",
          html: body.html ?? undefined
        });
        if (error) throw new Error(error.message);

        // Auto-reply requires a verified domain; skip for the test sender
        if (senderEmail && from !== "onboarding@resend.dev") {
          const { error: replyError } = await resend.emails.send({
            from,
            to: senderEmail,
            subject: "Re: " + (body.subject ?? "Portfolio message"),
            text: "Thank you for your email. I will get back to you within 3\u20135 working days.\n\nKind regards,\n\nDominic"
          });
          if (replyError) console.error("[mail] Auto-reply failed", replyError.message);
        }

        sendJson(response, 200, { ok: true, messageId: data.id });
        return;
      }

      const mailConfigError = getMailConfigError();

      if (mailConfigError) {
        sendJson(response, 503, { error: mailConfigError });
        return;
      }

      const transporter = createTransporter();
      const result = await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: body.to ?? process.env.MAIL_FROM,
        subject: body.subject ?? "Portfolio message",
        text: body.text ?? "",
        html: body.html ?? undefined
      });

      sendJson(response, 200, { ok: true, messageId: result.messageId });
    } catch (error) {
      console.error("[mail] Failed to send message", error);
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Failed to send message"
      });
    }

    return;
  }

  sendJson(response, 404, { error: "Not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`[mail] API listening on http://${HOST}:${PORT}`);
});

server.on("error", (error) => {
  console.error("[mail] Server failed to start", error);
  process.exit(1);
});
