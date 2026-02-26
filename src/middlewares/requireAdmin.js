export function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (req.user.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado: solo admin" });
    }

    next();
  } catch (error) {
    console.error("ERROR requireAdmin:", error);
    return res.status(500).json({ error: "Error interno en autorización" });
  }
}