const db = require("../db");
const { devices } = require("../devices");
const { HttpError } = require("../http");
const troubleshoot = require("../troubleshoot");

module.exports = [
  // GET /api/troubleshooting?q=tidak mau menyala&device=laptop
  {
    method: "GET", path: "/api/troubleshooting", auth: true,
    handler: async ({ query, email }) => {
      const q = (query.q || "").trim();
      if (q.length < 3 || q.length > 200) throw new HttpError(400, "Parameter q wajib diisi (3-200 karakter).");
      const device = query.device || null;
      if (device && !Object.hasOwn(devices, device)) throw new HttpError(400, "Jenis perangkat tidak valid.");

      // Tambahkan nama perangkat agar hasil lebih relevan
      const search = device ? `${devices[device].label} ${q}` : q;

      let results;
      try {
        results = await troubleshoot.searchSolutions(search);
      } catch (err) {
        console.error("troubleshooting search failed:", err.message);
        throw new HttpError(502, "Gagal mengambil informasi dari internet. Coba lagi nanti.");
      }

      db.prepare("INSERT INTO troubleshooting_log (user_email, device, query) VALUES (?, ?, ?)")
        .run(email, device, q);
      return [200, { query: q, device, results }];
    },
  },
];
