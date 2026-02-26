import { Router } from "express";
import {
  getVentas,
  crearVenta,
  getVentasHoy,
  getResumenVentas,
  eliminarVenta,
  getTicketVenta,
  obtenerVenta,
  editarVenta,
  crearBorrador,
  getBorradores,
  actualizarItemsBorrador,
  eliminarBorrador, // ✅ AGREGAR
} from "../controllers/ventas.controller.js";

const router = Router();

// ✅ BORRADORES PRIMERO (ANTES de /:id)
router.post("/borrador", crearBorrador);
router.get("/borradores", getBorradores);
router.delete("/borradores/:id", eliminarBorrador); // ✅ AGREGAR
router.put("/:id/items", actualizarItemsBorrador);

// normales
router.get("/hoy", getVentasHoy);
router.get("/resumen", getResumenVentas);

router.get("/", getVentas);
router.post("/", crearVenta);

// ticket antes de :id (por seguridad)
router.get("/:id/ticket", getTicketVenta);

// ✅ al final las rutas con :id
router.get("/:id", obtenerVenta);
router.put("/:id", editarVenta);
router.delete("/:id", eliminarVenta);

export default router;