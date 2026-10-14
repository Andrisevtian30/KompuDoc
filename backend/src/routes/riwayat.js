const db = require("../db");
const { devices } = require("../devices");
const { HttpError } = require("../http");

module.exports = [
  // GET /api/riwayat?type=konsultasi|troubleshooting&limit=20&offset=0
  // Gabungan konsultasi dan pencarian troubleshooting milik pengguna, terbaru dulu.
  {
    method: "GET", path: "/api/riwayat", auth: true,
    handler: ({ query, email }) => {
      const { type } = query;
      if (type !== undefined && type !== "konsultasi" && type !== "troubleshooting") {
        throw new HttpError(400, "type harus konsultasi atau troubleshooting.");
      }
      const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
      const offset = Math.max(parseInt(query.offset, 10) || 0, 0);

      const parts = [];
      if (!type || type === "konsultasi") {
        parts.push(`SELECT 'konsultasi' AS type, id, device, status, answers AS detail, created_at
                    FROM konsultasi WHERE user_email = @email`);
      }
      if (!type || type === "troubleshooting") {
        parts.push(`SELECT 'troubleshooting' AS type, id, device, NULL AS status, query AS detail, created_at
                    FROM troubleshooting_log WHERE user_email = @email`);
      }
      const rows = db
        .prepare(`SELECT * FROM (${parts.join(" UNION ALL ")}) ORDER BY created_at DESC, id DESC LIMIT @limit OFFSET @offset`)
        .all({ email, limit, offset });

      const items = rows.map((r) => {
        const base = {
          type: r.type,
          id: r.id,
          device: r.device,
          deviceLabel: devices[r.device]?.label ?? r.device,
          createdAt: r.created_at,
        };
        return r.type === "konsultasi"
          ? { ...base, status: r.status, answers: JSON.parse(r.detail) }
          : { ...base, query: r.detail };
      });
      return [200, { items, limit, offset }];
    },
  },
];
