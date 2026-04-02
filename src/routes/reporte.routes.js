import { Router } from "express";
import {
  reporteDiario,
  ticketCorteDiario,
  crearGasto,
  crearCierre,
  reporteProductos,
  reporteProductosPorCategoriaPDF,
} from "../controllers/reporte.controller.js";
import { authRequired } from "../middlewares/auth.middleware.js";

const router = Router();

// Rutas que ya tienes (ejemplo)
router.get("/diario", authRequired, reporteDiario);
router.get("/corte/ticket", authRequired, ticketCorteDiario);
router.post("/gastos", authRequired, crearGasto);
router.post("/cierres", authRequired, crearCierre);
router.get("/productos-categoria/pdf", reporteProductosPorCategoriaPDF);

// ✅ Nueva ruta
router.get("/productos", authRequired, reporteProductos);

export default router;