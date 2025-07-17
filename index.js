const express = require("express");
const multer = require("multer");
const fs = require("fs-extra");
const path = require("path");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3000;

// 📁 Path penting
const TEMPLATE_DIR = path.join(__dirname, "template");
const OUTPUT_DIR = path.join(__dirname, "output");

// 🌐 CORS: biar frontend beda domain bisa akses
app.use(
  cors({
    origin: "*", // Ganti dengan domain frontend kamu untuk keamanan
  })
);

// 🔧 Middleware static file
app.use("/flipbook", express.static(OUTPUT_DIR));
app.use(express.static(__dirname)); // Untuk akses file HTML, JS, dll

// 📤 Konfigurasi Multer: upload max 20 JPG
const upload = multer({ dest: "uploads/" });

// 🖼️ Upload banyak JPG & Buat Flipbook
app.post("/upload-jpgs", upload.array("files", 20), async (req, res) => {
  const files = req.files;
  const id = uuidv4(); // 🔑 ID unik
  const tempFolder = path.join(OUTPUT_DIR, "temp-uploads", id);
  await fs.mkdirp(tempFolder);

  try {
    // ✅ Filter file gambar JPG
    const jpgFiles = files.filter((f) => /^image\/jpe?g$/i.test(f.mimetype));
    if (jpgFiles.length === 0) {
      return res.status(400).json({ error: "Tidak ada file JPG valid bro 😤" });
    }

    // 📦 Simpan file dengan nama berurutan (0001.jpg, dst)
    for (let i = 0; i < jpgFiles.length; i++) {
      const ext = path.extname(jpgFiles[i].originalname).toLowerCase();
      const filename = `${String(i + 1).padStart(4, "0")}${ext}`;
      const destPath = path.join(tempFolder, filename);
      await fs.move(jpgFiles[i].path, destPath);
    }

    // 📁 Salin template ke output/[id]
    const flipbookDir = path.join(OUTPUT_DIR, id);
    await fs.copy(TEMPLATE_DIR, flipbookDir);

    // 📁 Pindahkan JPG ke folder pages_new
    const targetPagesDir = path.join(flipbookDir, "pages_new");
    await fs.ensureDir(targetPagesDir);

    const jpgList = await fs.readdir(tempFolder);
    for (const file of jpgList) {
      const src = path.join(tempFolder, file);
      const dest = path.join(targetPagesDir, file);
      await fs.move(src, dest);
    }

    // 🧹 Hapus folder sementara
    await fs.remove(tempFolder);

    res.json({
      message: "Flipbook berhasil dibuat! 📖",
      folder_id: id,
      total_pages: jpgList.length,
      url: `https://server-flipbook-production.up.railway.app/flipbook/${id}`, // Ganti ke domain Vercel jika online
    });
  } catch (err) {
    console.error("❌ Error proses flipbook:", err);
    res.status(500).json({ error: "Gagal proses flipbook bro 😵" });
  }
});

// 🚀 Jalankan server
app.listen(PORT, () => {
  console.log(`🚀 Server jalan di http://localhost:${PORT}`);
});
