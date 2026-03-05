import { pool } from "../config/db.js";

// Categorías permitidas
export const CATEGORIAS_PLANTA = [
  "sombra",
  "sol",
  "follage",
  "arboles",
  "palmas",
  "frutales",
  "arbustos",
  "suculentas",
  "plantas_exoticas",
  "maceta",
  "insumos_jardineria",
  "flete",
  "hierbas_de_olor",
  "mano_de_obra",
  "sin_categoria",
];

// ==========================
// GET /api/productos
// Soporta:
//   ?categoria=...
//   ?q=...
//   ?search=...
//   ?limit=...
// ==========================
export const getProductos = async (req, res) => {
  try {
    const categoria = String(req.query.categoria || "todas").trim();
    const q = String(req.query.q || req.query.search || "").trim();

    const limitRaw = Number(req.query.limit || 5000);
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0
        ? Math.min(limitRaw, 20000)
        : 5000;

    const filtros = [];
    const params = [];

    if (categoria && categoria !== "todas") {
      filtros.push("categoria_planta = ?");
      params.push(categoria);
    }

    if (q) {
      filtros.push("(codigo LIKE ? OR codigo_cat LIKE ? OR nombre LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT id, codigo, codigo_cat, nombre,
              precio_publico, precio_mayoreo, precio_vivero, precio_especial, costo,
              categoria_planta, stock, imagen_url
       FROM productos
       ${where}
       ORDER BY nombre ASC
       LIMIT ?`,
      [...params, limit]
    );

    return res.json({
      data: rows,
      meta: { total: rows.length, page: 1, limit, pages: 1 },
    });
  } catch (err) {
    console.error("ERROR GET /productos:", err);
    return res.status(500).json({
      error: "Error en BD",
      message: err.sqlMessage || err.message,
    });
  }
};

// ==========================
// POST /api/productos
// ==========================
export const crearProducto = async (req, res) => {
  try {
    const {
      codigo,
      nombre,
      precio_publico,
      precio_mayoreo,
      precio_vivero,
      precio_especial,
      costo,
      categoria_planta = "sin_categoria",
    } = req.body;

    const nombreL = String(nombre || "").trim();
    const codigoL = String(codigo || "").trim(); // opcional
    const cat = String(categoria_planta || "sin_categoria").trim();

    const pPub = Number(precio_publico);
    const pMay = Number(precio_mayoreo);
    const pViv = Number(precio_vivero);
    const pEsp = Number(precio_especial);
    const cst = Number(costo ?? 0);

    if (!nombreL) return res.status(400).json({ error: "Falta nombre" });

    if (![pPub, pMay, pViv, pEsp].every((n) => Number.isFinite(n) && n > 0)) {
      return res.status(400).json({ error: "Precios inválidos" });
    }

    if (!Number.isFinite(cst) || cst < 0) {
      return res.status(400).json({ error: "Costo inválido" });
    }

    if (!CATEGORIAS_PLANTA.includes(cat)) {
      return res.status(400).json({ error: "Categoría inválida" });
    }

    let r;

    if (codigoL) {
      [r] = await pool.query(
        `INSERT INTO productos
          (codigo, nombre, precio_publico, precio_mayoreo, precio_vivero, precio_especial, costo, categoria_planta)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [codigoL, nombreL, pPub, pMay, pViv, pEsp, cst, cat]
      );
    } else {
      [r] = await pool.query(
        `INSERT INTO productos
          (nombre, precio_publico, precio_mayoreo, precio_vivero, precio_especial, costo, categoria_planta)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nombreL, pPub, pMay, pViv, pEsp, cst, cat]
      );
    }

    const [nuevo] = await pool.query(
      `SELECT id, codigo, codigo_cat, nombre,
              precio_publico, precio_mayoreo, precio_vivero, precio_especial, costo,
              categoria_planta, stock, imagen_url
       FROM productos
       WHERE id = ?`,
      [r.insertId]
    );

    return res.status(201).json({
      mensaje: "Producto creado",
      data: nuevo[0] || { id: r.insertId, nombre: nombreL },
    });
  } catch (err) {
    console.error("ERROR POST /productos:", err);
    return res.status(500).json({
      error: "Error en BD",
      message: err.sqlMessage || err.message,
    });
  }
};

// ==========================
// PUT /api/productos/:id
// ==========================
export const editarProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      codigo, // opcional
      nombre,
      precio_publico,
      precio_mayoreo,
      precio_vivero,
      precio_especial,
      costo,
      categoria_planta = "sin_categoria",
    } = req.body;

    const idN = Number(id);
    if (!Number.isInteger(idN) || idN <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const nombreL = String(nombre || "").trim();
    const cat = String(categoria_planta || "sin_categoria").trim();

    const pPub = Number(precio_publico);
    const pMay = Number(precio_mayoreo);
    const pViv = Number(precio_vivero);
    const pEsp = Number(precio_especial);
    const cst = Number(costo ?? 0);

    if (!nombreL) return res.status(400).json({ error: "Falta nombre" });

    if (![pPub, pMay, pViv, pEsp].every((n) => Number.isFinite(n) && n > 0)) {
      return res.status(400).json({ error: "Precios inválidos" });
    }

    if (!Number.isFinite(cst) || cst < 0) {
      return res.status(400).json({ error: "Costo inválido" });
    }

    if (!CATEGORIAS_PLANTA.includes(cat)) {
      return res.status(400).json({ error: "Categoría inválida" });
    }

    let r;

    if (codigo !== undefined) {
      const codigoL = String(codigo || "").trim();

      [r] = await pool.query(
        `UPDATE productos
         SET codigo=?,
             nombre=?,
             precio_publico=?, precio_mayoreo=?, precio_vivero=?, precio_especial=?, costo=?,
             categoria_planta=?
         WHERE id=?`,
        [codigoL, nombreL, pPub, pMay, pViv, pEsp, cst, cat, idN]
      );
    } else {
      [r] = await pool.query(
        `UPDATE productos
         SET nombre=?,
             precio_publico=?, precio_mayoreo=?, precio_vivero=?, precio_especial=?, costo=?,
             categoria_planta=?
         WHERE id=?`,
        [nombreL, pPub, pMay, pViv, pEsp, cst, cat, idN]
      );
    }

    if (r.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const [actualizado] = await pool.query(
      `SELECT id, codigo, codigo_cat, nombre,
              precio_publico, precio_mayoreo, precio_vivero, precio_especial, costo,
              categoria_planta, stock, imagen_url
       FROM productos
       WHERE id = ?`,
      [idN]
    );

    return res.json({
      mensaje: "Producto actualizado",
      data: actualizado[0] || { id: idN, nombre: nombreL },
    });
  } catch (err) {
    console.error("ERROR PUT /productos/:id:", err);
    return res.status(500).json({
      error: "Error en BD",
      message: err.sqlMessage || err.message,
    });
  }
};

// ==========================
// DELETE /api/productos/:id
// ==========================
export const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const idN = Number(id);

    if (!Number.isInteger(idN) || idN <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const [r] = await pool.query(`DELETE FROM productos WHERE id = ?`, [idN]);

    if (r.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    return res.json({ mensaje: "Producto eliminado" });
  } catch (err) {
    console.error("ERROR DELETE /productos/:id:", err);
    return res.status(500).json({
      error: "Error en BD",
      message: err.sqlMessage || err.message,
    });
  }
};