// ====== Login page ======
const form = document.getElementById("loginForm");

function setErr(field, msg) {
  document.getElementById(field + "Err").textContent = msg;
  document.getElementById(field).classList.toggle("invalid", Boolean(msg));
}

function validate() {
  const email = document.getElementById("email").value.trim();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  let ok = true;

  // Email
  if (!email) { setErr("email", "Email wajib diisi."); ok = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr("email", "Format email belum benar."); ok = false; }
  else setErr("email", "");

  // Username
  if (!username) { setErr("username", "Username wajib diisi."); ok = false; }
  else if (username.length < 3) { setErr("username", "Username minimal 3 karakter."); ok = false; }
  else setErr("username", "");

  // Password
  if (!password) { setErr("password", "Password wajib diisi."); ok = false; }
  else if (password.length < 6) { setErr("password", "Password minimal 6 karakter."); ok = false; }
  else setErr("password", "");

  return ok ? { email, username } : null;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const user = validate();
  if (!user) return;

  // TODO: nanti diganti request ke backend, misal:
  // fetch("/api/login", { method: "POST", body: JSON.stringify({...}) })

  // Simpan data user sementara, lalu pindah ke halaman berikutnya
  try {
    sessionStorage.setItem("kompudocUser", JSON.stringify(user));
  } catch (err) {
    // Beberapa browser (mode private) memblokir storage, tetap lanjut
  }
  window.location.href = "home.html";
});

// Tombol lihat / tutup password
const pwToggle = document.getElementById("pwToggle");
pwToggle.addEventListener("click", () => {
  const pw = document.getElementById("password");
  const show = pw.type === "password";
  pw.type = show ? "text" : "password";
  pwToggle.textContent = show ? "Tutup" : "Lihat";
});
