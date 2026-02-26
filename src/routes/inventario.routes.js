import { Router } from "express";
import {
  getInventario,
  entradaInventario,
  salidaInventario,
  ajusteInventario,
  getMovimientos,
} from "../controllers/inventario.controller.js";

import { authRequired } from "../middlewares/auth.middleware.js";
// opcional:
// import { requireAdmin } from "../middlewares/requireAdmin.js";

const router = Router();

// Listado de inventario
router.get("/", authRequired, getInventario);

// Movimientos
router.get("/movimientos", authRequired, getMovimientos);

// Entradas / salidas / ajustes
router.post("/entrada", authRequired, entradaInventario);
router.post("/salida", authRequired, salidaInventario);
router.post("/ajuste", authRequired, ajusteInventario);

export default router;