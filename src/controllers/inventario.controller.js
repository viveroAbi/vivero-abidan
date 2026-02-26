import { pool } from "../config/db.js";

// GET /api/inventario
export const getInventario = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        codigo,
        codigo_cat,
        nombre,
        precio,
        COALESCE(stock, 0) AS stock,
        categoria_planta
      FROM productos
      ORDER BY nombre ASC
    `);

    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("getInventario:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// POST /api/inventario/entrada
export const entradaInventario = async (req, res) => {
  let conn;
  try {
    const { productoId, cantidad, referencia } = req.body;

    const id = Number(productoId);
    const cant = Number(cantidad);

    if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(cant) || cant <= 0) {
      return res.status(400).json({ ok: false, error: "Datos inválidos" });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Bloquear producto para evitar conflictos
    const [[prod]] = await conn.query(
      "SELECT id, stock FROM productos WHERE id = ? FOR UPDATE",
      [id]
    );

    if (!prod) {
      await conn.rollback();
      return res.status(404).json({ ok: false, error: "Producto no encontrado" });
    }

    // Sumar stock
    await conn.query(
      "UPDATE productos SET stock = COALESCE(stock, 0) + ? WHERE id = ?",
      [cant, id]
    );

    // Registrar movimiento (si existe la tabla inventario_movimientos)
    await conn.query(
      `INSERT INTO inventario_movimientos
        (producto_id, tipo, cantidad, motivo, referencia, usuario_id)
       VALUES (?, 'ENTRADA', ?, 'compra', ?, ?)`,
      [id, cant, referencia || null, req.user?.id || null]
    );

    await conn.commit();
    return res.json({ ok: true, mensaje: "Entrada registrada" });
  } catch (err) {
    if (conn) await conn.rollback();

    console.error("entradaInventario:", err);

    // Si no existe la tabla de movimientos, este mensaje ayuda
    if (String(err.message || "").toLowerCase().includes("inventario_movimientos")) {
      return res.status(500).json({
        ok: false,
        error: "Falta crear la tabla inventario_movimientos",
      });
    }

    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (conn) conn.release();
  }
};

// POST /api/inventario/salida
export const salidaInventario = async (req, res) => {
  let conn;
  try {
    const { productoId, cantidad, referencia } = req.body;

    const id = Number(productoId);
    const cant = Number(cantidad);

    if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(cant) || cant <= 0) {
      return res.status(400).json({ ok: false, error: "Datos inválidos" });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [[prod]] = await conn.query(
      "SELECT id, stock FROM productos WHERE id = ? FOR UPDATE",
      [id]
    );

    if (!prod) {
      await conn.rollback();
      return res.status(404).json({ ok: false, error: "Producto no encontrado" });
    }

    const stockActual = Number(prod.stock || 0);

    if (cant > stockActual) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        error: `Stock insuficiente. Stock actual: ${stockActual}`,
      });
    }

    await conn.query(
      "UPDATE productos SET stock = COALESCE(stock, 0) - ? WHERE id = ?",
      [cant, id]
    );

    await conn.query(
      `INSERT INTO inventario_movimientos
        (producto_id, tipo, cantidad, motivo, referencia, usuario_id)
       VALUES (?, 'SALIDA', ?, 'salida_manual', ?, ?)`,
      [id, cant, referencia || null, req.user?.id || null]
    );

    await conn.commit();
    return res.json({ ok: true, mensaje: "Salida registrada" });
  } catch (err) {
    if (conn) await conn.rollback();

    console.error("salidaInventario:", err);

    if (String(err.message || "").toLowerCase().includes("inventario_movimientos")) {
      return res.status(500).json({
        ok: false,
        error: "Falta crear la tabla inventario_movimientos",
      });
    }

    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (conn) conn.release();
  }
};

// POST /api/inventario/ajuste
// nuevoStock = stock final que quieres dejar
export const ajusteInventario = async (req, res) => {
  let conn;
  try {
    const { productoId, nuevoStock, referencia } = req.body;

    const id = Number(productoId);
    const nuevo = Number(nuevoStock);

    if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(nuevo) || nuevo < 0) {
      return res.status(400).json({ ok: false, error: "Datos inválidos" });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [[prod]] = await conn.query(
      "SELECT id, stock FROM productos WHERE id = ? FOR UPDATE",
      [id]
    );

    if (!prod) {
      await conn.rollback();
      return res.status(404).json({ ok: false, error: "Producto no encontrado" });
    }

    const stockAnterior = Number(prod.stock || 0);
    const diff = nuevo - stockAnterior;

    await conn.query("UPDATE productos SET stock = ? WHERE id = ?", [nuevo, id]);

    await conn.query(
      `INSERT INTO inventario_movimientos
        (producto_id, tipo, cantidad, motivo, referencia, usuario_id)
       VALUES (?, 'AJUSTE', ?, 'ajuste_manual', ?, ?)`,
      [id, diff, referencia || "Ajuste", req.user?.id || null]
    );

    await conn.commit();

    return res.json({
      ok: true,
      mensaje: "Ajuste registrado",
      stockAnterior,
      stockNuevo: nuevo,
      diferencia: diff,
    });
  } catch (err) {
    if (conn) await conn.rollback();

    console.error("ajusteInventario:", err);

    if (String(err.message || "").toLowerCase().includes("inventario_movimientos")) {
      return res.status(500).json({
        ok: false,
        error: "Falta crear la tabla inventario_movimientos",
      });
    }

    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (conn) conn.release();
  }
};

// GET /api/inventario/movimientos
// Opcional: /api/inventario/movimientos?productoId=10
export const getMovimientos = async (req, res) => {
  try {
    const productoIdRaw = req.query.productoId;
    const productoId = productoIdRaw ? Number(productoIdRaw) : null;

    if (
      productoIdRaw !== undefined &&
      (!Number.isFinite(productoId) || productoId <= 0)
    ) {
      return res.status(400).json({ ok: false, error: "productoId inválido" });
    }

    let sql = `
      SELECT
        m.id,
        m.producto_id,
        m.tipo,
        m.cantidad,
        m.motivo,
        m.referencia,
        m.usuario_id,
        m.created_at,
        p.nombre AS producto_nombre,
        COALESCE(p.codigo_cat, p.codigo) AS codigo
      FROM inventario_movimientos m
      LEFT JOIN productos p ON p.id = m.producto_id
    `;
    const params = [];

    if (productoId) {
      sql += " WHERE m.producto_id = ? ";
      params.push(productoId);
    }

    sql += " ORDER BY m.created_at DESC, m.id DESC LIMIT 500";

    const [rows] = await pool.query(sql, params);

    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("getMovimientos:", err);

    if (String(err.message || "").toLowerCase().includes("inventario_movimientos")) {
      return res.status(500).json({
        ok: false,
        error: "Falta crear la tabla inventario_movimientos",
      });
    }

    return res.status(500).json({ ok: false, error: err.message });
  }
};