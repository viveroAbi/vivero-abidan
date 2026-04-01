import { pool } from "../config/db.js";

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

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const txt = String(value).trim();
  return txt === "" ? null : txt;
}

function toBool01(value, defaultValue = 0) {
  if (value === undefined || value === null || value === "") {
    return defaultValue ? 1 : 0;
  }
  return Number(value) ? 1 : 0;
}

function toNumber(value, defaultValue = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

// GET /api/clientes?search=texto&activo=1
export const getClientes = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const activo = req.query.activo;

    let sql = `
      SELECT
        id,
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
        created_at,
        updated_at
      FROM clientes
      WHERE 1=1
    `;
    const params = [];

    if (activo === "1" || activo === "0") {
      sql += ` AND activo = ?`;
      params.push(Number(activo));
    }

    if (search) {
      sql += ` AND (nombre LIKE ? OR telefono LIKE ? OR email LIKE ? OR rfc LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    sql += ` ORDER BY nombre ASC, id DESC`;

    const [rows] = await pool.query(sql, params);

    return res.json({
      mensaje: "Listado de clientes",
      data: rows,
    });
  } catch (err) {
    console.error("ERROR GET /clientes:", err);
    return res.status(500).json({
      error: "Error en BD",
      message: err.sqlMessage || err.message,
    });
  }
};

// GET /api/clientes/:id
export const getClienteById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        id,
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
        created_at,
        updated_at
      FROM clientes
      WHERE id = ?
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    return res.json({
      mensaje: "Cliente",
      data: rows[0],
    });
  } catch (err) {
    console.error("ERROR GET /clientes/:id:", err);
    return res.status(500).json({
      error: "Error en BD",
      message: err.sqlMessage || err.message,
    });
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

    const nombreFinal = cleanText(nombre);

    if (!nombreFinal) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    if (nombreFinal.length < 2) {
      return res.status(400).json({ error: "Nombre inválido" });
    }

    const categoriaFinal = String(categoria_cliente || "publico")
      .trim()
      .toLowerCase();

    if (!categoriasValidas.includes(categoriaFinal)) {
      return res.status(400).json({ error: "Categoría de cliente inválida" });
    }

    const telefonoFinal = cleanText(telefono);
    const emailFinal = cleanText(email);
    const direccionFinal = cleanText(direccion);
    const rfcFinal = cleanText(rfc);
    const notasFinal = cleanText(notas);

    const permiteCreditoFinal = toBool01(permite_credito, 0);
    const deudaMaximaFinal = permiteCreditoFinal
      ? Math.max(toNumber(deuda_maxima, 0), 0)
      : 0;
    const saldoActualFinal = Math.max(toNumber(saldo_actual, 0), 0);
    const activoFinal = toBool01(activo, 1);

    const [result] = await pool.query(
      `
      INSERT INTO clientes (
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        nombreFinal,
        telefonoFinal,
        emailFinal,
        direccionFinal,
        rfcFinal,
        notasFinal,
        categoriaFinal,
        permiteCreditoFinal,
        deudaMaximaFinal,
        saldoActualFinal,
        activoFinal,
      ]
    );

    const [rows] = await pool.query(
      `
      SELECT
        id,
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
        created_at,
        updated_at
      FROM clientes
      WHERE id = ?
      `,
      [result.insertId]
    );

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

    const [exists] = await pool.query(
      "SELECT id, permite_credito FROM clientes WHERE id = ?",
      [id]
    );

    if (!exists.length) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    const fields = [];
    const params = [];

    if (nombre !== undefined) {
      const nombreFinal = cleanText(nombre);
      if (!nombreFinal || nombreFinal.length < 2) {
        return res.status(400).json({ error: "Nombre inválido" });
      }
      fields.push("nombre = ?");
      params.push(nombreFinal);
    }

    if (telefono !== undefined) {
      fields.push("telefono = ?");
      params.push(cleanText(telefono));
    }

    if (email !== undefined) {
      fields.push("email = ?");
      params.push(cleanText(email));
    }

    if (direccion !== undefined) {
      fields.push("direccion = ?");
      params.push(cleanText(direccion));
    }

    if (rfc !== undefined) {
      fields.push("rfc = ?");
      params.push(cleanText(rfc));
    }

    if (notas !== undefined) {
      fields.push("notas = ?");
      params.push(cleanText(notas));
    }

    if (categoria_cliente !== undefined) {
      const categoriaFinal = String(categoria_cliente).trim().toLowerCase();

      if (!categoriasValidas.includes(categoriaFinal)) {
        return res.status(400).json({ error: "Categoría de cliente inválida" });
      }

      fields.push("categoria_cliente = ?");
      params.push(categoriaFinal);
    }

    let permiteCreditoFinal =
      permite_credito !== undefined
        ? toBool01(permite_credito, 0)
        : Number(exists[0].permite_credito || 0);

    if (permite_credito !== undefined) {
      fields.push("permite_credito = ?");
      params.push(permiteCreditoFinal);
    }

    if (deuda_maxima !== undefined) {
      const deudaMaximaFinal = permiteCreditoFinal
        ? Math.max(toNumber(deuda_maxima, 0), 0)
        : 0;

      fields.push("deuda_maxima = ?");
      params.push(deudaMaximaFinal);
    } else if (permite_credito !== undefined && permiteCreditoFinal === 0) {
      fields.push("deuda_maxima = ?");
      params.push(0);
    }

    if (saldo_actual !== undefined) {
      fields.push("saldo_actual = ?");
      params.push(Math.max(toNumber(saldo_actual, 0), 0));
    }

    if (activo !== undefined) {
      fields.push("activo = ?");
      params.push(toBool01(activo, 1));
    }

    if (!fields.length) {
      return res.status(400).json({ error: "No hay campos para actualizar" });
    }

    params.push(id);

    await pool.query(
      `UPDATE clientes SET ${fields.join(", ")} WHERE id = ?`,
      params
    );

    const [rows] = await pool.query(
      `
      SELECT
        id,
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
        created_at,
        updated_at
      FROM clientes
      WHERE id = ?
      `,
      [id]
    );

    return res.json({
      mensaje: "Cliente actualizado",
      data: rows[0],
    });
  } catch (err) {
    console.error("ERROR PUT /clientes/:id:", err);
    return res.status(500).json({
      error: "Error en BD",
      message: err.sqlMessage || err.message,
    });
  }
};

// DELETE /api/clientes/:id
export const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const [exists] = await pool.query(
      "SELECT id FROM clientes WHERE id = ?",
      [id]
    );
    if (!exists.length) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    await pool.query("UPDATE clientes SET activo = 0 WHERE id = ?", [id]);

    return res.json({ mensaje: "Cliente desactivado" });
  } catch (err) {
    console.error("ERROR DELETE /clientes/:id:", err);
    return res.status(500).json({
      error: "Error en BD",
      message: err.sqlMessage || err.message,
    });
  }
};

export const activarCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const [exists] = await pool.query(
      "SELECT id FROM clientes WHERE id = ?",
      [id]
    );
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

// GET /api/clientes/:id/adeudos
export const getAdeudosCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const [clienteRows] = await pool.query(
      `
      SELECT id, nombre, saldo_actual, deuda_maxima, permite_credito
      FROM clientes
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!clienteRows.length) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        id,
        cliente_id,
        tipo_pago,
        total_final,
        abono_inicial,
        saldo_pendiente,
        fecha_vencimiento,
        observaciones_credito,
        created_at
      FROM ventas
      WHERE cliente_id = ?
        AND tipo_pago = 'a_cuenta'
        AND COALESCE(saldo_pendiente, 0) > 0
      ORDER BY created_at DESC, id DESC
      `,
      [id]
    );

    return res.json({
      mensaje: "Adeudos del cliente",
      data: {
        cliente: clienteRows[0],
        adeudos: rows,
      },
    });
  } catch (err) {
    console.error("ERROR GET /clientes/:id/adeudos:", err);
    return res.status(500).json({
      error: "Error al obtener adeudos",
      message: err.sqlMessage || err.message,
    });
  }
};

// POST /api/clientes/:id/adeudos/:ventaId/abono
export const registrarAbonoAdeudo = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const clienteId = Number(req.params.id);
    const ventaId = Number(req.params.ventaId);

    const monto = Number(req.body.monto || 0);
    const metodo_pago = String(req.body.metodo_pago || "efectivo").trim();
    const nota = cleanText(req.body.nota);

    if (!Number.isFinite(clienteId) || clienteId <= 0) {
      return res.status(400).json({ error: "Cliente inválido" });
    }

    if (!Number.isFinite(ventaId) || ventaId <= 0) {
      return res.status(400).json({ error: "Venta inválida" });
    }

    if (!Number.isFinite(monto) || monto <= 0) {
      return res.status(400).json({ error: "Monto inválido" });
    }

    await conn.beginTransaction();

    const [ventaRows] = await conn.query(
      `
      SELECT
        id,
        cliente_id,
        tipo_pago,
        total_final,
        abono_inicial,
        saldo_pendiente
      FROM ventas
      WHERE id = ?
        AND cliente_id = ?
      FOR UPDATE
      `,
      [ventaId, clienteId]
    );

    if (!ventaRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Adeudo no encontrado" });
    }

    const venta = ventaRows[0];

    if (venta.tipo_pago !== "a_cuenta") {
      await conn.rollback();
      return res.status(400).json({ error: "La venta no es a cuenta" });
    }

    const saldoPendienteActual = Number(venta.saldo_pendiente || 0);

    if (saldoPendienteActual <= 0) {
      await conn.rollback();
      return res.status(400).json({ error: "La venta ya está liquidada" });
    }

    if (monto > saldoPendienteActual) {
      await conn.rollback();
      return res.status(400).json({
        error: `El abono no puede ser mayor al saldo pendiente (${saldoPendienteActual.toFixed(
          2
        )})`,
      });
    }

    const [clienteRows] = await conn.query(
      `
      SELECT id, saldo_actual
      FROM clientes
      WHERE id = ?
      FOR UPDATE
      `,
      [clienteId]
    );

    if (!clienteRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    const cliente = clienteRows[0];
    const saldoClienteActual = Number(cliente.saldo_actual || 0);

    const nuevoSaldoPendiente = Number(
      (saldoPendienteActual - monto).toFixed(2)
    );

    const nuevoSaldoCliente = Number(
      Math.max(saldoClienteActual - monto, 0).toFixed(2)
    );

    await conn.query(
      `
      INSERT INTO ventas_abonos (
        venta_id,
        cliente_id,
        monto,
        metodo_pago,
        nota
      ) VALUES (?, ?, ?, ?, ?)
      `,
      [ventaId, clienteId, monto, metodo_pago, nota]
    );

    await conn.query(
      `
      UPDATE ventas
      SET
        saldo_pendiente = ?,
        abono_inicial = COALESCE(abono_inicial, 0) + ?
      WHERE id = ?
      `,
      [nuevoSaldoPendiente, monto, ventaId]
    );

    await conn.query(
      `
      UPDATE clientes
      SET saldo_actual = ?
      WHERE id = ?
      `,
      [nuevoSaldoCliente, clienteId]
    );

    await conn.commit();

    return res.json({
      mensaje: "Abono registrado",
      data: {
        venta_id: ventaId,
        cliente_id: clienteId,
        abonado: monto,
        saldo_pendiente: nuevoSaldoPendiente,
        saldo_actual_cliente: nuevoSaldoCliente,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error("ERROR POST /clientes/:id/adeudos/:ventaId/abono:", err);
    return res.status(500).json({
      error: "Error al registrar abono",
      message: err.sqlMessage || err.message,
    });
  } finally {
    conn.release();
  }
};