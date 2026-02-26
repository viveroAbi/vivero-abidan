import { pool } from "../config/db.js";

// Helpers
const money = (n) =>
  Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const fmtFechaMX = (date) =>
  new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City" }).format(date);

const fmtHoraMX = (date) =>
  new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

// Construye WHERE para ventas / gastos (si tu tabla gastos NO usa created_at, cambia la columna abajo)
const buildWhere = ({
  fecha = null,
  periodo = "diario",
  columnaFecha = "created_at",
}) => {
  const p = String(periodo || "diario").toLowerCase();

  // Con fecha base enviada por query (?fecha=YYYY-MM-DD)
  if (fecha) {
    if (p === "semanal") {
      return {
        where: `YEARWEEK(${columnaFecha}, 1) = YEARWEEK(?, 1)`,
        params: [fecha],
      };
    }

    if (p === "mensual") {
      return {
        where: `YEAR(${columnaFecha}) = YEAR(?) AND MONTH(${columnaFecha}) = MONTH(?)`,
        params: [fecha, fecha],
      };
    }

    if (p === "anual") {
      return {
        where: `YEAR(${columnaFecha}) = YEAR(?)`,
        params: [fecha],
      };
    }

    // diario
    return {
      where: `DATE(${columnaFecha}) = ?`,
      params: [fecha],
    };
  }

  // Sin fecha => periodo actual
  if (p === "semanal") {
    return {
      where: `YEARWEEK(${columnaFecha}, 1) = YEARWEEK(CURDATE(), 1)`,
      params: [],
    };
  }

  if (p === "mensual") {
    return {
      where: `YEAR(${columnaFecha}) = YEAR(CURDATE()) AND MONTH(${columnaFecha}) = MONTH(CURDATE())`,
      params: [],
    };
  }

  if (p === "anual") {
    return {
      where: `YEAR(${columnaFecha}) = YEAR(CURDATE())`,
      params: [],
    };
  }

  // diario
  return {
    where: `DATE(${columnaFecha}) = CURDATE()`,
    params: [],
  };
};

// GET /api/reporte/diario?fecha=YYYY-MM-DD&periodo=diario|semanal|mensual|anual
export const reporteDiario = async (req, res) => {
  try {
    const fecha = req.query.fecha || null;
    const periodo = String(req.query.periodo || "diario").toLowerCase();

    // OJO: si en "gastos" tu columna es diferente, cambia "created_at" por la real.
    const { where: whereVentas, params: paramsVentas } = buildWhere({
      fecha,
      periodo,
      columnaFecha: "created_at",
    });

    const { where: whereGastos, params: paramsGastos } = buildWhere({
      fecha,
      periodo,
      columnaFecha: "created_at",
    });

    // ===== Ventas por forma de pago =====
    const [ventasPorPago] = await pool.query(
      `
      SELECT tipo_pago, COALESCE(SUM(total_final),0) AS total
      FROM ventas
      WHERE ${whereVentas} AND es_cotizacion=0
      GROUP BY tipo_pago
      `,
      paramsVentas
    );

    // ===== Ventas por categoría =====
    const [ventasPorCategoria] = await pool.query(
      `
      SELECT categoria, COALESCE(SUM(total_final),0) AS total, COUNT(*) AS cantidad
      FROM ventas
      WHERE ${whereVentas} AND es_cotizacion=0
      GROUP BY categoria
      ORDER BY total DESC
      `,
      paramsVentas
    );

    // ===== Total ventas =====
    const [[totalVentas]] = await pool.query(
      `
      SELECT COALESCE(SUM(total_final),0) AS total
      FROM ventas
      WHERE ${whereVentas} AND es_cotizacion=0
      `,
      paramsVentas
    );

    // ===== Gastos por categoría =====
    const [gastosPorCategoria] = await pool.query(
      `
      SELECT categoria, COALESCE(SUM(monto),0) AS total
      FROM gastos
      WHERE ${whereGastos}
      GROUP BY categoria
      ORDER BY total DESC
      `,
      paramsGastos
    );

    // ===== Gastos por subcategoría =====
    const [gastosPorSub] = await pool.query(
      `
      SELECT categoria, subcategoria, COALESCE(SUM(monto),0) AS total
      FROM gastos
      WHERE ${whereGastos}
      GROUP BY categoria, subcategoria
      ORDER BY categoria ASC, total DESC
      `,
      paramsGastos
    );

    // ===== Total gastos =====
    const [[totalGastos]] = await pool.query(
      `
      SELECT COALESCE(SUM(monto),0) AS total
      FROM gastos
      WHERE ${whereGastos}
      `,
      paramsGastos
    );

    // ===== Caja (simple): efectivo ventas - efectivo gastos =====
    const [[ventasEfectivo]] = await pool.query(
      `
      SELECT COALESCE(SUM(total_final),0) AS total
      FROM ventas
      WHERE ${whereVentas} AND es_cotizacion=0 AND tipo_pago='efectivo'
      `,
      paramsVentas
    );

    const [[gastosEfectivo]] = await pool.query(
      `
      SELECT COALESCE(SUM(monto),0) AS total
      FROM gastos
      WHERE ${whereGastos} AND metodo_pago='efectivo'
      `,
      paramsGastos
    );

    const caja = Number(ventasEfectivo.total) - Number(gastosEfectivo.total);

    return res.json({
      mensaje: `Reporte ${periodo}`,
      data: {
        periodo,
        fecha: fecha || "ACTUAL",
        ventasPorPago,
        ventasPorCategoria,
        totalVentas: Number(totalVentas.total),
        gastosPorCategoria,
        gastosPorSub,
        totalGastos: Number(totalGastos.total),
        caja: Number(caja.toFixed(2)),
      },
    });
  } catch (err) {
    console.error("ERROR reporte:", err);
    return res.status(500).json({ error: "Error en BD", message: err.message });
  }
};

// POST /api/reporte/gastos
export const crearGasto = async (req, res) => {
  try {
    const {
      categoria,
      subcategoria = null,
      monto,
      metodo_pago,
      nota = null,
    } = req.body;

    const montoN = Number(monto);

    if (!categoria || typeof categoria !== "string" || !categoria.trim()) {
      return res.status(400).json({ error: "Categoría inválida" });
    }

    if (!Number.isFinite(montoN) || montoN <= 0) {
      return res.status(400).json({ error: "Monto inválido" });
    }

    if (!metodo_pago || typeof metodo_pago !== "string" || !metodo_pago.trim()) {
      return res.status(400).json({ error: "Método de pago inválido" });
    }

    await pool.query(
      `
      INSERT INTO gastos (categoria, subcategoria, monto, metodo_pago, nota)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        categoria.trim(),
        subcategoria ? String(subcategoria).trim() : null,
        montoN,
        metodo_pago.trim(),
        nota ? String(nota).trim() : null,
      ]
    );

    return res.json({ mensaje: "Gasto guardado" });
  } catch (err) {
    console.error("ERROR POST /gastos:", err);
    return res.status(500).json({ error: "Error en BD", message: err.message });
  }
};

// GET /api/reporte/corte/ticket?fecha=YYYY-MM-DD&periodo=diario|semanal|mensual|anual
export const ticketCorteDiario = async (req, res) => {
  try {
    const fecha = req.query.fecha || null;
    const periodo = String(req.query.periodo || "diario").toLowerCase();

    const { where: whereVentas, params: paramsVentas } = buildWhere({
      fecha,
      periodo,
      columnaFecha: "created_at",
    });

    const { where: whereGastos, params: paramsGastos } = buildWhere({
      fecha,
      periodo,
      columnaFecha: "created_at",
    });

    const baseDate = fecha ? new Date(`${fecha}T12:00:00`) : new Date();
    const now = new Date();

    // ventas por pago
    const [ventasPorPago] = await pool.query(
      `
      SELECT tipo_pago, COALESCE(SUM(total_final),0) AS total
      FROM ventas
      WHERE ${whereVentas} AND es_cotizacion=0
      GROUP BY tipo_pago
      `,
      paramsVentas
    );

    // ventas por categoria
    const [ventasPorCategoria] = await pool.query(
      `
      SELECT categoria, COALESCE(SUM(total_final),0) AS total, COUNT(*) AS cantidad
      FROM ventas
      WHERE ${whereVentas} AND es_cotizacion=0
      GROUP BY categoria
      ORDER BY total DESC
      `,
      paramsVentas
    );

    // total ventas
    const [[totalVentas]] = await pool.query(
      `
      SELECT COALESCE(SUM(total_final),0) AS total
      FROM ventas
      WHERE ${whereVentas} AND es_cotizacion=0
      `,
      paramsVentas
    );

    // gastos por categoria
    const [gastosPorCategoria] = await pool.query(
      `
      SELECT categoria, COALESCE(SUM(monto),0) AS total
      FROM gastos
      WHERE ${whereGastos}
      GROUP BY categoria
      ORDER BY total DESC
      `,
      paramsGastos
    );

    // total gastos
    const [[totalGastos]] = await pool.query(
      `
      SELECT COALESCE(SUM(monto),0) AS total
      FROM gastos
      WHERE ${whereGastos}
      `,
      paramsGastos
    );

    // caja = ventas efectivo - gastos efectivo
    const [[ventasEfectivo]] = await pool.query(
      `
      SELECT COALESCE(SUM(total_final),0) AS total
      FROM ventas
      WHERE ${whereVentas} AND es_cotizacion=0 AND tipo_pago='efectivo'
      `,
      paramsVentas
    );

    const [[gastosEfectivo]] = await pool.query(
      `
      SELECT COALESCE(SUM(monto),0) AS total
      FROM gastos
      WHERE ${whereGastos} AND metodo_pago='efectivo'
      `,
      paramsGastos
    );

    const caja = Number(ventasEfectivo.total) - Number(gastosEfectivo.total);

    const fechaMX = fmtFechaMX(baseDate);
    const horaMX = fmtHoraMX(now);

    const nombrePeriodo =
      periodo === "semanal"
        ? "SEMANAL"
        : periodo === "mensual"
        ? "MENSUAL"
        : periodo === "anual"
        ? "ANUAL"
        : "DIARIO";

    const lines = [];
    lines.push("VIVERO ABIDAN");
    lines.push(`CORTE ${nombrePeriodo}`);
    lines.push("------------------------------");
    lines.push(`FECHA BASE: ${fechaMX}${fecha ? ` (${fecha})` : ""}`);
    lines.push(`HORA IMPRESION: ${horaMX}`);
    lines.push("------------------------------");
    lines.push("REPORTE DE PAGOS");

    const pagosFijos = [
      "efectivo",
      "transferencia",
      "tarjeta_credito",
      "tarjeta_debito",
      "a_cuenta",
      "a_cuenta_pendiente",
    ];

    const mapPago = Object.fromEntries(
      ventasPorPago.map((x) => [x.tipo_pago, Number(x.total || 0)])
    );

    pagosFijos.forEach((p) => {
      lines.push(`${p}: ${money(mapPago[p] || 0)}`);
    });

    lines.push(`TOTAL VENTAS: ${money(totalVentas.total)}`);
    lines.push("------------------------------");
    lines.push("GASTOS");

    if (!gastosPorCategoria.length) {
      lines.push("Sin gastos");
    } else {
      gastosPorCategoria.forEach((g) => {
        lines.push(`${g.categoria}: ${money(g.total)}`);
      });
    }

    lines.push(`TOTAL GASTOS: ${money(totalGastos.total)}`);
    lines.push("------------------------------");
    lines.push("VENTAS POR CATEGORIA");

    if (!ventasPorCategoria.length) {
      lines.push("Sin ventas");
    } else {
      ventasPorCategoria.forEach((c) => {
        lines.push(`${c.categoria} (${c.cantidad}): ${money(c.total)}`);
      });
    }

    lines.push("------------------------------");
    lines.push(`TOTAL EN CAJA: ${money(caja)}`);
    lines.push("------------------------------");
    lines.push("FIRMA: _______________________");
    lines.push("\n\n");

    return res.json({
      mensaje: `Ticket corte ${periodo}`,
      data: { texto: lines.join("\n") },
    });
  } catch (err) {
    console.error("ERROR ticket corte:", err);
    return res.status(500).json({ error: "Error en BD", message: err.message });
  }
};

// POST /api/cierres (o tu ruta)
export const crearCierre = async (req, res) => {
  try {
    const now = new Date();

    // Fecha/hora MX (más consistente que toISOString si tu servidor está en UTC)
    const fechaMX = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now); // en-CA => YYYY-MM-DD

    const horaMX = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Mexico_City",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now); // HH:MM:SS

    await pool.query("INSERT INTO cierres (fecha, hora) VALUES (?, ?)", [
      fechaMX,
      horaMX,
    ]);

    return res.json({ mensaje: "✅ Cierre guardado", data: { fecha: fechaMX, hora: horaMX } });
  } catch (err) {
    console.error("ERROR cierre:", err);
    return res.status(500).json({ error: "Error en BD", message: err.message });
  }
};
// GET /api/reporte/productos?inicio=YYYY-MM-DD&fin=YYYY-MM-DD
export const reporteProductos = async (req, res) => {
  try {
    const { inicio, fin } = req.query;

    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");

    const fechaInicio = inicio || `${yyyy}-${mm}-01`;
    const fechaFin = fin || `${yyyy}-${mm}-${dd}`;

    const desde = `${fechaInicio} 00:00:00`;
    const hasta = `${fechaFin} 23:59:59`;

    // ===============================
    // TOP MÁS VENDIDOS
    // ===============================
    const [masVendidos] = await pool.query(
  `
  SELECT 
    p.id,
    p.codigo,
    p.nombre,
    COALESCE(SUM(vi.cantidad), 0) AS cantidad_vendida,
    COALESCE(SUM(vi.subtotal), 0) AS importe_vendido
  FROM ventas_items vi
  INNER JOIN ventas v ON v.id = vi.venta_id
  INNER JOIN productos p ON p.id = vi.producto_id
  WHERE v.created_at BETWEEN ? AND ?
    AND v.es_cotizacion = 0
  GROUP BY p.id, p.codigo, p.nombre
  ORDER BY cantidad_vendida DESC, importe_vendido DESC
  LIMIT 10
  `,
  [desde, hasta]
);
    // ===============================
    // TOP MENOS VENDIDOS (de los que sí se vendieron)
    // ===============================
    const [menosVendidos] = await pool.query(
  `
  SELECT 
    p.id,
    p.codigo,
    p.nombre,
    COALESCE(SUM(vi.cantidad), 0) AS cantidad_vendida,
    COALESCE(SUM(vi.subtotal), 0) AS importe_vendido
  FROM ventas_items vi
  INNER JOIN ventas v ON v.id = vi.venta_id
  INNER JOIN productos p ON p.id = vi.producto_id
  WHERE v.created_at BETWEEN ? AND ?
    AND v.es_cotizacion = 0
  GROUP BY p.id, p.codigo, p.nombre
  HAVING cantidad_vendida > 0
  ORDER BY cantidad_vendida ASC, importe_vendido ASC
  LIMIT 10
  `,
  [desde, hasta]
);

    // ===============================
    // VENTAS POR DÍA (para gráfica)
    // ===============================
    const [ventasPorDia] = await pool.query(
  `
  SELECT 
    DATE(v.created_at) AS fecha,
    COALESCE(SUM(vi.subtotal), 0) AS total,
    COALESCE(SUM(vi.cantidad), 0) AS piezas
  FROM ventas v
  INNER JOIN ventas_items vi ON vi.venta_id = v.id
  WHERE v.created_at BETWEEN ? AND ?
    AND v.es_cotizacion = 0
  GROUP BY DATE(v.created_at)
  ORDER BY fecha ASC
  `,
  [desde, hasta]
);

    // ===============================
    // RESUMEN
    // ===============================
    const [resumenRows] = await pool.query(
  `
  SELECT
    COALESCE(SUM(vi.cantidad), 0) AS piezas_vendidas,
    COALESCE(SUM(vi.subtotal), 0) AS importe_total,
    COUNT(DISTINCT v.id) AS total_ventas
  FROM ventas v
  INNER JOIN ventas_items vi ON vi.venta_id = v.id
  WHERE v.created_at BETWEEN ? AND ?
    AND v.es_cotizacion = 0
  `,
  [desde, hasta]
);
    const resumen = resumenRows[0] || {
      piezas_vendidas: 0,
      importe_total: 0,
      total_ventas: 0,
    };

    return res.json({
      ok: true,
      rango: { inicio: fechaInicio, fin: fechaFin },
      resumen,
      masVendidos,
      menosVendidos,
      ventasPorDia,
    });
  } catch (err) {
    console.error("ERROR reporteProductos:", err);
    return res.status(500).json({
      ok: false,
      error: "Error al generar reporte de productos",
      message: err.sqlMessage || err.message,
    });
  }
};