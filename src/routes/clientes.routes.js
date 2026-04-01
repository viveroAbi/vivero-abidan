import { Router } from "express";
import {
  getClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
  activarCliente,
  getAdeudosCliente,
  registrarAbonoAdeudo,
} from "../controllers/clientes.controller.js";

const router = Router();

router.get("/", getClientes);
router.get("/:id/adeudos", getAdeudosCliente);
router.get("/:id", getClienteById);
router.post("/", createCliente);
router.put("/:id", updateCliente);
router.delete("/:id", deleteCliente);
router.patch("/:id/activar", activarCliente);
router.post("/:id/adeudos/:ventaId/abono", registrarAbonoAdeudo);

export default router;