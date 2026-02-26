import multer from "multer";
import path from "path";
import fs from "fs";

const dir = "public/productos";
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safe = (file.originalname || "img")
      .replace(ext, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);

    cb(null, `${Date.now()}_${safe}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const permitidos = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (!permitidos.includes(file.mimetype)) {
    return cb(new Error("Solo se permiten imágenes JPG, PNG o WEBP"));
  }
  cb(null, true);
}

export const uploadProductoImagen = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
});