import http from "node:http";
import { URL } from "node:url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

dotenv.config();

const PORT = Number(process.env.MAIL_API_PORT ?? 3001);
const HOST = process.env.MAIL_API_HOST ?? "127.0.0.1";

const requiredEnv = [
  "MAIL_IMAP_HOST",
  "MAIL_IMAP_PORT",
  "MAIL_IMAP_SECURE",
  "MAIL_SMTP_HOST",
  "MAIL_SMTP_PORT",
  "MAIL_SMTP_SECURE",
  "MAIL_USER",
  "MAIL_PASS",
  "MAIL_FROM"
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.warn(`[mail] Missing ${key}`);
  }
}

function getMailConfigError() {
  if (!process.env.MAIL_USER) {
    return "MAIL_USER is missing";
  }

  if (!process.env.MAIL_PASS) {
    return "MAIL_PASS is missing. Use an iCloud app-specific password in your .env file.";
  }

  if (!process.env.MAIL_FROM) {
    return "MAIL_FROM is missing";
  }

  return null;
}

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SMTP_HOST,
  port: Number(process.env.MAIL_SMTP_PORT ?? 587),
  secure: process.env.MAIL_SMTP_SECURE === "true",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

const folderMap = {
  Inbox: ["INBOX"],
  Sent: ["Sent", "Sent Messages", "Sent Items", "Sent Mail"],
  Drafts: ["Drafts"],
  Starred: ["Flagged"],
  Trash: ["Trash", "Deleted Messages", "Deleted Items"]
};

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

async function listMessages(folderName) {
  const client = new ImapFlow({
    host: process.env.MAIL_IMAP_HOST,
    port: Number(process.env.MAIL_IMAP_PORT ?? 993),
    secure: process.env.MAIL_IMAP_SECURE === "true",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
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

  if (requestUrl.pathname === "/api/mail/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (requestUrl.pathname === "/api/mail/messages" && request.method === "GET") {
    const folder = requestUrl.searchParams.get("folder") ?? "Inbox";

    try {
      const messages = await listMessages(folder);
      sendJson(response, 200, { messages });
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
      const mailConfigError = getMailConfigError();

      if (mailConfigError) {
        sendJson(response, 503, {
          error: mailConfigError
        });
        return;
      }

      const body = await readBody(request);
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