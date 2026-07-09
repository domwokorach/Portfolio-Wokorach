import { spawn } from "node:child_process";

const mailServer = spawn("node", ["server/mail-server.mjs"], {
  stdio: "inherit",
  shell: false
});

mailServer.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(`[dev] mail server exited with code ${code}`);
  }
});

const vite = spawn("node", ["node_modules/vite/bin/vite.js", "--host"], {
  stdio: "inherit",
  shell: false
});

vite.on("exit", (code) => {
  if (mailServer.exitCode === null) {
    mailServer.kill("SIGTERM");
  }

  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  vite.kill("SIGTERM");
  mailServer.kill("SIGTERM");
});