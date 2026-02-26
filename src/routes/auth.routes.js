import { Router } from "express";
import jwt from "jsonwebtoken";

import {
  login,
  me,
  register,
  registerUserByAdmin,
} from "../controllers/auth.controller.js";

import { authRequired } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";

const router = Router();

// Middleware opcional: si viene token válido lo carga, si no, sigue sin error
function authOptional(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) return next();

    if (!process.env.JWT_SECRET) return next();

    const token = auth.slice(7);
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    // si token es inválido, no bloqueamos aquí (para permitir primer register)
    return next();
  }
}

// POST /api/auth/register
// - Primer usuario: crea admin
// - Después: solo admin (si manda token)
router.post("/register", authOptional, register);

// POST /api/auth/login
router.post("/login", login);

// GET /api/auth/me
router.get("/me", authRequired, me);

// POST /api/auth/register-user (solo admin)
// Body: { nombre, usuario, password, rol: "admin" | "vendedor" }
router.post("/register-user", authRequired, requireAdmin, registerUserByAdmin);

// (Opcional) compatibilidad con tu ruta anterior para crear vendedor
// Si quieres mantenerla temporalmente:
router.post("/register-vendedor", authRequired, requireAdmin, (req, res, next) => {
  req.body.rol = "vendedor";
  return registerUserByAdmin(req, res, next);
});

export default router;