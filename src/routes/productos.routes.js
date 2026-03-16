import { Router } from "express";
import { pool } from "../config/db.js";
import { uploadProductoImagen } from "../middlewares/uploadProductoImagen.js";

const router = Router();

const CATEGORIAS_PLANTA = [
  "sombra", "sol", "follage", "arboles", "palmas", "frutales", "arbustos",
  "suculentas", "plantas_exoticas", "maceta", "insumos_jardineria",
  "flete", "hierbas_de_olor", "mano_de_obra",
  "sin_categoria"
];

// ==========================
// POST /api/productos
// (NO requiere codigo; se auto-genera codigo_cat y codigo)
// ==========================
router.post("/", uploadProductoImagen.single("imagen"), async (req, res) => {
  let conn;

  try {
    const {
      nombre,
      precio_publico,
      precio_mayoreo,
      precio_vivero,
      precio_especial,
      costo,
      categoria_planta,
    } = req.body;

    if (!nombre) return res.status(400).json({ error: "Falta nombre" });

    const nombreL = String(nombre || "").trim();

    const pPub = Number(precio_publico);
    const pMay = Number(precio_mayoreo);
    const pViv = Number(precio_vivero);
    const pEsp = Number(precio_especial);
    const cst  = Number(costo ?? 0);

    const cat = categoria_planta ? String(categoria_planta).trim() : "sin_categoria";

    // ✅ imagen (si subieron archivo)
    const imagen_url = req.file ? `/public/productos/${req.file.filename}` : null;

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

    // ✅ usar conexión dedicada para transacción
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 1) Obtener prefijo de la categoría
    const [[prefRow]] = await conn.query(
      `SELECT prefijo
       FROM categorias_prefijo
       WHERE categoria = ?
       LIMIT 1`,
      [cat]
    );
    const prefijo = prefRow?.prefijo || "SIN";

    // 2) Calcular siguiente consecutivo (bloqueado)
    const [[nextRow]] = await conn.query(
      `SELECT IFNULL(
          MAX(CAST(SUBSTRING_INDEX(codigo_cat,'-',-1) AS UNSIGNED)),
          0
        ) + 1 AS next
       FROM productos
       WHERE categoria_planta = ?
         AND codigo_cat LIKE CONCAT(?, '-%')
       FOR UPDATE`,
      [cat, prefijo]
    );

    const next = Number(nextRow?.next || 1);
    const codigoCat = `${prefijo}-${String(next).padStart(5, "0")}`;

    // 3) Insert final
    const [r] = await conn.query(
      `INSERT INTO productos
        (codigo, codigo_cat, nombre, precio,
         precio_publico, precio_mayoreo, precio_vivero, precio_especial, costo,
         categoria_planta, imagen_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigoCat,
        codigoCat,
        nombreL,
        pPub,    // compatibilidad
        pPub,
        pMay,
        pViv,
        pEsp,
        cst,
        cat,
        imagen_url
      ]
    );

    const insertId = r.insertId;

    // 4) Leer registro creado
    const [[row]] = await conn.query(
      `SELECT
         id, codigo, codigo_cat, nombre,
         precio_publico, precio_mayoreo, precio_vivero, precio_especial, costo,
         categoria_planta, stock, activo, imagen_url
       FROM productos
       WHERE id=?`,
      [insertId]
    );

    await conn.commit();
    conn.release();

    return res.json({
      mensaje: "Producto creado",
      data: row,
    });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
        conn.release();
      } catch (_) {}
    }

    if (err?.code === "ER_DUP_ENTRY") {
      console.error("CHOQUE UNIQUE codigo/codigo_cat:", err.sqlMessage);
      return res.status(409).json({ error: "Choque de folio, vuelve a intentar" });
    }

    console.error("ERROR POST /api/productos:", err);
    return res.status(500).json({
      error: "Error al crear producto",
      message: err.message,
    });
  }
});

// ==========================
// GET /api/productos
// /api/productos?q=abc
// /api/productos?categoria=hierbas_de_olor&q=HDO
// ==========================
router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q ?? req.query.search ?? "").trim();
    const categoria = String(req.query.categoria ?? "").trim();

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "200", 10), 1), 2000);
    const offset = (page - 1) * limit;

    // ✅ Base: ocultar los viejos TMP/null
    const whereParts = ["codigo_cat IS NOT NULL", "activo = 1"];
    const params = [];

    if (q) {
      whereParts.push(
        `(codigo COLLATE utf8mb4_unicode_ci LIKE ? 
          OR codigo_cat COLLATE utf8mb4_unicode_ci LIKE ? 
          OR nombre COLLATE utf8mb4_unicode_ci LIKE ?)`
      );
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (categoria && categoria !== "todas") {
      whereParts.push(
        `categoria_planta COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci`
      );
      params.push(categoria);
    }

    const where = `WHERE ${whereParts.join(" AND ")}`;

    const [rows] = await pool.query(
      `
      SELECT id, codigo, codigo_cat, nombre,
             precio_publico, precio_mayoreo, precio_vivero, precio_especial, costo,
             categoria_planta, stock, imagen_url
      FROM productos
      ${where}
      ORDER BY nombre ASC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    const [[countRow]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM productos
      ${where}
      `,
      params
    );

    return res.json({
      data: rows,
      meta: {
        total: countRow.total,
        page,
        limit,
        pages: Math.ceil(countRow.total / limit),
      },
    });
  } catch (err) {
    console.error("ERROR GET /api/productos:", err);
    return res.status(500).json({ error: "Error al listar productos", message: err.message });
  }
});

// ==========================
// GET /api/productos/buscar?q=texto
// Para autocompletado
// ==========================
router.get("/buscar", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) return res.json({ mensaje: "Sin término de búsqueda", data: [] });

    const like = `%${q}%`;

    const [rows] = await pool.query(
      `
      SELECT id, codigo, codigo_cat, nombre,
             precio_publico, precio_mayoreo, precio_vivero, precio_especial, costo,
             categoria_planta, stock, activo, imagen_url
      FROM productos
     WHERE activo = 1
  AND (nombre LIKE ? OR codigo LIKE ? OR codigo_cat LIKE ?)
      ORDER BY nombre ASC
      LIMIT 15
      `,
      [like, like, like]
    );

    return res.json({ mensaje: "Sugerencias", data: rows });
  } catch (err) {
    console.error("ERROR GET /productos/buscar:", err);
    return res.status(500).json({ error: "Error en BD", message: err.sqlMessage || err.message });
  }
});

// ==========================
// PUT /api/productos/:id
// ==========================
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      nombre,
      precio_publico,
      precio_mayoreo,
      precio_vivero,
      precio_especial,
      costo,
      categoria_planta = "sin_categoria",
    } = req.body;

    if (!id) return res.status(400).json({ error: "ID inválido" });
    if (!nombre) return res.status(400).json({ error: "Falta nombre" });

    const nombreL = String(nombre || "").trim();
    const pPub = Number(precio_publico);
    const pMay = Number(precio_mayoreo);
    const pViv = Number(precio_vivero);
    const pEsp = Number(precio_especial);
    const cst  = Number(costo ?? 0);
    const cat  = String(categoria_planta || "sin_categoria").trim();

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

    const [r] = await pool.query(
      `UPDATE productos
       SET nombre=?,
           precio=?,
           precio_publico=?,
           precio_mayoreo=?,
           precio_vivero=?,
           precio_especial=?,
           costo=?,
           categoria_planta=?
       WHERE id=?`,
      [nombreL, pPub, pPub, pMay, pViv, pEsp, cst, cat, id]
    );

    if (r.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const [[row]] = await pool.query(
      `SELECT id, codigo, codigo_cat, nombre,
              precio_publico, precio_mayoreo, precio_vivero, precio_especial, costo,
              categoria_planta, stock, imagen_url
       FROM productos
       WHERE id=?`,
      [id]
    );

    return res.json({ mensaje: "Producto actualizado", data: row });
  } catch (err) {
    console.error("ERROR PUT /api/productos/:id:", err);
    return res.status(500).json({ error: "Error al editar producto", message: err.message });
  }
});

// ==========================
// DELETE /api/productos/:id
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const [r] = await pool.query(
      `UPDATE productos
       SET activo = 0
       WHERE id = ?`,
      [id]
    );

    if (r.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    return res.json({ mensaje: "Producto eliminado" });
  } catch (err) {
    console.error("ERROR DELETE /api/productos/:id:", err);
    return res.status(500).json({
      error: "Error al eliminar producto",
      message: err.message,
    });
  }
});

export default router;