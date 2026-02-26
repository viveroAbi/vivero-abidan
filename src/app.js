import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./config/db.js"; // ajusta tu ruta
import ventasRoutes from "./routes/ventas.routes.js";
import authRoutes from "./routes/auth.routes.js";
import productosRoutes from "./routes/productos.routes.js";
import reporteRoutes from "./routes/reporte.routes.js";
import clientesRoutes from "./routes/clientes.routes.js";
import inventarioRoutes from "./routes/inventario.routes.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "../public")));

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", mensaje: "API Vivero Abidan funcionando 🌱" });
});
await pool.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
await pool.query("SET collation_connection = 'utf8mb4_unicode_ci'");
await pool.query("SET character_set_connection = 'utf8mb4'");
console.log("✅ Conexión MySQL en utf8mb4_unicode_ci");
app.use("/api/auth", authRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/ventas", ventasRoutes);
app.use("/api/reporte", reporteRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/inventario", inventarioRoutes);
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
);
