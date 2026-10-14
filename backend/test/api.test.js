process.env.DB_FILE = ":memory:";
const test = require("node:test");
const assert = require("node:assert/strict");

// Stub pencarian internet agar test tidak bergantung pada jaringan
const troubleshoot = require("../src/troubleshoot");
troubleshoot.searchSolutions = async (q) => [{ title: "T " + q, solution: "S", score: 1, source: "Super User", url: "http://x" }];

const app = require("../src/app");

let server, base;
test.before(async () => {
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://localhost:${server.address().port}`;
});
test.after(() => server.close());

const call = (path, { email = "a@b.com", method = "GET", body } = {}) =>
  fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(email && { "X-User-Email": email }) },
    body: body && JSON.stringify(body),
  });

const laptopForm = {
  merek_model: "Asus VivoBook", os: "Windows 11", gejala: "Lambat / hang",
  masalah: "Sangat lambat saat membuka aplikasi", sejak_kapan: "Beberapa hari",
};

test("daftar perangkat dan form per perangkat", async () => {
  const devices = await (await call("/api/konsultasi/devices", { email: null })).json();
  assert.ok(devices.some((d) => d.key === "laptop"));
  const form = await (await call("/api/konsultasi/devices/printer/form", { email: null })).json();
  assert.ok(form.questions.some((q) => q.id === "koneksi"));
  assert.equal((await call("/api/konsultasi/devices/__proto__/form", { email: null })).status, 404);
});

test("konsultasi: validasi, simpan, dan akses per pengguna", async () => {
  assert.equal((await call("/api/konsultasi", { method: "POST", email: null, body: {} })).status, 401);
  assert.equal((await call("/api/konsultasi", { method: "POST", body: { device: "toaster" } })).status, 400);

  const bad = await call("/api/konsultasi", { method: "POST", body: { device: "laptop", answers: { os: "Amiga" } } });
  assert.equal(bad.status, 400);
  const { fields } = await bad.json();
  assert.equal(fields.os, "Pilihan tidak valid.");
  assert.equal(fields.masalah, "Wajib diisi.");

  const ok = await call("/api/konsultasi", { method: "POST", body: { device: "laptop", answers: laptopForm } });
  assert.equal(ok.status, 201);
  const ticket = await ok.json();
  assert.equal(ticket.status, "open");
  assert.equal(ticket.answers.os, "Windows 11");

  assert.equal((await call(`/api/konsultasi/${ticket.id}`)).status, 200);
  assert.equal((await call(`/api/konsultasi/${ticket.id}`, { email: "lain@b.com" })).status, 404);
});

test("troubleshooting: validasi dan hasil", async () => {
  assert.equal((await call("/api/troubleshooting?q=a")).status, 400);
  assert.equal((await call("/api/troubleshooting?q=wifi lambat&device=toaster")).status, 400);
  const res = await call("/api/troubleshooting?q=tidak mau menyala&device=laptop");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.results.length, 1);
});

test("riwayat: hanya milik pengguna, gabungan, bisa difilter", async () => {
  const email = "riwayat@b.com";
  await call("/api/konsultasi", { email, method: "POST", body: { device: "laptop", answers: laptopForm } });
  await call("/api/troubleshooting?q=layar berkedip&device=monitor", { email });

  const all = await (await call("/api/riwayat", { email })).json();
  assert.deepEqual(all.items.map((i) => i.type).sort(), ["konsultasi", "troubleshooting"]);

  const only = await (await call("/api/riwayat?type=troubleshooting", { email })).json();
  assert.equal(only.items.length, 1);
  assert.equal(only.items[0].query, "layar berkedip");

  const other = await (await call("/api/riwayat", { email: "kosong@b.com" })).json();
  assert.equal(other.items.length, 0);
  assert.equal((await call("/api/riwayat?type=x", { email })).status, 400);
});
