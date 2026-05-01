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

const tiposPagoValidos = [
  "efectivo",
  "tarjeta_credito",
  "tarjeta_debito",
  "transferencia",
  "cheque",
  "mixto",
  "a_cuenta",
];

const getTipoPagoLabel = (tipoPago) =>
  (
    {
      efectivo: "Efectivo",
      tarjeta_credito: "Tarjeta (Crédito)",
      tarjeta_debito: "Tarjeta (Débito)",
      transferencia: "Transferencia",
      cheque: "Cheque",
      mixto: "Mixto",
      a_cuenta: "A cuenta",
    }[tipoPago] || tipoPago
  );

// ==========================
// GET /api/ventas
// ==========================
export const getVentas = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 50), 10), 200);
    const offset = (page - 1) * pageSize;

    const [rows] = await pool.query(
      `
      SELECT 
        v.*,
        c.nombre AS cliente_nombre,
        COALESCE(
          GROUP_CONCAT(CONCAT(vi.producto_nombre, ' x', vi.cantidad) SEPARATOR ', '),
          ''
        ) AS productos_resumen
      FROM ventas v
      LEFT JOIN ventas_items vi ON vi.venta_id = v.id
      LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE COALESCE(v.estado, '') <> 'borrador'
        AND COALESCE(v.es_cotizacion, 0) = 0
        AND COALESCE(v.es_cotizacion_pedido, 0) = 0
      GROUP BY v.id, c.nombre
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [pageSize, offset]
    );

    const [[countResult]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM ventas v
      WHERE COALESCE(v.estado, '') <> 'borrador'
        AND COALESCE(v.es_cotizacion, 0) = 0
        AND COALESCE(v.es_cotizacion_pedido, 0) = 0
      `
    );

    return res.json({
      mensaje: "Listado de ventas",
      data: rows,
      pagination: {
        page,
        pageSize,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / pageSize),
      },
    });
  } catch (err) {
    console.error("ERROR GET /ventas:", err);
    return res.status(500).json({
      error: "Error en BD",
      message: err.sqlMessage || err.message,
    });
  }
};

// ==========================
// GET /api/ventas/hoy
// ==========================
export const getVentasHoy = async (req, res) => {
  try {
    const ahora = new Date();

    const partes = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(ahora);

    const year = partes.find((p) => p.type === "year").value;
    const month = partes.find((p) => p.type === "month").value;
    const day = partes.find((p) => p.type === "day").value;

    const inicioUtc = new Date(`${year}-${month}-${day}T06:00:00.000Z`);
    const finUtc = new Date(inicioUtc);
    finUtc.setUTCDate(finUtc.getUTCDate() + 1);

    const [rows] = await pool.query(
      `
      SELECT 
        v.*,
        c.nombre AS cliente_nombre
      FROM ventas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE v.created_at >= ?
        AND v.created_at < ?
        AND COALESCE(v.estado, '') <> 'borrador'
        AND COALESCE(v.es_cotizacion, 0) = 0
        AND COALESCE(v.es_cotizacion_pedido, 0) = 0
      ORDER BY v.created_at DESC
      `,
      [inicioUtc, finUtc]
    );

    return res.json({ mensaje: "Ventas de hoy", data: rows });
  } catch (err) {
    console.error("ERROR GET /ventas/hoy:", err);
    return res
      .status(500)
      .json({ error: "Error en BD", message: err.sqlMessage || err.message });
  }
};

export const getResumenVentas = async (req, res) => {
  try {
    const ahora = new Date();

    const partes = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(ahora);

    const year = partes.find((p) => p.type === "year").value;
    const month = partes.find((p) => p.type === "month").value;
    const day = partes.find((p) => p.type === "day").value;

    const inicioUtc = new Date(`${year}-${month}-${day}T06:00:00.000Z`);
    const finUtc = new Date(inicioUtc);
    finUtc.setUTCDate(finUtc.getUTCDate() + 1);

    const [[hoy]] = await pool.query(
      `
      SELECT 
        COUNT(*) AS ventasHoy,
        COALESCE(SUM(total_final), 0) AS totalHoy
      FROM ventas
      WHERE created_at >= ?
        AND created_at < ?
        AND COALESCE(estado, '') <> 'borrador'
        AND COALESCE(es_cotizacion, 0) = 0
        AND COALESCE(es_cotizacion_pedido, 0) = 0
      `,
      [inicioUtc, finUtc]
    );

    const [[general]] = await pool.query(`
      SELECT 
        COUNT(*) AS ventasTotales,
        COALESCE(SUM(total_final), 0) AS totalGeneral
      FROM ventas
      WHERE COALESCE(estado, '') <> 'borrador'
        AND COALESCE(es_cotizacion, 0) = 0
        AND COALESCE(es_cotizacion_pedido, 0) = 0
    `);

    const [porCategoria] = await pool.query(`
      SELECT 
        categoria,
        COUNT(*) AS cantidad,
        COALESCE(SUM(total_final), 0) AS total
      FROM ventas
      WHERE COALESCE(estado, '') <> 'borrador'
        AND COALESCE(es_cotizacion, 0) = 0
        AND COALESCE(es_cotizacion_pedido, 0) = 0
      GROUP BY categoria
      ORDER BY total DESC
    `);

    return res.json({
      mensaje: "Resumen de ventas",
      data: {
        ventasHoy: Number(hoy.ventasHoy),
        totalHoy: Number(hoy.totalHoy),
        ventasTotales: Number(general.ventasTotales),
        totalGeneral: Number(general.totalGeneral),
        porCategoria,
      },
    });
  } catch (err) {
    console.error("ERROR GET /ventas/resumen:", err);
    return res
      .status(500)
      .json({ error: "Error en BD", message: err.sqlMessage || err.message });
  }
};
// ==========================
// POST /api/ventas
// ==========================
export const crearVenta = async (req, res) => {
  const {
    categoria,
    tipoPago,
    cliente_id = null,
    guardarSaldoFavor = false,
    efectivo = 0,
    tarjeta = 0,
    transferencia = 0,
    cheque = 0,
    recibido = 0,
    cambio = 0,
    requiere_factura = 0,
    esCotizacion = false,
    esCotizacionPedido = false,
    abono_inicial = 0,
    fecha_vencimiento = null,
    observaciones_credito = "",
    items = [],
  } = req.body;

  const clienteId = cliente_id ? Number(cliente_id) : null;
  const guardarSaldoFavorBool = Boolean(guardarSaldoFavor);
  const isCotizacion = Boolean(esCotizacion);
  const isCotizacionPedido = Boolean(esCotizacionPedido);
  const esCotizacionFinal = isCotizacion || isCotizacionPedido;

  if (!categoria || !tipoPago) {
    return res.status(400).json({ error: "Falta categoria o tipoPago" });
  }

  if (!categoriasValidas.includes(categoria)) {
    return res.status(400).json({ error: "Categoría no válida" });
  }

  if (!tiposPagoValidos.includes(tipoPago)) {
    return res.status(400).json({ error: "tipoPago no válido" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "La venta debe traer items" });
  }

  
  const recibidoN = Number(recibido || 0);
  const cambioN = Number(cambio || 0);
  const efectivoN = Number(efectivo || 0);
  const tarjetaN = Number(tarjeta || 0);
  const transferenciaN = Number(transferencia || 0);
  const chequeN = Number(cheque || 0);
  const abonoInicialN = Number(abono_inicial || 0);

  if (!Number.isFinite(recibidoN) || recibidoN < 0) {
    return res.status(400).json({ error: "Recibido inválido" });
  }

  if (!Number.isFinite(cambioN) || cambioN < 0) {
    return res.status(400).json({ error: "Cambio inválido" });
  }

  if (!Number.isFinite(efectivoN) || efectivoN < 0) {
    return res.status(400).json({ error: "Efectivo inválido" });
  }

  if (!Number.isFinite(tarjetaN) || tarjetaN < 0) {
    return res.status(400).json({ error: "Tarjeta inválida" });
  }

  if (!Number.isFinite(transferenciaN) || transferenciaN < 0) {
    return res.status(400).json({ error: "Transferencia inválida" });
  }

  if (!Number.isFinite(chequeN) || chequeN < 0) {
    return res.status(400).json({ error: "Cheque inválido" });
  }

  if (!Number.isFinite(abonoInicialN) || abonoInicialN < 0) {
    return res.status(400).json({ error: "Abono inicial inválido" });
  }

  const requiereFactura = Number(requiere_factura || 0) === 1;

  const esTarjeta =
    tipoPago === "tarjeta_credito" ||
    tipoPago === "tarjeta_debito" ||
    Number(tarjeta || 0) > 0;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO ventas
      (
        categoria,
        cliente_id,
        tipo_pago,
        total,
        descuento,
        total_iva,
        total_final,
        efectivo,
        tarjeta,
        transferencia,
        cheque,
        recibido,
        cambio,
        es_cotizacion,
        es_cotizacion_pedido,
        requiere_factura,
        abono_inicial,
        saldo_pendiente,
        fecha_deuda,
        fecha_vencimiento,
        observaciones_credito
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        categoria,
        clienteId,
        tipoPago,
        0,
        0,
        0,
        0,
        efectivoN,
        tarjetaN,
        transferenciaN,
        chequeN,
        recibidoN,
        cambioN,
        isCotizacion ? 1 : 0,
        isCotizacionPedido ? 1 : 0,
        requiereFactura ? 1 : 0,
        abonoInicialN,
        0,
        tipoPago === "a_cuenta" ? new Date() : null,
        fecha_vencimiento || null,
        String(observaciones_credito || "").trim() || null,
      ]
    );

    const ventaId = result.insertId;

    let total = 0;
    let totalIVA = 0;

    for (const it of items) {
      const productoId = Number(it.producto_id ?? it.productoId ?? it.idProducto);
      const cantidad = Number(it.cantidad || 0);
      const precioUnitario = Number(it.precio_unitario ?? 0);
      let descuentoItem = Number(it.descuento || 0);

      if (!productoId || cantidad <= 0 || precioUnitario <= 0) {
        throw new Error(
          "Items incompletos o inválidos (producto_id, cantidad, precio_unitario)"
        );
      }

      const [prods] = await conn.query(
        `SELECT id, codigo, nombre, tipo, iva_tarjeta, facturable, stock
         FROM productos
         WHERE id = ?
         FOR UPDATE`,
        [productoId]
      );

      if (!prods.length) throw new Error(`Producto no existe: ${productoId}`);

      const p = prods[0];

      if (!esCotizacionFinal) {
        const stockActual = Number(p.stock || 0);
        if (stockActual < cantidad) {
          throw new Error(
            `Stock insuficiente para ${p.codigo} - ${p.nombre}. Disponible: ${stockActual}, requerido: ${cantidad}`
          );
        }
      }

      if (requiereFactura && Number(p.facturable) === 0) {
        throw new Error(`Producto no facturable (Bloqueado): ${p.nombre}`);
      }

      if (String(p.tipo) === "insumo") {
        descuentoItem = 0;
      }

      const productoNombre = `${p.codigo} - ${p.nombre}`;
      const subtotal = Number((cantidad * precioUnitario).toFixed(2));
      total += subtotal;

      const totalFinalItem = Math.max(subtotal - descuentoItem, 0);

      const ivaItem =
        esTarjeta && Number(p.iva_tarjeta) === 1
          ? Number((totalFinalItem * 0.16).toFixed(2))
          : 0;

      totalIVA += ivaItem;

      await conn.query(
        `INSERT INTO ventas_items
          (venta_id, producto_id, producto_nombre, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ventaId, productoId, productoNombre, cantidad, precioUnitario, subtotal]
      );

      if (!esCotizacionFinal) {
        await conn.query(
          "UPDATE productos SET stock = stock - ? WHERE id = ?",
          [cantidad, productoId]
        );

        await conn.query(
          `INSERT INTO inventario_movimientos
           (producto_id, tipo, cantidad, referencia, usuario_id)
           VALUES (?, 'SALIDA', ?, ?, ?)`,
          [
            productoId,
            cantidad,
            `Venta #${ventaId}`,
            req.user?.id ?? req.user?.userId ?? req.userId ?? null,
          ]
        );
      }
    }

    if (total <= 0) throw new Error("El total debe ser mayor a 0");

    total = Number(total.toFixed(2));
    totalIVA = Number(totalIVA.toFixed(2));

    const descuentoPctSeguro = 0;
    const descuento = 0;
    const totalSinIVA = Number(total.toFixed(2));
    const totalConIVA = Number((totalSinIVA + totalIVA).toFixed(2));

    let saldoAplicado = 0;
    let saldoPendiente = 0;
    let clienteInfo = null;

    if (clienteId) {
      const [[cli]] = await conn.query(
        `SELECT id, nombre, notas, saldo_favor, saldo_actual, permite_credito, deuda_maxima
         FROM clientes
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [clienteId]
      );

      if (!cli) {
        throw new Error("Cliente no encontrado");
      }

      clienteInfo = cli;
      saldoAplicado = 0;
    }

    const totalACobrar = Number((totalConIVA - saldoAplicado).toFixed(2));

    if (tipoPago === "mixto") {
      const suma = Number(
        (efectivoN + tarjetaN + transferenciaN + chequeN).toFixed(2)
      );
      if (suma !== Number(totalConIVA.toFixed(2))) {
        throw new Error(
          "En pago mixto: efectivo + tarjeta + transferencia + cheque debe ser igual al total."
        );
      }
    }

    if (
      (tipoPago === "tarjeta_credito" || tipoPago === "tarjeta_debito") &&
      Number(tarjetaN.toFixed(2)) !== Number(totalConIVA.toFixed(2))
    ) {
      throw new Error("El monto en tarjeta debe ser igual al total final");
    }

    if (
      tipoPago === "transferencia" &&
      Number(transferenciaN.toFixed(2)) !== Number(totalConIVA.toFixed(2))
    ) {
      throw new Error("El monto en transferencia debe ser igual al total final");
    }

    if (
      tipoPago === "cheque" &&
      Number(chequeN.toFixed(2)) !== Number(totalConIVA.toFixed(2))
    ) {
      throw new Error("El monto en cheque debe ser igual al total final");
    }

    if (!esCotizacionFinal && tipoPago === "efectivo") {
      if (recibidoN < totalACobrar) {
        throw new Error("El recibido no puede ser menor al total a cobrar");
      }

      const cambioCalc = Number((recibidoN - totalACobrar).toFixed(2));

      if (clienteId && guardarSaldoFavorBool && cambioCalc > 0) {
        await conn.query(
          "UPDATE clientes SET saldo_favor = COALESCE(saldo_favor,0) + ? WHERE id = ?",
          [cambioCalc, clienteId]
        );

        await conn.query(
          "UPDATE ventas SET cambio = 0, recibido = ? WHERE id = ?",
          [recibidoN, ventaId]
        );
      } else {
        await conn.query(
          "UPDATE ventas SET cambio = ?, recibido = ? WHERE id = ?",
          [cambioCalc, recibidoN, ventaId]
        );
      }
    }

    if (!esCotizacionFinal && tipoPago === "a_cuenta") {
      if (!clienteId) {
        throw new Error("Para pago a cuenta debes seleccionar un cliente");
      }

      if (!clienteInfo) {
        throw new Error("Cliente no encontrado");
      }

      const permiteCredito = Number(clienteInfo.permite_credito || 0) === 1;
      const deudaMaxima = Number(clienteInfo.deuda_maxima || 0);
      const saldoActualCliente = Number(clienteInfo.saldo_actual || 0);

      if (!permiteCredito) {
        throw new Error("El cliente no tiene crédito habilitado");
      }

      if (abonoInicialN > totalConIVA) {
        throw new Error("El abono inicial no puede ser mayor al total final");
      }

      saldoPendiente = Number((totalConIVA - abonoInicialN).toFixed(2));
      const nuevoSaldoCliente = Number((saldoActualCliente + saldoPendiente).toFixed(2));

      if (nuevoSaldoCliente > deudaMaxima) {
        throw new Error(
          `El cliente supera la deuda permitida. Límite: ${deudaMaxima.toFixed(
            2
          )}, saldo actual: ${saldoActualCliente.toFixed(
            2
          )}, pendiente nuevo: ${saldoPendiente.toFixed(2)}`
        );
      }

      await conn.query(
        `UPDATE clientes
         SET saldo_actual = ?
         WHERE id = ?`,
        [nuevoSaldoCliente, clienteId]
      );

      await conn.query(
        `UPDATE ventas
         SET efectivo = ?, tarjeta = 0, transferencia = 0, cheque = 0, recibido = ?, cambio = 0, abono_inicial = ?, saldo_pendiente = ?, fecha_deuda = ?, fecha_vencimiento = ?, observaciones_credito = ?
         WHERE id = ?`,
        [
          abonoInicialN,
          abonoInicialN,
          abonoInicialN,
          saldoPendiente,
          new Date(),
          fecha_vencimiento || null,
          String(observaciones_credito || "").trim() || null,
          ventaId,
        ]
      );
    }

    await conn.query(
      `UPDATE ventas
       SET total = ?, descuento_pct = ?, descuento = ?, total_iva = ?, total_final = ?
       WHERE id = ?`,
      [total, descuentoPctSeguro, descuento, totalIVA, totalConIVA, ventaId]
    );

    await conn.commit();

    return res.json({
      mensaje: isCotizacionPedido
        ? "Cotización de pedido guardada"
        : isCotizacion
        ? "Cotización guardada"
        : "Venta guardada",
      data: {
        id: ventaId,
        total: Number(total),
        descuento: Number(descuento),
        totalIva: Number(totalIVA),
        totalFinal: Number(totalConIVA),
        tipoPago,
        tipoPagoLabel: getTipoPagoLabel(tipoPago),
        esCotizacion: isCotizacion,
        esCotizacionPedido: isCotizacionPedido,
        abonoInicial: Number(abonoInicialN),
        saldoPendiente: Number(saldoPendiente),
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error("ERROR POST /ventas:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};
// ==========================
// GET /api/ventas/:id
// ==========================
export const obtenerVenta = async (req, res) => {
  const { id } = req.params;

  try {
    const [ventaRows] = await pool.query(
      `
      SELECT 
        v.*,
        c.nombre AS cliente_nombre,
        c.telefono AS cliente_telefono,
        c.email AS cliente_email,
        c.rfc AS cliente_rfc,
        c.notas AS cliente_notas
      FROM ventas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE v.id = ?
      `,
      [id]
    );

    if (ventaRows.length === 0) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    const [itemsRows] = await pool.query(
      `SELECT 
         id, venta_id, producto_id, producto_nombre,
         cantidad, precio_unitario, subtotal
       FROM ventas_items
       WHERE venta_id = ?`,
      [id]
    );

    return res.json({ data: { venta: ventaRows[0], items: itemsRows } });
  } catch (err) {
    console.error("ERROR GET /ventas/:id:", err);
    return res.status(500).json({ error: err.message });
  }
};

// ==========================
// DELETE /api/ventas/borradores/:id
// ==========================
export const eliminarBorrador = async (req, res) => {
  let conn;

  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID de borrador inválido" });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    await conn.query("DELETE FROM ventas_items WHERE venta_id = ?", [id]).catch(() => {});
    await conn.query("DELETE FROM venta_detalle WHERE venta_id = ?", [id]).catch(() => {});
    await conn.query("DELETE FROM venta_items WHERE venta_id = ?", [id]).catch(() => {});

    const [result] = await conn.query("DELETE FROM ventas WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Borrador no encontrado" });
    }

    await conn.commit();

    return res.json({
      mensaje: "Borrador eliminado",
      data: { id },
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("ERROR DELETE /ventas/borradores/:id:", err);
    return res.status(500).json({
      error: "Error al eliminar borrador",
      message: err.sqlMessage || err.message,
    });
  } finally {
    if (conn) conn.release();
  }
};

// ==========================
// GET /api/ventas/:id/ticket
// ==========================
export const getTicketVenta = async (req, res) => {
  try {
    const { id } = req.params;

    const [ventaRows] = await pool.query(
      `
      SELECT 
        v.*,
        c.nombre AS cliente_nombre,
        c.telefono AS cliente_telefono,
        c.email AS cliente_email,
        c.rfc AS cliente_rfc,
        c.notas AS cliente_notas
      FROM ventas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE v.id = ?
      `,
      [id]
    );

    if (!ventaRows.length) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    const venta = ventaRows[0];
    console.log("VENTA TICKET:", venta);

    const [items] = await pool.query(
      `
      SELECT 
        vi.producto_id,
        vi.producto_nombre,
        vi.cantidad,
        vi.precio_unitario,
        vi.subtotal AS importe,
        p.codigo,
        p.nombre
      FROM ventas_items vi
      LEFT JOIN productos p ON p.id = vi.producto_id
      WHERE vi.venta_id = ?
      ORDER BY COALESCE(p.nombre, vi.producto_nombre) ASC
      `,
      [id]
    );

    return res.json({
      mensaje: "Ticket",
      data: {
        venta,
        pago: venta.tipo_pago,
        tipoPagoLabel: getTipoPagoLabel(venta.tipo_pago),
        items,
      },
    });
  } catch (err) {
    console.error("ERROR GET /ventas/:id/ticket:", err);
    return res.status(500).json({ error: "Error en BD", message: err.message });
  }
};
// ==========================
// PUT /api/ventas/:id
// ==========================
export const editarVenta = async (req, res) => {
  const { id } = req.params;

  const {
    categoria,
    tipoPago,
    efectivo = 0,
    tarjeta = 0,
    transferencia = 0,
    cheque = 0,
    recibido = 0,
    cambio = 0,
    requiere_factura = 0,
    esCotizacion = false,
    esCotizacionPedido = false,
    abono_inicial = 0,
    fecha_vencimiento = null,
    observaciones_credito = "",
    items = [],
  } = req.body;

  const clienteId = req.body.cliente_id ? Number(req.body.cliente_id) : null;
  const guardarSaldoFavor = Boolean(req.body.guardarSaldoFavor);
  const isCotizacion = Boolean(esCotizacion);
  const isCotizacionPedido = Boolean(esCotizacionPedido);
  const esCotizacionFinal = isCotizacion || isCotizacionPedido;

  if (!categoria || !tipoPago) {
    return res.status(400).json({ error: "Falta categoria o tipoPago" });
  }

  if (!categoriasValidas.includes(categoria)) {
    return res.status(400).json({ error: "Categoría no válida" });
  }

  if (!tiposPagoValidos.includes(tipoPago)) {
    return res.status(400).json({ error: "tipoPago no válido" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Debe traer items" });
  }

  

  const recibidoN = Number(recibido || 0);
  const cambioN = Number(cambio || 0);
  const efectivoN = Number(efectivo || 0);
  const tarjetaN = Number(tarjeta || 0);
  const transferenciaN = Number(transferencia || 0);
  const chequeN = Number(cheque || 0);
  const abonoInicialN = Number(abono_inicial || 0);

  if (!Number.isFinite(recibidoN) || recibidoN < 0) {
    return res.status(400).json({ error: "Recibido inválido" });
  }

  if (!Number.isFinite(cambioN) || cambioN < 0) {
    return res.status(400).json({ error: "Cambio inválido" });
  }

  if (!Number.isFinite(efectivoN) || efectivoN < 0) {
    return res.status(400).json({ error: "Efectivo inválido" });
  }

  if (!Number.isFinite(tarjetaN) || tarjetaN < 0) {
    return res.status(400).json({ error: "Tarjeta inválida" });
  }

  if (!Number.isFinite(transferenciaN) || transferenciaN < 0) {
    return res.status(400).json({ error: "Transferencia inválida" });
  }

  if (!Number.isFinite(chequeN) || chequeN < 0) {
    return res.status(400).json({ error: "Cheque inválido" });
  }

  if (!Number.isFinite(abonoInicialN) || abonoInicialN < 0) {
    return res.status(400).json({ error: "Abono inicial inválido" });
  }

  const requiereFactura = Number(requiere_factura || 0) === 1;

  const esTarjeta =
    tipoPago === "tarjeta_credito" ||
    tipoPago === "tarjeta_debito" ||
    Number(tarjeta || 0) > 0;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [ventaRows] = await conn.query(
      `SELECT id, cliente_id, tipo_pago, es_cotizacion, es_cotizacion_pedido, saldo_pendiente
       FROM ventas
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );

    if (!ventaRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    const ventaAnterior = ventaRows[0];
    const ventaAnteriorEraCotizacion =
      Number(ventaAnterior.es_cotizacion) === 1 ||
      Number(ventaAnterior.es_cotizacion_pedido) === 1;

    if (ventaAnterior.tipo_pago === "a_cuenta" && ventaAnterior.cliente_id) {
      const saldoPendienteAnterior = Number(ventaAnterior.saldo_pendiente || 0);

      if (saldoPendienteAnterior > 0) {
        await conn.query(
          `UPDATE clientes
           SET saldo_actual = GREATEST(COALESCE(saldo_actual, 0) - ?, 0)
           WHERE id = ?`,
          [saldoPendienteAnterior, ventaAnterior.cliente_id]
        );
      }
    }

    const [itemsAnteriores] = await conn.query(
      `SELECT producto_id, cantidad
       FROM ventas_items
       WHERE venta_id = ?`,
      [id]
    );

    if (!ventaAnteriorEraCotizacion) {
      for (const it of itemsAnteriores) {
        if (!it.producto_id) continue;

        await conn.query(
          `UPDATE productos
           SET stock = stock + ?
           WHERE id = ?`,
          [Number(it.cantidad), Number(it.producto_id)]
        );

        await conn.query(
          `INSERT INTO inventario_movimientos
           (producto_id, tipo, cantidad, referencia, usuario_id)
           VALUES (?, 'ENTRADA', ?, ?, ?)`,
          [
            Number(it.producto_id),
            Number(it.cantidad),
            `Edición venta #${id} (reversa)`,
            req.user?.id ?? req.user?.userId ?? req.userId ?? null,
          ]
        );
      }
    }

    await conn.query(
      `UPDATE ventas
       SET categoria = ?, cliente_id = ?, tipo_pago = ?, efectivo = ?, tarjeta = ?, transferencia = ?, cheque = ?, recibido = ?, cambio = ?, es_cotizacion = ?, es_cotizacion_pedido = ?, requiere_factura = ?, abono_inicial = ?, saldo_pendiente = 0, fecha_deuda = ?, fecha_vencimiento = ?, observaciones_credito = ?
       WHERE id = ?`,
      [
        categoria,
        clienteId,
        tipoPago,
        efectivoN,
        tarjetaN,
        transferenciaN,
        chequeN,
        recibidoN,
        cambioN,
        isCotizacion ? 1 : 0,
        isCotizacionPedido ? 1 : 0,
        requiereFactura ? 1 : 0,
        abonoInicialN,
        tipoPago === "a_cuenta" ? new Date() : null,
        fecha_vencimiento || null,
        String(observaciones_credito || "").trim() || null,
        id,
      ]
    );

    await conn.query(`DELETE FROM ventas_items WHERE venta_id = ?`, [id]);

    let total = 0;
    let totalIVA = 0;

    for (const it of items) {
      const productoId = Number(
        it.producto_id ?? it.productoId ?? it.idProducto ?? it.id
      );
      const cantidad = Number(it.cantidad ?? it.qty ?? 0);
      const precioUnitario = Number(
        it.precio_unitario ??
          it.precioUnitario ??
          it.precio ??
          it.precio_venta ??
          0
      );

      let descuentoItem = Number(it.descuento ?? 0);

      if (!Number.isFinite(productoId) || productoId <= 0) {
        throw new Error("Items incompletos o inválidos (producto_id)");
      }

      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        throw new Error("Items incompletos o inválidos (cantidad)");
      }

      if (!Number.isFinite(precioUnitario) || precioUnitario <= 0) {
        throw new Error("Items incompletos o inválidos (precio_unitario)");
      }

      const [prods] = await conn.query(
        `SELECT id, codigo, nombre, tipo, iva_tarjeta, facturable, stock
         FROM productos
         WHERE id = ?
         FOR UPDATE`,
        [productoId]
      );

      if (!prods.length) {
        throw new Error(`Producto no existe: ${productoId}`);
      }

      const p = prods[0];

      if (!esCotizacionFinal) {
        const stockActual = Number(p.stock || 0);
        if (stockActual < cantidad) {
          throw new Error(
            `Stock insuficiente para ${p.codigo} - ${p.nombre}. Disponible: ${stockActual}, requerido: ${cantidad}`
          );
        }
      }

      if (requiereFactura && Number(p.facturable) === 0) {
        throw new Error(`Producto no facturable (Bloqueado): ${p.nombre}`);
      }

      if (String(p.tipo) === "insumo") {
        descuentoItem = 0;
      }

      const productoNombre = `${p.codigo} - ${p.nombre}`;
      const subtotal = Number((cantidad * precioUnitario).toFixed(2));
      total += subtotal;

      const totalFinalItem = Math.max(subtotal - descuentoItem, 0);

      const ivaItem =
        esTarjeta && Number(p.iva_tarjeta) === 1
          ? Number((totalFinalItem * 0.16).toFixed(2))
          : 0;

      totalIVA += ivaItem;

      await conn.query(
        `INSERT INTO ventas_items
          (venta_id, producto_id, producto_nombre, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, productoId, productoNombre, cantidad, precioUnitario, subtotal]
      );

      if (!esCotizacionFinal) {
        await conn.query(
          `UPDATE productos
           SET stock = stock - ?
           WHERE id = ?`,
          [cantidad, productoId]
        );

        await conn.query(
          `INSERT INTO inventario_movimientos
           (producto_id, tipo, cantidad, referencia, usuario_id)
           VALUES (?, 'SALIDA', ?, ?, ?)`,
          [
            productoId,
            cantidad,
            `Edición venta #${id} (aplicación)`,
            req.user?.id ?? req.user?.userId ?? req.userId ?? null,
          ]
        );
      }
    }

    if (total <= 0) throw new Error("El total debe ser mayor a 0");

    total = Number(total.toFixed(2));
    totalIVA = Number(totalIVA.toFixed(2));

    const descuentoPctSeguro = 0;
    const descuento = 0;
    const totalSinIVA = Number(total.toFixed(2));
    const totalConIVA = Number((totalSinIVA + totalIVA).toFixed(2));

    let saldoPendiente = 0;
    let clienteInfo = null;

    if (clienteId) {
      const [[cli]] = await conn.query(
        `SELECT id, nombre, notas, saldo_favor, saldo_actual, permite_credito, deuda_maxima
         FROM clientes
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [clienteId]
      );

      if (!cli) {
        throw new Error("Cliente no encontrado");
      }

      clienteInfo = cli;
    }

    if (tipoPago === "mixto") {
      const suma = Number(
        (efectivoN + tarjetaN + transferenciaN + chequeN).toFixed(2)
      );
      const esperado = Number(totalConIVA.toFixed(2));
      if (suma !== esperado) {
        await conn.rollback();
        return res.status(400).json({
          error:
            "En pago mixto: efectivo + tarjeta + transferencia + cheque debe ser igual al total.",
        });
      }
    }

    if (tipoPago === "tarjeta_credito" || tipoPago === "tarjeta_debito") {
      const esperado = Number(totalConIVA.toFixed(2));
      const t = Number(tarjetaN.toFixed(2));
      if (t !== esperado) {
        await conn.rollback();
        return res.status(400).json({
          error: "En pago con tarjeta: el monto debe ser igual al total final.",
        });
      }
    }

    if (tipoPago === "transferencia") {
      const esperado = Number(totalConIVA.toFixed(2));
      const t = Number(transferenciaN.toFixed(2));
      if (t !== esperado) {
        await conn.rollback();
        return res.status(400).json({
          error: "En pago con transferencia: el monto debe ser igual al total final.",
        });
      }
    }

    if (tipoPago === "cheque") {
      const esperado = Number(totalConIVA.toFixed(2));
      const t = Number(chequeN.toFixed(2));
      if (t !== esperado) {
        await conn.rollback();
        return res.status(400).json({
          error: "En pago con cheque: el monto debe ser igual al total final.",
        });
      }
    }

    if (!esCotizacionFinal && tipoPago === "efectivo") {
      if (recibidoN < totalConIVA) {
        await conn.rollback();
        return res.status(400).json({
          error: "El recibido no puede ser menor al total",
        });
      }

      const cambioReal = Number((recibidoN - totalConIVA).toFixed(2));

      if (clienteId && guardarSaldoFavor && cambioReal > 0) {
        await conn.query(
          "UPDATE clientes SET saldo_favor = COALESCE(saldo_favor,0) + ? WHERE id = ?",
          [cambioReal, clienteId]
        );

        await conn.query(
          `UPDATE ventas SET recibido = ?, cambio = 0 WHERE id = ?`,
          [recibidoN, id]
        );
      } else {
        await conn.query(
          `UPDATE ventas SET recibido = ?, cambio = ? WHERE id = ?`,
          [recibidoN, cambioReal, id]
        );
      }
    } else if (!esCotizacionFinal && tipoPago === "a_cuenta") {
      if (!clienteId) {
        await conn.rollback();
        return res.status(400).json({
          error: "Para pago a cuenta debes seleccionar un cliente",
        });
      }

      if (!clienteInfo) {
        throw new Error("Cliente no encontrado");
      }

      const permiteCredito = Number(clienteInfo.permite_credito || 0) === 1;
      const deudaMaxima = Number(clienteInfo.deuda_maxima || 0);
      const saldoActualCliente = Number(clienteInfo.saldo_actual || 0);

      if (!permiteCredito) {
        throw new Error("El cliente no tiene crédito habilitado");
      }

      if (abonoInicialN > totalConIVA) {
        throw new Error("El abono inicial no puede ser mayor al total final");
      }

      saldoPendiente = Number((totalConIVA - abonoInicialN).toFixed(2));
      const nuevoSaldoCliente = Number((saldoActualCliente + saldoPendiente).toFixed(2));

      if (nuevoSaldoCliente > deudaMaxima) {
        throw new Error(
          `El cliente supera la deuda permitida. Límite: ${deudaMaxima.toFixed(
            2
          )}, saldo actual: ${saldoActualCliente.toFixed(
            2
          )}, pendiente nuevo: ${saldoPendiente.toFixed(2)}`
        );
      }

      await conn.query(
        `UPDATE clientes
         SET saldo_actual = ?
         WHERE id = ?`,
        [nuevoSaldoCliente, clienteId]
      );

      await conn.query(
        `UPDATE ventas
         SET efectivo = ?, tarjeta = 0, transferencia = 0, cheque = 0, recibido = ?, cambio = 0, abono_inicial = ?, saldo_pendiente = ?, fecha_deuda = ?, fecha_vencimiento = ?, observaciones_credito = ?
         WHERE id = ?`,
        [
          abonoInicialN,
          abonoInicialN,
          abonoInicialN,
          saldoPendiente,
          new Date(),
          fecha_vencimiento || null,
          String(observaciones_credito || "").trim() || null,
          id,
        ]
      );
    } else {
      await conn.query(
        `UPDATE ventas SET recibido = 0, cambio = 0 WHERE id = ?`,
        [id]
      );
    }

    await conn.query(
      `UPDATE ventas
       SET total = ?, descuento_pct = ?, descuento = ?, total_iva = ?, total_final = ?
       WHERE id = ?`,
      [total, descuentoPctSeguro, descuento, totalIVA, totalConIVA, id]
    );

    await conn.commit();

    return res.json({
      mensaje: isCotizacionPedido
        ? "Cotización de pedido actualizada"
        : isCotizacion
        ? "Cotización actualizada"
        : "Venta actualizada",
      data: {
        id: Number(id),
        total: Number(total),
        descuento: Number(descuento),
        totalIva: Number(totalIVA),
        totalFinal: Number(totalConIVA),
        tipoPago,
        tipoPagoLabel: getTipoPagoLabel(tipoPago),
        esCotizacion: isCotizacion,
        esCotizacionPedido: isCotizacionPedido,
        abonoInicial: Number(abonoInicialN),
        saldoPendiente: Number(saldoPendiente),
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error("ERROR PUT /ventas/:id:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};
// ==========================
// POST /api/ventas/borrador
// ==========================
export const crearBorrador = async (req, res) => {
  try {
    const { categoria = "publico", cliente_id = null } = req.body;

    const [r] = await pool.query(
      `INSERT INTO ventas
       (categoria, estado, cliente_id, tipo_pago, es_cotizacion, total, descuento, total_final, total_iva, efectivo, tarjeta, transferencia, cheque, recibido, cambio)
       VALUES (?, 'borrador', ?, 'efectivo', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`,
      [categoria, cliente_id]
    );

    return res.json({ mensaje: "Borrador creado", data: { id: r.insertId } });
  } catch (err) {
    console.error("ERROR crearBorrador:", err);
    return res.status(500).json({ error: err.message });
  }
};

// ==========================
// GET /api/ventas/borradores
// ==========================
export const getBorradores = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, categoria, cliente_id, created_at
       FROM ventas
       WHERE estado = 'borrador'
       ORDER BY created_at DESC
       LIMIT 50`
    );

    return res.json({ mensaje: "Borradores", data: rows });
  } catch (err) {
    console.error("ERROR getBorradores:", err);
    return res.status(500).json({ error: err.message });
  }
};

// ==========================
// PUT /api/ventas/:id/items
// ==========================
export const actualizarItemsBorrador = async (req, res) => {
  const { id } = req.params;
  const { items = [] } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "items debe ser arreglo" });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [ventaRows] = await conn.query(
      `SELECT id, estado
       FROM ventas
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );

    if (!ventaRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    if (ventaRows[0].estado !== "borrador") {
      await conn.rollback();
      return res.status(400).json({ error: "Solo se puede editar un borrador" });
    }

    await conn.query(`DELETE FROM ventas_items WHERE venta_id = ?`, [id]);

    for (const it of items) {
      const cantidad = Number(it.cantidad || 0);
      const precio = Number(it.precio_unitario ?? it.precio ?? 0);

      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        throw new Error("Cantidad inválida");
      }

      if (!Number.isFinite(precio) || precio < 0) {
        throw new Error("Precio inválido");
      }

      const subtotal = Number((cantidad * precio).toFixed(2));

      if (it.producto_id) {
        const productoId = Number(it.producto_id);

        const [prods] = await conn.query(
          `SELECT codigo, nombre
           FROM productos
           WHERE id = ?`,
          [productoId]
        );

        if (!prods.length) {
          throw new Error(`Producto no existe: ${productoId}`);
        }

        const productoNombre = `${prods[0].codigo} - ${prods[0].nombre}`;

        await conn.query(
          `INSERT INTO ventas_items
            (venta_id, producto_id, producto_nombre, cantidad, precio_unitario, subtotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, productoId, productoNombre, cantidad, precio, subtotal]
        );
      } else {
        const nombreManual = String(it.producto_nombre || it.nombre || "").trim();

        if (!nombreManual) {
          throw new Error("Item manual requiere producto_nombre");
        }

        await conn.query(
          `INSERT INTO ventas_items
            (venta_id, producto_id, producto_nombre, cantidad, precio_unitario, subtotal)
           VALUES (?, NULL, ?, ?, ?, ?)`,
          [id, nombreManual, cantidad, precio, subtotal]
        );
      }
    }

    await conn.commit();
    return res.json({ mensaje: "Items del borrador actualizados" });
  } catch (err) {
    await conn.rollback();
    console.error("ERROR actualizarItemsBorrador:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};

export const eliminarVenta = async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [ventaRows] = await conn.query(
      `SELECT id, es_cotizacion, es_cotizacion_pedido
       FROM ventas
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );

    if (!ventaRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    const venta = ventaRows[0];
    const esCotizacionFinal =
      Number(venta.es_cotizacion) === 1 ||
      Number(venta.es_cotizacion_pedido) === 1;

    const [items] = await conn.query(
      `SELECT producto_id, cantidad
       FROM ventas_items
       WHERE venta_id = ?`,
      [id]
    );

    if (!esCotizacionFinal) {
      for (const it of items) {
        if (!it.producto_id) continue;

        await conn.query(
          `UPDATE productos
           SET stock = stock + ?
           WHERE id = ?`,
          [Number(it.cantidad), Number(it.producto_id)]
        );

        await conn.query(
          `INSERT INTO inventario_movimientos
           (producto_id, tipo, cantidad, referencia, usuario_id)
           VALUES (?, 'ENTRADA', ?, ?, ?)`,
          [
            Number(it.producto_id),
            Number(it.cantidad),
            `Eliminación venta #${id}`,
            req.user?.id ?? req.user?.userId ?? req.userId ?? null,
          ]
        );
      }
    }

    await conn.query(`DELETE FROM ventas_items WHERE venta_id = ?`, [id]);
    await conn.query(`DELETE FROM ventas WHERE id = ?`, [id]);

    await conn.commit();

    return res.json({
      mensaje: "Venta eliminada",
      data: { id: Number(id) },
    });
  } catch (err) {
    await conn.rollback();
    console.error("ERROR DELETE /ventas/:id:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};
export const getCotizaciones = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        v.*,
        c.nombre AS cliente_nombre,
        COALESCE(
          GROUP_CONCAT(CONCAT(vi.producto_nombre, ' x', vi.cantidad) SEPARATOR ', '),
          ''
        ) AS productos_resumen
      FROM ventas v
      LEFT JOIN ventas_items vi ON vi.venta_id = v.id
      LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE COALESCE(v.estado, '') <> 'borrador'
        AND COALESCE(v.es_cotizacion, 0) = 1
        AND COALESCE(v.es_cotizacion_pedido, 0) = 0
      GROUP BY v.id, c.nombre
      ORDER BY v.created_at DESC
    `);

    return res.json({
      mensaje: "Listado de cotizaciones",
      data: rows,
    });
  } catch (err) {
    console.error("ERROR GET /ventas/cotizaciones/lista:", err);
    return res.status(500).json({
      error: "Error en BD",
      message: err.sqlMessage || err.message,
    });
  }
};

export const getPedidos = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        v.*,
        c.nombre AS cliente_nombre,
        COALESCE(
          GROUP_CONCAT(CONCAT(vi.producto_nombre, ' x', vi.cantidad) SEPARATOR ', '),
          ''
        ) AS productos_resumen
      FROM ventas v
      LEFT JOIN ventas_items vi ON vi.venta_id = v.id
      LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE COALESCE(v.estado, '') <> 'borrador'
        AND COALESCE(v.es_cotizacion_pedido, 0) = 1
      GROUP BY v.id, c.nombre
      ORDER BY v.created_at DESC
    `);

    return res.json({
      mensaje: "Listado de pedidos",
      data: rows,
    });
  } catch (err) {
    console.error("ERROR GET /ventas/pedidos/lista:", err);
    return res.status(500).json({
      error: "Error en BD",
      message: err.sqlMessage || err.message,
    });
  }
};