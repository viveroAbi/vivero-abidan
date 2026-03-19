import { pool } from "../config/db.js";

// GET /api/clientes?search=texto&activo=1
export const getClientes = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const activo = req.query.activo; // "1" | "0" | undefined

    let sql = `SELECT * FROM clientes WHERE 1=1`;
    const params = [];

    if (activo === "1" || activo === "0") {
      sql += ` AND activo = ?`;
      params.push(Number(activo));
    }

    if (search) {
      sql += ` AND (nombre LIKE ? OR telefono LIKE ? OR email LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    sql += ` ORDER BY nombre ASC`;

    const [rows] = await pool.query(sql, params);
    return res.json({ mensaje: "Listado de clientes", data: rows });
  } catch (err) {
    console.error("ERROR GET /clientes:", err);
    return res
      .status(500)
      .json({ error: "Error en BD", message: err.sqlMessage || err.message });
  }
};

// GET /api/clientes/:id
export const getClienteById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT * FROM clientes WHERE id = ?", [id]);

    if (!rows.length) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    return res.json({ mensaje: "Cliente", data: rows[0] });
  } catch (err) {
    console.error("ERROR GET /clientes/:id:", err);
    return res
      .status(500)
      .json({ error: "Error en BD", message: err.sqlMessage || err.message });
  }
};

// POST /api/clientes
export const createCliente = async (req, res) => {
  try {
    const {
      nombre,
      telefono,
      email,
      direccion,
      rfc,
      notas,
      categoria_cliente,
      permite_credito = 0,
      deuda_maxima = 0,
      saldo_actual = 0,
      activo = 1,
    } = req.body;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const categoriasValidas = [
      "publico",
      "revendedor",
      "jardinero",
      "paisajista",
      "arquitecto",
      "mayoreo",
      "vivero",
      "especial",
    ];

    const categoriaFinal = String(categoria_cliente || "publico")
      .trim()
      .toLowerCase();

    if (!categoriasValidas.includes(categoriaFinal)) {
      return res.status(400).json({ error: "Categoría de cliente inválida" });
    }

    const permiteCreditoFinal = Number(permite_credito) ? 1 : 0;
    const deudaMaximaFinal = permiteCreditoFinal ? Number(deuda_maxima || 0) : 0;
    const saldoActualFinal = Number(saldo_actual || 0);
    const activoFinal = Number(activo) ? 1 : 0;

    const [result] = await pool.query(
      `INSERT INTO clientes (
        nombre,
        telefono,
        email,
        direccion,
        rfc,
        notas,
        categoria_cliente,
        permite_credito,
        deuda_maxima,
        saldo_actual,
        activo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(nombre).trim(),
        telefono ? String(telefono).trim() : null,
        email ? String(email).trim() : null,
        direccion ? String(direccion).trim() : null,
        rfc ? String(rfc).trim() : null,
        notas ? String(notas).trim() : null,
        categoriaFinal,
        permiteCreditoFinal,
        deudaMaximaFinal,
        saldoActualFinal,
        activoFinal,
      ]
    );

    const [rows] = await pool.query("SELECT * FROM clientes WHERE id = ?", [
      result.insertId,
    ]);

    return res.json({
      mensaje: "Cliente creado",
      data: rows[0],
    });
  } catch (err) {
    console.error("ERROR POST /clientes:", err);
    return res.status(500).json({
      error: "Error en BD",
      message: err.sqlMessage || err.message,
    });
  }
};

// PUT /api/clientes/:id
export const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      nombre,
      telefono,
      email,
      direccion,
      rfc,
      notas,
      categoria_cliente,
      permite_credito,
      deuda_maxima,
      saldo_actual,
      activo,
    } = req.body;

    const [exists] = await pool.query("SELECT id FROM clientes WHERE id = ?", [id]);
    if (!exists.length) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    if (nombre !== undefined && String(nombre).trim().length < 2) {
      return res.status(400).json({ error: "Nombre inválido" });
    }

    const categoriasValidas = [
      "publico",
      "revendedor",
      "jardinero",
      "paisajista",
      "arquitecto",
      "mayoreo",
      "vivero",
      "especial",
    ];

    const fields = [];
    const params = [];

    if (nombre !== undefined) {
      fields.push("nombre = ?");
      params.push(String(nombre).trim());
    }

    if (telefono !== undefined) {
      fields.push("telefono = ?");
      params.push(telefono ? String(telefono).trim() : null);
    }

    if (email !== undefined) {
      fields.push("email = ?");
      params.push(email ? String(email).trim() : null);
    }

    if (direccion !== undefined) {
      fields.push("direccion = ?");
      params.push(direccion ? String(direccion).trim() : null);
    }

    if (rfc !== undefined) {
      fields.push("rfc = ?");
      params.push(rfc ? String(rfc).trim() : null);
    }

    if (notas !== undefined) {
      fields.push("notas = ?");
      params.push(notas ? String(notas).trim() : null);
    }

    if (categoria_cliente !== undefined) {
      const categoriaFinal = String(categoria_cliente).trim().toLowerCase();

      if (!categoriasValidas.includes(categoriaFinal)) {
        return res.status(400).json({ error: "Categoría de cliente inválida" });
      }

      fields.push("categoria_cliente = ?");
      params.push(categoriaFinal);
    }

    if (permite_credito !== undefined) {
      fields.push("permite_credito = ?");
      params.push(Number(permite_credito) ? 1 : 0);
    }

    if (deuda_maxima !== undefined) {
      fields.push("deuda_maxima = ?");
      params.push(Number(deuda_maxima || 0));
    }

    if (saldo_actual !== undefined) {
      fields.push("saldo_actual = ?");
      params.push(Number(saldo_actual || 0));
    }

    if (activo !== undefined) {
      fields.push("activo = ?");
      params.push(Number(activo) ? 1 : 0);
    }

    if (!fields.length) {
      return res.status(400).json({ error: "No hay campos para actualizar" });
    }

    params.push(id);

    await pool.query(
      `UPDATE clientes SET ${fields.join(", ")} WHERE id = ?`,
      params
    );

    const [rows] = await pool.query("SELECT * FROM clientes WHERE id = ?", [id]);

    return res.json({ mensaje: "Cliente actualizado", data: rows[0] });
  } catch (err) {
    console.error("ERROR PUT /clientes/:id:", err);
    return res
      .status(500)
      .json({ error: "Error en BD", message: err.sqlMessage || err.message });
  }
};

// DELETE /api/clientes/:id
export const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const [exists] = await pool.query("SELECT id FROM clientes WHERE id = ?", [id]);
    if (!exists.length) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    await pool.query("UPDATE clientes SET activo = 0 WHERE id = ?", [id]);

    return res.json({ mensaje: "Cliente desactivado" });
  } catch (err) {
    console.error("ERROR DELETE /clientes/:id:", err);
    return res
      .status(500)
      .json({ error: "Error en BD", message: err.sqlMessage || err.message });
  }
};

export const activarCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const [exists] = await pool.query("SELECT id FROM clientes WHERE id = ?", [id]);
    if (!exists.length) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    await pool.query("UPDATE clientes SET activo = 1 WHERE id = ?", [id]);

    return res.json({ ok: true, message: "Cliente activado" });
  } catch (err) {
    console.error("ERROR activarCliente:", err);
    return res.status(500).json({ error: "Error al activar cliente" });
  }
};