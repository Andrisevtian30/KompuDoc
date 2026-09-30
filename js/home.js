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

document.getElementById("logoutBtn").addEventListener("click", () => {
  try { sessionStorage.removeItem("kompudocUser"); } catch (err) {}
  window.location.href = "index.html";
});
