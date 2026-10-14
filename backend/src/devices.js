// Jenis perangkat dan pertanyaan formulir konsultasi untuk masing-masing perangkat.
// type: text | textarea | select ; semua field wajib kecuali required === false.
const common = [
  { id: "masalah", label: "Jelaskan masalah Anda", type: "textarea", maxLength: 2000 },
  { id: "sejak_kapan", label: "Sejak kapan masalah terjadi?", type: "select",
    options: ["Baru saja", "Beberapa hari", "Beberapa minggu", "Lebih dari sebulan"] },
];

const devices = {
  laptop: {
    label: "Laptop",
    questions: [
      { id: "merek_model", label: "Merek dan model laptop", type: "text", maxLength: 100 },
      { id: "os", label: "Sistem operasi", type: "select", options: ["Windows 10", "Windows 11", "macOS", "Linux", "Lainnya"] },
      { id: "gejala", label: "Gejala utama", type: "select",
        options: ["Tidak mau menyala", "Lambat / hang", "Blue screen / restart sendiri", "Baterai boros / tidak mengisi", "Overheat / kipas bising", "Layar bermasalah", "Lainnya"] },
      ...common,
    ],
  },
  pc: {
    label: "PC Desktop",
    questions: [
      { id: "spesifikasi", label: "Spesifikasi singkat (CPU, RAM, GPU)", type: "text", maxLength: 200, required: false },
      { id: "os", label: "Sistem operasi", type: "select", options: ["Windows 10", "Windows 11", "Linux", "Lainnya"] },
      { id: "gejala", label: "Gejala utama", type: "select",
        options: ["Tidak mau menyala", "Menyala tetapi tidak ada tampilan", "Lambat / hang", "Blue screen / restart sendiri", "Bunyi beep", "Overheat", "Lainnya"] },
      ...common,
    ],
  },
  printer: {
    label: "Printer",
    questions: [
      { id: "merek_model", label: "Merek dan model printer", type: "text", maxLength: 100 },
      { id: "jenis", label: "Jenis printer", type: "select", options: ["Inkjet", "Laser", "Tinta tank", "Dot matrix"] },
      { id: "koneksi", label: "Jenis koneksi", type: "select", options: ["USB", "Wi-Fi", "LAN", "Bluetooth"] },
      { id: "gejala", label: "Gejala utama", type: "select",
        options: ["Tidak terdeteksi komputer", "Kertas macet", "Hasil cetak bergaris / pudar", "Tidak mau mencetak", "Error lampu berkedip", "Lainnya"] },
      ...common,
    ],
  },
  jaringan: {
    label: "Jaringan / Wi-Fi",
    questions: [
      { id: "perangkat", label: "Perangkat yang bermasalah", type: "text", maxLength: 100 },
      { id: "isp", label: "Penyedia internet (ISP)", type: "text", maxLength: 100, required: false },
      { id: "gejala", label: "Gejala utama", type: "select",
        options: ["Tidak ada koneksi", "Koneksi lambat", "Sering terputus", "Wi-Fi tidak terdeteksi", "Terhubung tetapi tanpa internet", "Lainnya"] },
      ...common,
    ],
  },
  monitor: {
    label: "Monitor",
    questions: [
      { id: "merek_model", label: "Merek dan model monitor", type: "text", maxLength: 100 },
      { id: "kabel", label: "Jenis kabel", type: "select", options: ["HDMI", "DisplayPort", "VGA", "DVI", "USB-C"] },
      { id: "gejala", label: "Gejala utama", type: "select",
        options: ["Tidak ada sinyal", "Layar berkedip", "Garis / piksel rusak", "Warna aneh", "Resolusi tidak sesuai", "Lainnya"] },
      ...common,
    ],
  },
};

// Validasi jawaban terhadap formulir perangkat. Mengembalikan { answers, errors }.
function validateAnswers(deviceKey, input) {
  const device = devices[deviceKey];
  const errors = {};
  const answers = {};
  const src = input && typeof input === "object" && !Array.isArray(input) ? input : {};

  for (const q of device.questions) {
    const raw = src[q.id];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) {
      if (q.required !== false) errors[q.id] = "Wajib diisi.";
      continue;
    }
    if (q.type === "select" && !q.options.includes(value)) {
      errors[q.id] = "Pilihan tidak valid.";
    } else if (value.length > (q.maxLength || 500)) {
      errors[q.id] = `Maksimal ${q.maxLength || 500} karakter.`;
    } else {
      answers[q.id] = value;
    }
  }
  return { answers, errors };
}

module.exports = { devices, validateAnswers };
