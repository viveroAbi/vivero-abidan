import { pool } from "../config/db.js";
import { calcularDescuento } from "../services/descuentos.service.js";

const categoriasValidas = [
  "publico",
  "revendedor",
  "jardinero",
  "paisajista",
  "arquitecto",
  "mayoreo",
  "vivero",
];

const tiposPagoValidos = [
  "efectivo",
  "tarjeta_credito",
  "tarjeta_debito",
  "transferencia",
  "cheque",
  "mixto",
];

const getTipoPagoLabel = (tipoPago) =>
  ({
    efectivo: "Efectivo",
    tarjeta_credito: "Tarjeta (Crédito)",
    tarjeta_debito: "Tarjeta (Débito)",
    transferencia: "Transferencia",
    cheque: "Cheque",
    mixto: "Mixto",
  }[tipoPago] || tipoPago);

// ==========================
// GET /api/ventas
// ==========================
export const getVentas = async (req, res) => {
  try {
    const [rows] = await pool.query(`
  SELECT 
    v.*,
    COALESCE(
      GROUP_CONCAT(CONCAT(vi.producto_nombre, ' x', vi.cantidad) SEPARATOR ', '),
      ''
    ) AS productos_resumen
  FROM ventas v
  LEFT JOIN ventas_items vi ON vi.venta_id = v.id
  WHERE COALESCE(v.estado, '') <> 'borrador'
  GROUP BY v.id
  ORDER BY v.created_at DESC
`);

    return res.json({ mensaje: "Listado de ventas", data: rows });
  } catch (err) {
    console.error("ERROR GET /ventas:", err);
    return res
      .status(500)
      .json({ error: "Error en BD", message: err.sqlMessage || err.message });
  }
};


// ==========================
// GET /api/ventas/hoy
// ==========================
export const getVentasHoy = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM ventas
      WHERE DATE(created_at) = CURDATE()
      ORDER BY created_at DESC
    `);

    return res.json({ mensaje: "Ventas de hoy", data: rows });
  } catch (err) {
    console.error("ERROR GET /ventas/hoy:", err);
    return res
      .status(500)
      .json({ error: "Error en BD", message: err.sqlMessage || err.message });
  }
};

// ==========================
// GET /api/ventas/resumen
// ==========================
export const getResumenVentas = async (req, res) => {
  try {
    const [[hoy]] = await pool.query(`
      SELECT 
        COUNT(*) AS ventasHoy,
        COALESCE(SUM(total_final), 0) AS totalHoy
      FROM ventas
      WHERE DATE(created_at) = CURDATE()
    `);

    const [[general]] = await pool.query(`
      SELECT 
        COUNT(*) AS ventasTotales,
        COALESCE(SUM(total_final), 0) AS totalGeneral
      FROM ventas
    `);

    const [porCategoria] = await pool.query(`
      SELECT 
        categoria,
        COUNT(*) AS cantidad,
        COALESCE(SUM(total_final), 0) AS total
      FROM ventas
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
  cliente_id = null,            // ✅ AGREGAR
  guardarSaldoFavor = false,    // ✅ AGREGAR
  efectivo = 0,
  tarjeta = 0,
  recibido = 0,
  cambio = 0,
  requiere_factura = 0,
  esCotizacion = false,
  esCotizacionPedido = false,
  items = [],
} = req.body;
const clienteId = cliente_id ? Number(cliente_id) : null;
const guardarSaldoFavorBool = Boolean(guardarSaldoFavor);
const isCotizacion = Boolean(esCotizacion);
const isCotizacionPedido = Boolean(esCotizacionPedido);
const esCotizacionFinal = isCotizacion || isCotizacionPedido; // ✅ AGREGAR
  // Validaciones básicas
  if (!categoria || !tipoPago) {
    return res.status(400).json({ message: "Falta categoria o tipoPago" });
  }
  if (!categoriasValidas.includes(categoria)) {
    return res.status(400).json({ error: "Categoría no válida" });
  }
  // 4) Validar pago mixto contra totalConIVA
// 4) Validar pago mixto contra totalConIVA
// 4) Validar pago mixto contra totalConIVA


  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "La venta debe traer items" });
  }

  // Restricción: publico solo efectivo si NO es cotización
if (!isCotizacion && !isCotizacionPedido && categoria === "publico" && tipoPago !== "efectivo") {  return res.status(400).json({
    error: "Venta al público solo acepta efectivo",
  });
}

  const recibidoN = Number(recibido || 0);
  const cambioN = Number(cambio || 0);

  if (!Number.isFinite(recibidoN) || recibidoN < 0) {
    return res.status(400).json({ error: "Recibido inválido" });
  }
  if (!Number.isFinite(cambioN) || cambioN < 0) {
    return res.status(400).json({ error: "Cambio inválido" });
  }

  // Reglas negocio
  const requiereFactura = Number(req.body.requiere_factura || 0) === 1;

  const esTarjeta =
    tipoPago === "tarjeta_credito" ||
    tipoPago === "tarjeta_debito" ||
    Number(tarjeta || 0) > 0;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Insertar venta primero (totales en 0)
    

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
     recibido,
     cambio,
     es_cotizacion,
     es_cotizacion_pedido,
     requiere_factura
   )
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    categoria,
    clienteId,
    tipoPago,
    0,
    0,
    0,
    0,
    Number(efectivo || 0),
    Number(tarjeta || 0),
    recibidoN,
    cambioN,
    isCotizacion ? 1 : 0,
    isCotizacionPedido ? 1 : 0,
    requiereFactura ? 1 : 0,
  ]
);

const ventaId = result.insertId;
/*
    // ==========================
// GUARDAR DETALLE DE LA VENTA
// ==========================
if (Array.isArray(items) && items.length > 0) {
  for (const item of items) {
    const cantidad = Number(item.cantidad || 0);

    // Ajusta el nombre del producto según cómo venga en tu frontend
    const producto = String(
      item.producto || item.nombre || item.descripcion || ""
    ).trim();

    // Ajusta el precio según cómo venga en tus items
    const precio = Number(
      item.precio ?? item.precio_unitario ?? item.precioVenta ?? 0
    );

    // Si no viene importe, se calcula
    const importe = Number(item.importe ?? (cantidad * precio));

    // Validación mínima para no meter basura
    if (!producto || !Number.isFinite(cantidad) || cantidad <= 0) continue;

    await conn.query(
  `
  INSERT INTO venta_detalle (venta_id, cantidad, producto, precio, importe)
  VALUES (?, ?, ?, ?, ?)
  `,
  [ventaId, cantidad, producto, Number(precio || 0), Number(importe || 0)]
);
  }
}*/
    // 2) Insertar items y calcular total + IVA con reglas
    let total = 0;       // subtotal (sin descuento)
    let totalIVA = 0;    // iva total

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



  // ✅ Traer producto + STOCK y bloquear fila (FOR UPDATE)
  const [prods] = await conn.query(
    `SELECT id, codigo, nombre, tipo, iva_tarjeta, facturable, stock
     FROM productos
     WHERE id = ?
     FOR UPDATE`,
    [productoId]
  );

  if (!prods.length) throw new Error(`Producto no existe: ${productoId}`);

  const p = prods[0];

  // ✅ Si NO es cotización, validar stock
  if (!isCotizacion && !isCotizacionPedido) {
  const stockActual = Number(p.stock || 0);
  if (stockActual < cantidad) {
    throw new Error(
      `Stock insuficiente para ${p.codigo} - ${p.nombre}. Disponible: ${stockActual}, requerido: ${cantidad}`
    );
  }
}

  // BLOQUEO factura (Tierra)
  if (requiereFactura && Number(p.facturable) === 0) {
    throw new Error(`Producto no facturable (Bloqueado): ${p.nombre}`);
  }

  // DESCUENTO solo plantas: insumo => 0
  if (String(p.tipo) === "insumo") {
    descuentoItem = 0;
  }

  const productoNombre = `${p.codigo} - ${p.nombre}`;

  const subtotal = cantidad * precioUnitario;
  total += subtotal;

  const totalFinalItem = Math.max(subtotal - descuentoItem, 0);

  // IVA SOLO si es tarjeta y producto tiene iva_tarjeta=1
  const ivaItem =
    esTarjeta && Number(p.iva_tarjeta) === 1
      ? Number((totalFinalItem * 0.16).toFixed(2))
      : 0;

  totalIVA += ivaItem;

  // ✅ Guardar item
  await conn.query(
    `INSERT INTO ventas_items
      (venta_id, producto_id, producto_nombre, cantidad, precio_unitario, subtotal)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [ventaId, productoId, productoNombre, cantidad, precioUnitario, subtotal]
  );

  // ✅ Descontar inventario SOLO si es venta real (no cotización / no pedido)
if (!isCotizacion && !isCotizacionPedido) {
  await conn.query(
    "UPDATE productos SET stock = stock - ? WHERE id = ?",
    [cantidad, productoId]
  );

  await conn.query(
    `INSERT INTO inventario_movimientos
     (producto_id, tipo, cantidad, referencia, usuario_id)
     VALUES (?, 'SALIDA', ?, ?, ?)`,
    [productoId, cantidad, `Venta #${ventaId}`,(req.user?.id ?? req.user?.userId ?? req.userId ?? null)]
  );
}
}

    if (total <= 0) throw new Error("El total debe ser mayor a 0");

    total = Number(total.toFixed(2));
    totalIVA = Number(totalIVA.toFixed(2));

    // 3) Descuento general (tu lógica) y total final con IVA
    const descuentoPct = Number(req.body.descuentoPct || 0);
    const descuentoPctSeguro = Math.min(Math.max(descuentoPct, 0), 100);

    let descuento = 0;

    if (descuentoPctSeguro > 0) {
      descuento = Number((total * (descuentoPctSeguro / 100)).toFixed(2));
    } else {
      const esTarjetaLocal =
        tipoPago === "tarjeta_credito" || tipoPago === "tarjeta_debito";
      descuento = esTarjetaLocal ? 0 : Number(calcularDescuento(categoria, total));
    }

    const totalSinIVA = Number((total - descuento).toFixed(2));
    const totalConIVA = Number((totalSinIVA + totalIVA).toFixed(2));
    
    // ===============================
// ✅ SALDO A FAVOR (DESPUÉS DE totalConIVA)
// ===============================
let saldoAntes = 0;
let saldoAplicado = 0;
let saldoGuardado = 0;

if (clienteId) {
  const [[cli]] = await conn.query(
    "SELECT saldo_favor FROM clientes WHERE id = ? LIMIT 1 FOR UPDATE",
    [clienteId]
  );
  saldoAntes = Number(cli?.saldo_favor || 0);

  // por ahora: SOLO APLICAR saldo si tú quieres que se aplique automático
  // (si NO quieres aplicarlo automático, déjalo en 0)
  saldoAplicado = 0;
}

// Total que realmente se cobra hoy
const totalACobrar = Number((totalConIVA - saldoAplicado).toFixed(2));

    // 4) Validar pago mixto contra totalConIVA
    if (tipoPago === "mixto") {
      if (Number(efectivo) + Number(tarjeta) !== Number(totalConIVA)) {
        throw new Error("El pago mixto no coincide con el total final");
      }
    }

    // 4.1) Validar efectivo (SOLO si no es cotización)
if (!isCotizacion && !isCotizacionPedido && tipoPago === "efectivo") {
  if (recibidoN < totalACobrar) {
    throw new Error("El recibido no puede ser menor al total a cobrar");
  }

  const cambioCalc = Number((recibidoN - totalACobrar).toFixed(2));

  // ✅ Guardar cambio como saldo (solo si hay cliente)
  if (clienteId && guardarSaldoFavorBool && cambioCalc > 0) {
    await conn.query(
      "UPDATE clientes SET saldo_favor = COALESCE(saldo_favor,0) + ? WHERE id = ?",
      [cambioCalc, clienteId]
    );

    // si se guarda como saldo, no hay cambio físico
    await conn.query(
  "UPDATE ventas SET cambio=0, recibido=? WHERE id=?",
  [recibidoN, ventaId]
);
  } else {
    await conn.query(
  "UPDATE ventas SET cambio=?, recibido=? WHERE id=?",
  [cambioCalc, recibidoN, ventaId]
);
  }
}
    // 5) Actualizar venta con totales + IVA
    await conn.query(
  `UPDATE ventas
   SET total=?, descuento=?, total_iva=?, total_final=?
   WHERE id=?`,
  [total, descuento, totalIVA, totalConIVA, ventaId]
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
    esCotizacionPedido: isCotizacionPedido, // ✅ NUEVO
  },
});
  } catch (err) {
    await conn.rollback();
    console.error("ERROR POST /ventas:", err);
    return res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

// ==========================
// DELETE /api/ventas/:id
// ==========================
export const eliminarVenta = async (req, res) => {
  const { id } = req.params;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Verificar que exista la venta
    const [ventas] = await conn.query(
      "SELECT id FROM ventas WHERE id = ?",
      [id]
    );

    if (ventas.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    // 2) Traer items de la venta (para regresar stock)
    const [items] = await conn.query(
      `SELECT producto_id, cantidad
       FROM ventas_items
       WHERE venta_id = ?`,
      [id]
    );

    // 3) Regresar stock + registrar movimiento ENTRADA (cancelación)
    for (const it of items) {
      // Solo si tiene producto_id (por si en algún caso hay item manual)
      if (it.producto_id) {
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
            `Cancelación venta #${id}`,
            req.user?.id || null,
          ]
        );
      }
    }

    // 4) Borrar items de la venta
    await conn.query("DELETE FROM ventas_items WHERE venta_id = ?", [id]);

    // 5) Borrar venta
    const [result] = await conn.query(
  "DELETE FROM ventas WHERE id = ?",
  [id]
);

    if (result.affectedRows === 0) {
      throw new Error("No se pudo eliminar la venta");
    }

    await conn.commit();

    return res.json({
      mensaje: "Venta eliminada correctamente",
      data: {
        id: Number(id),
        stockDevuelto: true,
        movimientosRegistrados: items.filter(i => i.producto_id).length,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error("ERROR DELETE /ventas/:id:", err);
    return res.status(500).json({
      error: "Error en BD",
      message: err.sqlMessage || err.message,
    });
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
    const [ventaRows] = await pool.query(`SELECT * FROM ventas WHERE id=?`, [
      id,
    ]);
    if (ventaRows.length === 0)
      return res.status(404).json({ message: "Venta no encontrada" });

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
    return res.status(500).json({ message: err.message });
  }
};
export const eliminarBorrador = async (req, res) => {
  let conn;
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID de borrador inválido" });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // ✅ Borra detalles posibles (usa las tablas que existan en tu proyecto)
    await conn.query("DELETE FROM ventas_items WHERE venta_id = ?", [id]).catch(() => {});
    await conn.query("DELETE FROM venta_detalle WHERE venta_id = ?", [id]).catch(() => {});
    await conn.query("DELETE FROM venta_items WHERE venta_id = ?", [id]).catch(() => {});

    // ✅ Borra la cabecera del borrador/venta
    const [result] = await conn.query(
      "DELETE FROM ventas WHERE id = ?",
      [id]
    );

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
      "SELECT * FROM ventas WHERE id = ?",
      [id]
    );
    if (!ventaRows.length) return res.status(404).json({ error: "Venta no encontrada" });

    const venta = ventaRows[0];

    const [items] = await pool.query(
  `
  SELECT 
    vi.producto_id,                 -- ✅ AGREGAR
    vi.producto_nombre,             -- ✅ AGREGAR (respaldo)
    vi.cantidad,
    vi.precio_unitario,
    vi.subtotal AS importe,
    p.codigo,
    p.nombre
  FROM ventas_items vi
  LEFT JOIN productos p ON p.id = vi.producto_id   -- ✅ LEFT JOIN para no romper si falta producto
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
    recibido = 0,
    cambio = 0,
    requiere_factura = 0,
    esCotizacion = false,
    esCotizacionPedido = false, // ✅
    items = [],
  } = req.body;
  // ✅ leer cliente_id y guardarSaldoFavor del body
const clienteId = req.body.cliente_id ? Number(req.body.cliente_id) : null;
const guardarSaldoFavor = Boolean(req.body.guardarSaldoFavor);
  const isCotizacion = Boolean(esCotizacion);
  const isCotizacionPedido = Boolean(esCotizacionPedido); // ✅
  const esCotizacionFinal = isCotizacion || isCotizacionPedido; // ✅

  // Validaciones básicas
  if (!categoria || !tipoPago) {
    return res.status(400).json({ message: "Falta categoria o tipoPago" });
  }
  if (!categoriasValidas.includes(categoria)) {
    return res.status(400).json({ error: "Categoría no válida" });
  }
  if (!tiposPagoValidos.includes(tipoPago)) {
    return res.status(400).json({ error: "tipoPago no válido" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Debe traer items" });
  }

  // Restricción: público solo efectivo si NO es cotización
 if (!esCotizacionFinal && categoria === "publico" && tipoPago !== "efectivo") {
  return res.status(400).json({
    error: "Venta al público solo acepta efectivo",
  });
}

  const recibidoN = Number(recibido || 0);
  const cambioN = Number(cambio || 0);

  if (!Number.isFinite(recibidoN) || recibidoN < 0) {
    return res.status(400).json({ error: "Recibido inválido" });
  }
  if (!Number.isFinite(cambioN) || cambioN < 0) {
    return res.status(400).json({ error: "Cambio inválido" });
  }

  const requiereFactura = Number(requiere_factura || 0) === 1;

  const esTarjeta =
    tipoPago === "tarjeta_credito" ||
    tipoPago === "tarjeta_debito" ||
    Number(tarjeta || 0) > 0;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Verificar que exista la venta
    const [ventaRows] = await conn.query(
  `SELECT id, es_cotizacion, es_cotizacion_pedido FROM ventas WHERE id=? FOR UPDATE`,
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

    // 2) Traer items anteriores para devolver stock (si la venta anterior NO era cotización)
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
            (req.user?.id ?? req.user?.userId ?? req.userId ?? null),
          ]
        );
      }
    }

    // 3) Actualizar datos base de la venta
    await conn.query(
  `UPDATE ventas
   SET categoria=?, tipo_pago=?, efectivo=?, tarjeta=?, es_cotizacion=?, es_cotizacion_pedido=?, requiere_factura=?
   WHERE id=?`,
  [
    categoria,
    tipoPago,
    Number(efectivo || 0),
    Number(tarjeta || 0),
    isCotizacion ? 1 : 0,
    isCotizacionPedido ? 1 : 0, // ✅ AGREGAR
    requiereFactura ? 1 : 0,
    id,
  ]
);

    // 4) Borrar items anteriores
    await conn.query(`DELETE FROM ventas_items WHERE venta_id=?`, [id]);

    // 5) Insertar items nuevos + recalcular total + IVA + mover inventario
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
    console.error("ITEM INVÁLIDO (productoId):", it);
    throw new Error("Items incompletos o inválidos (producto_id)");
  }

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    console.error("ITEM INVÁLIDO (cantidad):", it);
    throw new Error("Items incompletos o inválidos (cantidad)");
  }

  if (!Number.isFinite(precioUnitario) || precioUnitario <= 0) {
    console.error("ITEM INVÁLIDO (precio):", it);
    throw new Error("Items incompletos o inválidos (precio_unitario)");
  }

      // Traer producto + stock y bloquear fila
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

      // Validar stock SOLO si la venta editada quedará como venta real (no cotización)
      if (!esCotizacionFinal) {
        const stockActual = Number(p.stock || 0);
        if (stockActual < cantidad) {
          throw new Error(
            `Stock insuficiente para ${p.codigo} - ${p.nombre}. Disponible: ${stockActual}, requerido: ${cantidad}`
          );
        }
      }

      // Bloqueo factura
      if (requiereFactura && Number(p.facturable) === 0) {
        throw new Error(`Producto no facturable (Bloqueado): ${p.nombre}`);
      }

      // Descuento por item: insumo => 0
      if (String(p.tipo) === "insumo") {
        descuentoItem = 0;
      }

      const productoNombre = `${p.codigo} - ${p.nombre}`;
      const subtotal = Number((cantidad * precioUnitario).toFixed(2));
      total += subtotal;

      const totalFinalItem = Math.max(subtotal - descuentoItem, 0);

      // IVA SOLO si es tarjeta y producto tiene iva_tarjeta=1
      const ivaItem =
        esTarjeta && Number(p.iva_tarjeta) === 1
          ? Number((totalFinalItem * 0.16).toFixed(2))
          : 0;

      totalIVA += ivaItem;

      // Guardar item
      await conn.query(
        `INSERT INTO ventas_items
          (venta_id, producto_id, producto_nombre, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, productoId, productoNombre, cantidad, precioUnitario, subtotal]
      );

      // Descontar inventario SOLO si queda como venta real
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
            (req.user?.id ?? req.user?.userId ?? req.userId ?? null),
          ]
        );
      }
    }

    if (total <= 0) throw new Error("El total debe ser mayor a 0");

    total = Number(total.toFixed(2));
    totalIVA = Number(totalIVA.toFixed(2));

    // 6) Descuento general
    const descuentoPct = Number(req.body.descuentoPct || 0);
    const descuentoPctSeguro = Math.min(Math.max(descuentoPct, 0), 100);

    let descuento = 0;
    if (descuentoPctSeguro > 0) {
      descuento = Number((total * (descuentoPctSeguro / 100)).toFixed(2));
    } else {
      const esTarjetaLocal =
        tipoPago === "tarjeta_credito" || tipoPago === "tarjeta_debito";
      descuento = esTarjetaLocal ? 0 : Number(calcularDescuento(categoria, total));
    }

    const totalSinIVA = Number((total - descuento).toFixed(2));
    const totalConIVA = Number((totalSinIVA + totalIVA).toFixed(2));

    // 7) Validar pago mixto (400, no 500)
    // ===============================
// ✅ VALIDACIONES CONTRA totalACobrar (no totalFinal)
// ===============================
const efectivoN = Number(efectivo || 0);
const tarjetaN = Number(tarjeta || 0);

// Mixto: efectivo + tarjeta = totalACobrar
if (tipoPago === "mixto") {
  const suma = Number((efectivoN + tarjetaN).toFixed(2));
  const esperado = Number(totalConIVA.toFixed(2));
  if (suma !== esperado) {
    return res.status(400).json({
      error: "En pago mixto: efectivo + tarjeta debe ser igual al total final.",
    });
  }
}

if (tipoPago === "tarjeta_credito" || tipoPago === "tarjeta_debito") {
  const esperado = Number(totalConIVA.toFixed(2));
  const t = Number(tarjetaN.toFixed(2));
  if (t !== esperado) {
    return res.status(400).json({
      error: "En pago con tarjeta: el monto debe ser igual al total final.",
    });
  }
}

if (!esCotizacionFinal && tipoPago === "efectivo") {
  if (recibidoN < totalConIVA) {
    return res.status(400).json({
      error: "Recibido insuficiente.",
    });
  }
}

    // 8) Validar efectivo (solo si no es cotización)
    if (!esCotizacionFinal && tipoPago === "efectivo") {
      if (recibidoN < totalConIVA) {
        await conn.rollback();
        return res.status(400).json({
          message: "El recibido no puede ser menor al total",
        });
      }

      const cambioReal = Number((recibidoN - totalConIVA).toFixed(2));

      await conn.query(
        `UPDATE ventas SET recibido=?, cambio=? WHERE id=?`,
        [recibidoN, cambioReal, id]
      );
    } else {
      await conn.query(
        `UPDATE ventas SET recibido=0, cambio=0 WHERE id=?`,
        [id]
      );
    }

    // 9) Actualizar totales finales
    await conn.query(
      `UPDATE ventas
       SET total=?, descuento=?, total_iva=?, total_final=?
       WHERE id=?`,
      [total, descuento, totalIVA, totalConIVA, id]
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
    esCotizacionPedido: isCotizacionPedido, // ✅ AGREGAR
  },
});
  } catch (err) {
    await conn.rollback();
    console.error("ERROR PUT /ventas/:id:", err);
    return res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

// POST /api/ventas/borrador
export const crearBorrador = async (req, res) => {
  try {
    const { categoria = "publico", cliente_id = null } = req.body;

    const [r] = await pool.query(
  `INSERT INTO ventas
   (categoria, estado, cliente_id, tipo_pago, es_cotizacion, total, descuento, total_final, total_iva, efectivo, tarjeta, recibido, cambio)
   VALUES (?, 'borrador', ?, 'efectivo', 0, 0, 0, 0, 0, 0, 0, 0, 0)`,
  [categoria, cliente_id]
);

    return res.json({ mensaje: "Borrador creado", data: { id: r.insertId } });
  } catch (err) {
    console.error("ERROR crearBorrador:", err);
    return res.status(500).json({ error: err.message });
  }
};
// GET /api/ventas/borradores
export const getBorradores = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, categoria, cliente_id, created_at
       FROM ventas
       WHERE estado='borrador'
       ORDER BY created_at DESC
       LIMIT 50`
    );
    return res.json({ mensaje: "Borradores", data: rows });
  } catch (err) {
    console.error("ERROR getBorradores:", err);
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/ventas/:id/items
export const actualizarItemsBorrador = async (req, res) => {
  const { id } = req.params;
  const { items = [] } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "items debe ser arreglo" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

// 1) Verificar que exista la venta
const [ventaRows] = await conn.query(
  `SELECT id, es_cotizacion, es_cotizacion_pedido FROM ventas WHERE id=? FOR UPDATE`,
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
    if (!v.length) return res.status(404).json({ error: "Venta no existe" });
    if (v[0].estado !== "borrador") {
      return res.status(400).json({ error: "Solo se puede editar un borrador" });
    }

    // borra items anteriores
    await conn.query(`DELETE FROM ventas_items WHERE venta_id=?`, [id]);

    // inserta nuevos
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

      // ✅ Caso normal: producto_id
      if (it.producto_id) {
        const productoId = Number(it.producto_id);

        const [prods] = await conn.query(
          `SELECT codigo, nombre FROM productos WHERE id=?`,
          [productoId]
        );
        if (!prods.length) throw new Error(`Producto no existe: ${productoId}`);

        const productoNombre = `${prods[0].codigo} - ${prods[0].nombre}`;

        await conn.query(
          `INSERT INTO ventas_items (venta_id, producto_id, producto_nombre, cantidad, precio_unitario, subtotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, productoId, productoNombre, cantidad, precio, subtotal]
        );
      } else {
        // ✅ Ticket rápido: item manual (sin producto_id)
        const nombreManual = String(it.producto_nombre || it.nombre || "").trim();
        if (!nombreManual) throw new Error("Item manual requiere producto_nombre");

        await conn.query(
          `INSERT INTO ventas_items (venta_id, producto_id, producto_nombre, cantidad, precio_unitario, subtotal)
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


