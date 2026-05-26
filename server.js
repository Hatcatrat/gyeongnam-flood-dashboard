const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 8000);
const logFile = path.join(root, "server.log");

function log(message) {
  fs.appendFileSync(logFile, `${new Date().toISOString()} ${message}\n`, "utf8");
}

process.on("uncaughtException", (error) => {
  log(`uncaughtException: ${error.stack || error.message}`);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  log(`unhandledRejection: ${error && (error.stack || error.message || error)}`);
  process.exit(1);
});

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.url === "/favicon.ico") {
    send(res, 204, "");
    return;
  }

  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  let safePath = path.normalize(urlPath).replace(/^([/\\])+/, "");
  if (!safePath || safePath === ".") safePath = "index.html";
  const target = path.resolve(root, safePath);

  if (!target.startsWith(root) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    send(res, 404, "Not found");
    return;
  }

  res.writeHead(200, {
    "Content-Type": mimeTypes[path.extname(target)] || "application/octet-stream",
  });
  fs.createReadStream(target).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  log(`Flood dashboard running at http://localhost:${port}`);
});
