import net from "node:net";
import tls from "node:tls";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv } from "vite";
import type { Connect, Plugin, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import unocss from "unocss/vite";
import autoImport from "unplugin-auto-import/vite";

type MailEnv = {
  MAIL_USER?: string;
  MAIL_PASS?: string;
  MAIL_FROM?: string;
  MAIL_SMTP_HOST?: string;
  MAIL_SMTP_PORT?: string;
  MAIL_SMTP_SECURE?: string;
};

type SocketLike = net.Socket | tls.TLSSocket;

const appEnv = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
const mailEnv: MailEnv = {
  MAIL_USER: appEnv.MAIL_USER,
  MAIL_PASS: appEnv.MAIL_PASS,
  MAIL_FROM: appEnv.MAIL_FROM,
  MAIL_SMTP_HOST: appEnv.MAIL_SMTP_HOST,
  MAIL_SMTP_PORT: appEnv.MAIL_SMTP_PORT,
  MAIL_SMTP_SECURE: appEnv.MAIL_SMTP_SECURE
};

const DEV_MESSAGES = [
  {
    id: "1",
    from: "GitHub",
    fromEmail: "noreply@github.com",
    subject: "Your pull request was merged",
    preview: "Congratulations! Your PR #42 has been merged into main.",
    body: "Congratulations! Your PR #42 has been merged into main.",
    time: "10:42 AM",
    unread: true,
    avatar: "🐙",
    folder: "Inbox"
  },
  {
    id: "2",
    from: "Dominic",
    fromEmail: "dominicolanya@me.com",
    subject: "Portfolio notes",
    preview: "Things to finish: Liquid Glass polish, new apps...",
    body: "Things to finish:\n• Liquid Glass polish\n• Add Mail to dock\n• Improve launchpad grid",
    time: "Yesterday",
    avatar: "A",
    folder: "Inbox"
  }
];

const sentMessages: Array<{
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  folder: string;
  avatar: string;
}> = [];

function parseBool(value?: string) {
  return value === "true";
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function readRequestBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function readSmtpReply(socket: SocketLike) {
  return new Promise<{ code: number; message: string }>((resolve, reject) => {
    let buffer = "";

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const lastLine = lines[lines.length - 1];

      if (!lastLine) {
        return;
      }

      const match = lastLine.match(/^(\d{3})([ -])(.*)$/);
      if (!match || match[2] === "-") {
        return;
      }

      socket.off("data", onData);
      socket.off("error", reject);
      resolve({ code: Number(match[1]), message: lines.join("\n") });
    };

    socket.on("data", onData);
    socket.on("error", reject);
  });
}

async function writeSmtpCommand(socket: SocketLike, command: string) {
  socket.write(`${command}\r\n`);
  return readSmtpReply(socket);
}

async function authenticateSmtp(socket: SocketLike, user: string, pass: string) {
  const plainAuthLine = Buffer.from(`\0${user}\0${pass}`).toString("base64");
  let reply = await writeSmtpCommand(socket, `AUTH PLAIN ${plainAuthLine}`);

  if (reply.code === 235) {
    return;
  }

  const shouldTryLogin =
    reply.code === 504 ||
    reply.message.toLowerCase().includes("unrecognized authentication type");

  if (!shouldTryLogin) {
    if (reply.code === 535) {
      throw new Error(
        "SMTP AUTH failed with 535. Check MAIL_USER and MAIL_PASS for your Outlook account or app password."
      );
    }

    throw new Error(`SMTP AUTH failed: ${reply.message}`);
  }

  reply = await writeSmtpCommand(socket, "AUTH LOGIN");
  if (reply.code !== 334) {
    throw new Error(`SMTP AUTH LOGIN failed: ${reply.message}`);
  }

  reply = await writeSmtpCommand(socket, Buffer.from(user).toString("base64"));
  if (reply.code !== 334) {
    throw new Error(`SMTP AUTH LOGIN username failed: ${reply.message}`);
  }

  reply = await writeSmtpCommand(socket, Buffer.from(pass).toString("base64"));
  if (reply.code !== 235) {
    if (reply.code === 535) {
      throw new Error(
        "SMTP AUTH LOGIN failed with 535. Check MAIL_USER and MAIL_PASS for your Outlook account or app password."
      );
    }

    throw new Error(`SMTP AUTH LOGIN password failed: ${reply.message}`);
  }
}

function buildSmtpMessage(payload: { from: string; to: string; subject: string; text: string }) {
  const bodyLines = payload.text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");

  return [
    `From: ${payload.from}`,
    `To: ${payload.to}`,
    `Subject: ${payload.subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "",
    bodyLines
  ].join("\r\n");
}

async function sendMailViaSmtp(payload: { to: string; subject: string; text: string }) {
  const host = mailEnv.MAIL_SMTP_HOST ?? "smtp.mail.me.com";
  const port = Number(mailEnv.MAIL_SMTP_PORT ?? 587);
  const secure = parseBool(mailEnv.MAIL_SMTP_SECURE);
  const user = mailEnv.MAIL_USER ?? "";
  const pass = mailEnv.MAIL_PASS ?? "";
  const from = mailEnv.MAIL_FROM ?? user;

  if (!user || !pass || !from) {
    throw new Error("MAIL_USER, MAIL_PASS, or MAIL_FROM is missing in .env");
  }

  const socket: SocketLike = secure ? tls.connect(port, host, { servername: host }) : net.connect(port, host);

  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("secureConnect", () => resolve());
    socket.once("error", reject);
  });

  let reply = await readSmtpReply(socket);
  if (reply.code !== 220) {
    socket.destroy();
    throw new Error(`SMTP greeting failed: ${reply.message}`);
  }

  reply = await writeSmtpCommand(socket, "EHLO localhost");
  if (reply.code !== 250) {
    socket.destroy();
    throw new Error(`SMTP EHLO failed: ${reply.message}`);
  }

  let tlsSocket: tls.TLSSocket | null = null;

  if (!secure) {
    reply = await writeSmtpCommand(socket, "STARTTLS");
    if (reply.code !== 220) {
      socket.destroy();
      throw new Error(`SMTP STARTTLS failed: ${reply.message}`);
    }

    tlsSocket = tls.connect({ socket, servername: host });

    await new Promise<void>((resolve, reject) => {
      tlsSocket?.once("secureConnect", () => resolve());
      tlsSocket?.once("error", reject);
    });

    reply = await writeSmtpCommand(tlsSocket, "EHLO localhost");
    if (reply.code !== 250) {
      tlsSocket.destroy();
      throw new Error(`SMTP EHLO after STARTTLS failed: ${reply.message}`);
    }
  }

  const activeSocket = tlsSocket ?? socket;

  await authenticateSmtp(activeSocket, user, pass);

  reply = await writeSmtpCommand(activeSocket, `MAIL FROM:<${from}>`);
  if (reply.code !== 250) {
    activeSocket.destroy();
    throw new Error(`SMTP MAIL FROM failed: ${reply.message}`);
  }

  reply = await writeSmtpCommand(activeSocket, `RCPT TO:<${payload.to}>`);
  if (reply.code !== 250 && reply.code !== 251) {
    activeSocket.destroy();
    throw new Error(`SMTP RCPT TO failed: ${reply.message}`);
  }

  reply = await writeSmtpCommand(activeSocket, "DATA");
  if (reply.code !== 354) {
    activeSocket.destroy();
    throw new Error(`SMTP DATA failed: ${reply.message}`);
  }

  activeSocket.write(`${buildSmtpMessage({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text
  })}\r\n.\r\n`);

  reply = await readSmtpReply(activeSocket);
  if (reply.code !== 250) {
    activeSocket.destroy();
    throw new Error(`SMTP message failed: ${reply.message}`);
  }

  await writeSmtpCommand(activeSocket, "QUIT").catch(() => undefined);
  activeSocket.destroy();
}

function createMailApiMiddleware() {
  return async (request: IncomingMessage, response: ServerResponse, next: Connect.NextFunction) => {
    if (!request.url?.startsWith("/api/mail")) {
      next();
      return;
    }

    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.end();
      return;
    }

    if (request.url.startsWith("/api/mail/messages") && request.method === "GET") {
      const requestUrl = new URL(request.url, "http://127.0.0.1");
      const folder = requestUrl.searchParams.get("folder") ?? "Inbox";
      const messages =
        folder === "Sent"
          ? sentMessages
          : DEV_MESSAGES.filter((message) => (message.folder ?? "Inbox") === folder || folder === "Inbox");

      sendJson(response, 200, { messages });
      return;
    }

    if (request.url.startsWith("/api/mail/send") && request.method === "POST") {
      try {
        const rawBody = await readRequestBody(request);
        const body = rawBody ? JSON.parse(rawBody) : {};
        const to = String(body.to ?? "").trim();
        const subject = String(body.subject ?? "Portfolio message").trim() || "Portfolio message";
        const text = String(body.text ?? "").trim();

        if (!to || !text) {
          sendJson(response, 400, {
            error: "Recipient and message body are required"
          });
          return;
        }

        await sendMailViaSmtp({ to, subject, text });

        sentMessages.unshift({
          id: `sent-${Date.now()}`,
          from: "Dominic",
          fromEmail: mailEnv.MAIL_FROM ?? mailEnv.MAIL_USER ?? "",
          subject,
          preview: text.slice(0, 120),
          body: text,
          time: formatDate(),
          folder: "Sent",
          avatar: "A"
        });

        sendJson(response, 200, { ok: true });
      } catch (error) {
        console.error("[mail] Failed to send message", error);
        sendJson(response, 500, {
          error: error instanceof Error ? error.message : "Failed to send message"
        });
      }

      return;
    }

    sendJson(response, 404, { error: "Not found" });
  };
}

const mailApiPlugin: Plugin = {
  name: "mail-api-dev",
  configureServer(server: ViteDevServer) {
    server.middlewares.use(createMailApiMiddleware());
  }
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    unocss(),
    react(),
    mailApiPlugin,
    autoImport({
      imports: ["react"],
      dts: "src/auto-imports.d.ts",
      dirs: ["src/hooks", "src/stores", "src/components/**"]
    })
  ],
  resolve: {
    alias: {
      "~/": `${path.resolve(__dirname, "src")}/`
    }
  }
});
