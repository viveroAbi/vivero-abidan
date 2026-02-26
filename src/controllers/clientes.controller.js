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
    if (!rows.length) return res.status(404).json({ error: "Cliente no encontrado" });
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
      activo = 1, // ✅ evita ReferenceError
    } = req.body;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const categoriaValida = [
      "publico",
      "revendedor",
      "jardinero",
      "paisajista",
      "arquitecto",
      "mayoreo",
      "vivero",
    ];

    const categoriaFinal = String(categoria_cliente || "publico")
      .trim()
      .toLowerCase();

    if (!categoriaValida.includes(categoriaFinal)) {
      return res.status(400).json({ error: "Categoría de cliente inválida" });
    }

    const [result] = await pool.query(
      `INSERT INTO clientes
      (nombre, telefono, email, direccion, rfc, notas, categoria_cliente, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(nombre).trim(),
        telefono ? String(telefono).trim() : null,
        email ? String(email).trim() : null,
        direccion ? String(direccion).trim() : null,
        rfc ? String(rfc).trim() : null,
        notas ? String(notas).trim() : null,
        categoriaFinal,
        Number(activo) ? 1 : 0,
      ]
    );

    return res.json({
      mensaje: "Cliente creado",
      data: {
        id: result.insertId,
        nombre: String(nombre).trim(),
        telefono: telefono ? String(telefono).trim() : null,
        email: email ? String(email).trim() : null,
        direccion: direccion ? String(direccion).trim() : null,
        rfc: rfc ? String(rfc).trim() : null,
        notas: notas ? String(notas).trim() : null,
        categoria_cliente: categoriaFinal,
        activo: Number(activo) ? 1 : 0,
      },
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
  activo = 1, // ✅ valor por defecto
} = req.body;

    const [exists] = await pool.query("SELECT id FROM clientes WHERE id = ?", [id]);
    if (!exists.length) return res.status(404).json({ error: "Cliente no encontrado" });

    if (nombre !== undefined && String(nombre).trim().length < 2) {
      return res.status(400).json({ error: "Nombre inválido" });
    }

    // Actualiza solo lo que venga (COALESCE con null no sirve aquí si quieres permitir null)
    const fields = [];
    const params = [];

    if (nombre !== undefined) { fields.push("nombre = ?"); params.push(String(nombre).trim()); }
    if (telefono !== undefined) { fields.push("telefono = ?"); params.push(telefono); }
    if (email !== undefined) { fields.push("email = ?"); params.push(email); }
    if (direccion !== undefined) { fields.push("direccion = ?"); params.push(direccion); }
    if (rfc !== undefined) { fields.push("rfc = ?"); params.push(rfc); }
    if (notas !== undefined) { fields.push("notas = ?"); params.push(notas); }
    if (activo !== undefined) { fields.push("activo = ?"); params.push(Number(activo) ? 1 : 0); }

    if (!fields.length) {
      return res.status(400).json({ error: "No hay campos para actualizar" });
    }

    params.push(id);

    await pool.query(`UPDATE clientes SET ${fields.join(", ")} WHERE id = ?`, params);

    const [rows] = await pool.query("SELECT * FROM clientes WHERE id = ?", [id]);
    return res.json({ mensaje: "Cliente actualizado", data: rows[0] });
  } catch (err) {
    console.error("ERROR PUT /clientes/:id:", err);
    return res
      .status(500)
      .json({ error: "Error en BD", message: err.sqlMessage || err.message });
  }
};

// DELETE /api/clientes/:id  (soft delete -> activo=0)
export const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const [exists] = await pool.query("SELECT id FROM clientes WHERE id = ?", [id]);
    if (!exists.length) return res.status(404).json({ error: "Cliente no encontrado" });

    await pool.query("UPDATE clientes SET activo = 0 WHERE id = ?", [id]);
    return res.json({ mensaje: "Cliente desactivado" });
  } catch (err) {
    console.error("ERROR DELETE /clientes/:id:", err);
    return res
      .status(500)
      .json({ error: "Error en BD", message: err.sqlMessage || err.message });
  }
};
export async function activarCliente(req, res) {
  try {
    const { id } = req.params;

    await pool.query("UPDATE clientes SET activo = 1 WHERE id = ?", [id]);

    return res.json({ ok: true, message: "Cliente activado" });
  } catch (err) {
    console.error("ERROR activarCliente:", err);
    return res.status(500).json({ error: "Error al activar cliente" });
  }
}
