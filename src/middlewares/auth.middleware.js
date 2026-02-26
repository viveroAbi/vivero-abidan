import jwt from "jsonwebtoken";

export function authRequired(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Token requerido" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "Falta JWT_SECRET en el servidor" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, rol, usuario, nombre }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

// Middleware opcional por si quieres usar roles genéricos en otras rutas
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: "No tienes permisos" });
    }

    next();
  };
}