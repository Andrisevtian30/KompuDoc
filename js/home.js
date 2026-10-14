// ====== Home page ======
let data = null;
let storageOk = true;
try {
  data = sessionStorage.getItem("kompudocUser");
} catch (err) {
  storageOk = false; // storage diblokir browser
}

// Kalau belum login, kembalikan ke halaman login
if (storageOk && !data) {
  window.location.href = "index.html";
} else if (data) {
  const user = JSON.parse(data);
  document.getElementById("helloName").textContent = user.username;
  document.getElementById("helloEmail").textContent = user.email;
}

// ====== Tab: Konsultasi / Troubleshooting / Riwayat ======
const API = "http://localhost:3000/api";
const panel = document.getElementById("panel");
const email = data ? JSON.parse(data).email : "";

async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(API + path, {
      ...options,
      headers: { "Content-Type": "application/json", "X-User-Email": email },
    });
  } catch (err) {
    throw new Error("Server tidak dapat dihubungi. Pastikan backend berjalan.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(body.error || "Terjadi kesalahan."); e.fields = body.fields; throw e; }
  return body;
}

// Pembantu DOM (pakai textContent, bukan innerHTML, agar aman dari XSS)
function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}
function field(label, input, id) {
  return el("div", { className: "field" },
    el("label", { htmlFor: id, textContent: label }), input,
    el("small", { className: "err", id: id + "Err" }));
}
function show(...nodes) { panel.hidden = false; panel.replaceChildren(...nodes); }
function note(text, cls = "sub") { return el("p", { className: cls, textContent: text }); }
const fmtDate = (iso) => new Date(iso).toLocaleString("id-ID");

const tabs = { konsultasi: tabKonsultasi, troubleshooting: tabTroubleshooting, riwayat: tabRiwayat };
document.querySelectorAll(".menu button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".menu button").forEach((b) => b.classList.toggle("active", b === btn));
    tabs[btn.dataset.tab]().catch((err) => show(note(err.message, "err")));
  });
});

async function tabKonsultasi() {
  show(note("Memuat..."));
  const devices = await api("/konsultasi/devices");
  const pick = el("select", { id: "device" }, el("option", { value: "", textContent: "Pilih perangkat..." }),
    ...devices.map((d) => el("option", { value: d.key, textContent: d.label })));
  const formBox = el("div");
  show(el("h3", { textContent: "Konsultasi dengan teknisi" }), field("Jenis perangkat", pick, "device"), formBox);

  pick.addEventListener("change", async () => {
    formBox.replaceChildren();
    if (!pick.value) return;
    try {
      const { questions } = await api(`/konsultasi/devices/${pick.value}/form`);
      formBox.replaceChildren(buildForm(pick.value, questions));
    } catch (err) { formBox.replaceChildren(note(err.message, "err")); }
  });
}

function buildForm(device, questions) {
  const form = el("form", { noValidate: true });
  for (const q of questions) {
    let input;
    if (q.type === "select") {
      input = el("select", { id: q.id }, el("option", { value: "", textContent: "Pilih..." }),
        ...q.options.map((o) => el("option", { value: o, textContent: o })));
    } else {
      input = el(q.type === "textarea" ? "textarea" : "input", { id: q.id, maxLength: q.maxLength || 500 });
    }
    form.append(field(q.required === false ? q.label + " (opsional)" : q.label, input, q.id));
  }
  const status = el("small", { className: "err" });
  form.append(el("button", { type: "submit", className: "btn", textContent: "Kirim ke teknisi" }), status);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const answers = {};
    questions.forEach((q) => { answers[q.id] = form.querySelector("#" + q.id).value; });
    try {
      const ticket = await api("/konsultasi", { method: "POST", body: JSON.stringify({ device, answers }) });
      show(note(`Konsultasi #${ticket.id} terkirim. Teknisi kami akan menanganinya.`, "ok"));
    } catch (err) {
      status.textContent = err.message;
      questions.forEach((q) => {
        const msg = err.fields?.[q.id] || "";
        form.querySelector("#" + q.id + "Err").textContent = msg;
        form.querySelector("#" + q.id).classList.toggle("invalid", Boolean(msg));
      });
    }
  });
  return form;
}

async function tabTroubleshooting() {
  const devices = await api("/konsultasi/devices");
  const pick = el("select", { id: "tsDevice" }, el("option", { value: "", textContent: "Semua perangkat" }),
    ...devices.map((d) => el("option", { value: d.key, textContent: d.label })));
  const q = el("input", { id: "tsQuery", placeholder: "mis. tidak mau menyala", maxLength: 200 });
  const results = el("div", { className: "field" });
  const form = el("form", { noValidate: true },
    field("Perangkat", pick, "tsDevice"), field("Masalah", q, "tsQuery"),
    el("button", { type: "submit", className: "btn", textContent: "Cari solusi" }));
  show(el("h3", { textContent: "Troubleshooting" }), form, results);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    results.replaceChildren(note("Mencari di internet..."));
    try {
      const params = new URLSearchParams({ q: q.value.trim() });
      if (pick.value) params.set("device", pick.value);
      const { results: found } = await api("/troubleshooting?" + params);
      results.replaceChildren(...(found.length
        ? found.map((r) => el("div", { className: "item" },
            el("strong", { textContent: r.title }),
            el("p", { textContent: r.solution }),
            el("a", { href: r.url, target: "_blank", rel: "noopener noreferrer", textContent: "Sumber: " + r.source })))
        : [note("Tidak ada solusi yang ditemukan. Coba kata kunci lain atau gunakan Konsultasi.")]));
    } catch (err) { results.replaceChildren(note(err.message, "err")); }
  });
}

async function tabRiwayat() {
  show(note("Memuat..."));
  const { items } = await api("/riwayat");
  show(el("h3", { textContent: "Riwayat" }), ...(items.length
    ? items.map((i) => el("div", { className: "item" },
        el("strong", { textContent: i.type === "konsultasi"
          ? `Konsultasi #${i.id} - ${i.deviceLabel ?? ""} (${i.status})`
          : `Troubleshooting - ${i.query}` }),
        i.type === "konsultasi" ? el("p", { textContent: i.answers.masalah ?? "" }) : "",
        el("span", { className: "sub", textContent: fmtDate(i.createdAt) })))
    : [note("Belum ada riwayat.")]));
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  try { sessionStorage.removeItem("kompudocUser"); } catch (err) {}
  window.location.href = "index.html";
});
