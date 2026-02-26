import { pool } from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const ROLES_VALIDOS = ["admin", "vendedor"];

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("Falta JWT_SECRET en variables de entorno");
  }

  return jwt.sign(
    {
      id: user.id,
      rol: user.rol,
      usuario: user.usuario,
      nombre: user.nombre ?? null,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

// POST /api/auth/register
// Regla:
// - Si NO hay usuarios: permite crear el primer admin (forzado a admin)
// - Si YA hay usuarios: solo admin puede crear nuevos usuarios (admin o vendedor)
export const register = async (req, res) => {
  try {
    const { nombre = null, usuario, password, rol = "vendedor" } = req.body;

    if (!usuario || !password) {
      return res
        .status(400)
        .json({ error: "Faltan campos (usuario, password)" });
    }

    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ error: "Rol inválido" });
    }

    // Contar usuarios
    const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM usuarios");
    const totalUsers = Number(countRows?.[0]?.total || 0);

    // Si ya hay usuarios, solo admin puede registrar
    if (totalUsers > 0) {
      if (!req.user || req.user.rol !== "admin") {
        return res.status(403).json({
          error: "Registro público deshabilitado. Solo admin puede registrar usuarios",
        });
      }
    }

    // Validar usuario único
    const [exists] = await pool.query(
      "SELECT id FROM usuarios WHERE usuario = ? LIMIT 1",
      [usuario]
    );

    if (exists.length > 0) {
      return res.status(400).json({ error: "Ese usuario ya existe" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    // Si es el primer usuario, SIEMPRE admin
    const finalRol = totalUsers === 0 ? "admin" : rol;

    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)",
      [nombre, usuario, password_hash, finalRol]
    );

    return res.status(201).json({
      mensaje:
        finalRol === "admin"
          ? "Administrador creado correctamente"
          : "Vendedor creado correctamente",
      user: {
        id: result.insertId,
        nombre,
        usuario,
        rol: finalRol,
      },
    });
  } catch (err) {
    console.error("ERROR register:", err);
    return res.status(500).json({
      error: "Error en servidor",
      message: err.sqlMessage || err.message,
    });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res
        .status(400)
        .json({ error: "Faltan campos (usuario, password)" });
    }

    const [rows] = await pool.query(
      "SELECT id, nombre, usuario, password_hash, rol FROM usuarios WHERE usuario = ? LIMIT 1",
      [usuario]
    );

    if (!rows.length) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const user = rows[0];

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = signToken(user);

    return res.json({
      mensaje: "Login correcto",
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol,
      },
    });
  } catch (err) {
    console.error("ERROR login:", err);
    return res.status(500).json({
      error: "Error en servidor",
      message: err.sqlMessage || err.message,
    });
  }
};

// GET /api/auth/me
export const me = async (req, res) => {
  try {
    return res.json({ user: req.user });
  } catch (err) {
    console.error("ERROR me:", err);
    return res.status(500).json({ error: "Error en servidor" });
  }
};

// POST /api/auth/register-user (solo admin)
// Permite crear admin o vendedor
export const registerUserByAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.rol !== "admin") {
      return res.status(403).json({ error: "Solo admin puede crear usuarios" });
    }

    const { nombre = null, usuario, password, rol = "vendedor" } = req.body;

    if (!usuario || !password) {
      return res
        .status(400)
        .json({ error: "Faltan campos (usuario, password)" });
    }

    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ error: "Rol inválido" });
    }

    const [exists] = await pool.query(
      "SELECT id FROM usuarios WHERE usuario = ? LIMIT 1",
      [usuario]
    );

    if (exists.length > 0) {
      return res.status(400).json({ error: "Ese usuario ya existe" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)",
      [nombre, usuario, password_hash, rol]
    );

    return res.status(201).json({
      mensaje: rol === "admin" ? "Administrador creado" : "Vendedor creado",
      user: {
        id: result.insertId,
        nombre,
        usuario,
        rol,
      },
    });
  } catch (err) {
    console.error("ERROR registerUserByAdmin:", err);
    return res.status(500).json({
      error: "Error en servidor",
      message: err.sqlMessage || err.message,
    });
  }
};