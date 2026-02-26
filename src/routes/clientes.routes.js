import { Router } from "express";
import {
  getClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
  activarCliente, // ✅ nuevo
} from "../controllers/clientes.controller.js";

const router = Router();

router.get("/", getClientes);
router.get("/:id", getClienteById);
router.post("/", createCliente);
router.put("/:id", updateCliente);
router.delete("/:id", deleteCliente);
// ✅ nueva ruta para reactivar cliente
router.patch("/:id/activar", activarCliente);

export default router;
