const http = require("node:http");
const { HttpError, userEmail } = require("./http");

// Setiap route: { method, path, auth?, handler(ctx) } -> mengembalikan [status, body]
const routes = [
  ...require("./routes/konsultasi"),
  ...require("./routes/troubleshooting"),
  ...require("./routes/riwayat"),
].map((r) => {
  const keys = [];
  const re = new RegExp("^" + r.path.replace(/:(\w+)/g, (_, k) => (keys.push(k), "([^/]+)")) + "/?$");
  return { ...r, re, keys };
});

const MAX_BODY = 20 * 1024;

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new HttpError(413, "Request terlalu besar.")); req.destroy(); }
      else chunks.push(c);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { reject(new HttpError(400, "JSON tidak valid.")); }
    });
    req.on("error", reject);
  });
}

function send(res, status, body) {
  if (res.headersSent) return;
  const json = status === 204 ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    // Frontend dibuka dari file:// atau Live Server (origin berbeda), jadi izinkan CORS.
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Email",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(json);
}

async function handle(req, res) {
  try {
    if (req.method === "OPTIONS") return send(res, 204);

    const url = new URL(req.url, "http://localhost");
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = r.re.exec(url.pathname);
      if (!m) continue;

      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      const ctx = {
        params,
        query: Object.fromEntries(url.searchParams),
        body: req.method === "POST" ? await readJson(req) : {},
        email: r.auth ? userEmail(req) : null,
      };
      const [status, body] = await r.handler(ctx);
      return send(res, status, body);
    }
    send(res, 404, { error: "Endpoint tidak ditemukan." });
  } catch (err) {
    if (err instanceof HttpError) return send(res, err.status, { error: err.message, ...err.extra });
    if (err instanceof URIError) return send(res, 400, { error: "URL tidak valid." });
    console.error(err);
    send(res, 500, { error: "Terjadi kesalahan pada server." });
  }
}

module.exports = http.createServer(handle);
