const db = require("../db");
const { devices, validateAnswers } = require("../devices");
const { HttpError } = require("../http");

function toTicket(row) {
  return {
    id: row.id,
    device: row.device,
    deviceLabel: devices[row.device]?.label ?? row.device,
    answers: JSON.parse(row.answers),
    status: row.status,
    createdAt: row.created_at,
  };
}

module.exports = [
  // Daftar jenis perangkat
  {
    method: "GET", path: "/api/konsultasi/devices",
    handler: () => [200, Object.entries(devices).map(([key, d]) => ({ key, label: d.label }))],
  },

  // Pertanyaan formulir untuk satu perangkat
  {
    method: "GET", path: "/api/konsultasi/devices/:device/form",
    handler: ({ params }) => {
      if (!Object.hasOwn(devices, params.device)) throw new HttpError(404, "Perangkat tidak ditemukan.");
      const d = devices[params.device];
      return [200, { device: params.device, label: d.label, questions: d.questions }];
    },
  },

  // Kirim konsultasi (tiket untuk customer service)
  {
    method: "POST", path: "/api/konsultasi", auth: true,
    handler: ({ body, email }) => {
      const { device, answers: input } = body;
      if (typeof device !== "string" || !Object.hasOwn(devices, device)) {
        throw new HttpError(400, "Jenis perangkat tidak valid.");
      }
      const { answers, errors } = validateAnswers(device, input);
      if (Object.keys(errors).length) throw new HttpError(400, "Formulir belum valid.", { fields: errors });

      const { lastInsertRowid } = db
        .prepare("INSERT INTO konsultasi (user_email, device, answers) VALUES (?, ?, ?)")
        .run(email, device, JSON.stringify(answers));
      return [201, toTicket(db.prepare("SELECT * FROM konsultasi WHERE id = ?").get(lastInsertRowid))];
    },
  },

  // Detail satu konsultasi milik pengguna
  {
    method: "GET", path: "/api/konsultasi/:id", auth: true,
    handler: ({ params, email }) => {
      const row = db
        .prepare("SELECT * FROM konsultasi WHERE id = ? AND user_email = ?")
        .get(Number(params.id), email);
      if (!row) throw new HttpError(404, "Konsultasi tidak ditemukan.");
      return [200, toTicket(row)];
    },
  },
];
