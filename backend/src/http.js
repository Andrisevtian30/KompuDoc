// Pembantu kecil pengganti Express: error HTTP dan identifikasi pengguna.
class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// Frontend belum punya login sungguhan (hanya sessionStorage), jadi pengguna
// diidentifikasi lewat header X-User-Email. Ganti dengan token/sesi saat login backend ada.
// Simple no spam gitu.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function userEmail(req) {
  const email = String(req.headers["x-user-email"] || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    throw new HttpError(401, "Header X-User-Email tidak ada atau tidak valid.");
  }
  return email;
}

module.exports = { HttpError, userEmail };
