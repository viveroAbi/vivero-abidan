import { pool } from "../config/db.js";

// Helpers
const money = (n) =>
  Number(n || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

const fmtFechaMX = (date) =>
  new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
  }).format(date);

const fmtHoraMX = (date) =>
  new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

// Construye WHERE ajustando created_at a hora de México
const buildWhere = ({
  fecha = null,
  periodo = "diario",
  columnaFecha = "created_at",
}) => {
  const p = String(periodo || "diario").toLowerCase();

  const colMX = `CONVERT_TZ(${columnaFecha}, '+00:00', '-06:00')`;
  const nowMX = `CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-06:00')`;

  if (fecha) {
    if (p === "semanal") {
      return {
        where: `YEARWEEK(${colMX}, 1) = YEARWEEK(?, 1)`,
        params: [fecha],
      };
    }

    if (p === "mensual") {
      return {
        where: `YEAR(${colMX}) = YEAR(?) AND MONTH(${colMX}) = MONTH(?)`,
        params: [fecha, fecha],
      };
    }

    if (p === "anual") {
      return {
        where: `YEAR(${colMX}) = YEAR(?)`,
        params: [fecha],
      };
    }

    return {
      where: `DATE(${colMX}) = ?`,
      params: [fecha],
    };
  }

  if (p === "semanal") {
    return {
      where: `YEARWEEK(${colMX}, 1) = YEARWEEK(${nowMX}, 1)`,
      params: [],
    };
  }

  if (p === "mensual") {
    return {
      where: `YEAR(${colMX}) = YEAR(${nowMX}) AND MONTH(${colMX}) = MONTH(${nowMX})`,
      params: [],
    };
  }

  if (p === "anual") {
    return {
      where: `YEAR(${colMX}) = YEAR(${nowMX})`,
      params: [],
    };
  }

  return {
    where: `DATE(${colMX}) = DATE(${nowMX})`,
    params: [],
  };
};

// Filtro común para ventas reales
const filtroVentasRealesAliasV = `
  v.es_cotizacion = 0
  AND COALESCE(v.es_cotizacion_pedido, 0) = 0
`;
const filtroVentasReales = `
  es_cotizacion = 0
  AND COALESCE(es_cotizacion_pedido, 0) = 0
`;

/**
 * Devuelve el resumen de pagos del periodo:
 * - desglosa ventas mixtas por columnas
 * - suma abonos de adeudos del día/periodo
 * - calcula efectivo en caja correctamente
 */
async function obtenerResumenPagos(fecha, periodo) {
  const { where: whereVentas, params: paramsVentas } = buildWhere({
    fecha,
    periodo,
    columnaFecha: "created_at",
  });

  const { where: whereAbonos, params: paramsAbonos } = buildWhere({
    fecha,
    periodo,
    columnaFecha: "created_at",
  });

  const [[ventasDirectas]] = await pool.query(
    `
    SELECT
      COALESCE(SUM(efectivo), 0) AS efectivo,
      COALESCE(SUM(transferencia), 0) AS transferencia,
      COALESCE(SUM(cheque), 0) AS cheque,

      COALESCE(SUM(CASE WHEN tipo_pago = 'tarjeta_credito' THEN tarjeta ELSE 0 END), 0) AS tarjeta_credito,
      COALESCE(SUM(CASE WHEN tipo_pago = 'tarjeta_debito' THEN tarjeta ELSE 0 END), 0) AS tarjeta_debito,

      -- Cuando una venta mixta trae tarjeta, no hay columna para distinguir crédito/débito.
      -- Se manda a crédito por compatibilidad con el reporte actual.
      COALESCE(SUM(CASE WHEN tipo_pago = 'mixto' THEN tarjeta ELSE 0 END), 0) AS tarjeta_mixto,

      COALESCE(SUM(CASE WHEN tipo_pago = 'a_cuenta' THEN abono_inicial ELSE 0 END), 0) AS a_cuenta,
      COALESCE(SUM(CASE WHEN tipo_pago = 'a_cuenta' THEN saldo_pendiente ELSE 0 END), 0) AS a_cuenta_pendiente
    FROM ventas
    WHERE ${whereVentas} AND ${filtroVentasReales}
    `,
    paramsVentas
  );

  const [abonosRows] = await pool.query(
    `
    SELECT metodo_pago, COALESCE(SUM(monto), 0) AS total
    FROM ventas_abonos
    WHERE ${whereAbonos}
    GROUP BY metodo_pago
    `,
    paramsAbonos
  );

  const mapAbonos = Object.fromEntries(
    abonosRows.map((x) => [String(x.metodo_pago || "").trim(), Number(x.total || 0)])
  );

  const ventasPorPago = [
    {
      tipo_pago: "efectivo",
      total: Number(ventasDirectas.efectivo || 0) + Number(mapAbonos.efectivo || 0),
    },
    {
      tipo_pago: "transferencia",
      total:
        Number(ventasDirectas.transferencia || 0) +
        Number(mapAbonos.transferencia || 0),
    },
    {
      tipo_pago: "tarjeta_credito",
      total:
        Number(ventasDirectas.tarjeta_credito || 0) +
        Number(ventasDirectas.tarjeta_mixto || 0) +
        Number(mapAbonos.tarjeta_credito || 0) +
        Number(mapAbonos.tarjeta || 0),
    },
    {
      tipo_pago: "tarjeta_debito",
      total:
        Number(ventasDirectas.tarjeta_debito || 0) +
        Number(mapAbonos.tarjeta_debito || 0),
    },
    {
      tipo_pago: "cheque",
      total: Number(ventasDirectas.cheque || 0) + Number(mapAbonos.cheque || 0),
    },
    {
      tipo_pago: "a_cuenta",
      total: Number(ventasDirectas.a_cuenta || 0),
    },
    {
      tipo_pago: "a_cuenta_pendiente",
      total: Number(ventasDirectas.a_cuenta_pendiente || 0),
    },
  ];

  const totalAbonos = abonosRows.reduce(
    (acc, row) => acc + Number(row.total || 0),
    0
  );

  const efectivoCaja =
    Number(ventasDirectas.efectivo || 0) + Number(mapAbonos.efectivo || 0);

  return {
    ventasPorPago,
    totalAbonos: Number(totalAbonos.toFixed(2)),
    efectivoCaja: Number(efectivoCaja.toFixed(2)),
  };
}

// GET /api/reporte/diario?fecha=YYYY-MM-DD&periodo=diario|semanal|mensual|anual
export const reporteDiario = async (req, res) => {
  try {
    const fecha = req.query.fecha || null;
    const periodo = String(req.query.periodo || "diario").toLowerCase();

    const { where: whereVentas, params: paramsVentas } = buildWhere({
      fecha,
      periodo,
      columnaFecha: "v.created_at",
    });

    const { where: whereGastos, params: paramsGastos } = buildWhere({
      fecha,
      periodo,
      columnaFecha: "g.created_at",
    });

    const { ventasPorPago, totalAbonos, efectivoCaja } =
      await obtenerResumenPagos(fecha, periodo);

    const [ventasPorCategoria] = await pool.query(
      `
      SELECT categoria, COALESCE(SUM(total_final), 0) AS total, COUNT(*) AS cantidad
      FROM ventas v
      WHERE ${whereVentas} AND ${filtroVentasRealesAliasV}
      GROUP BY categoria
      ORDER BY total DESC
      `,
      paramsVentas
    );

    const [[totalVentas]] = await pool.query(
      `
      SELECT COALESCE(SUM(total_final), 0) AS total
      FROM ventas v
      WHERE ${whereVentas} AND ${filtroVentasRealesAliasV}
      `,
      paramsVentas
    );

    const [gastosPorCategoria] = await pool.query(
      `
      SELECT g.categoria, COALESCE(SUM(g.monto), 0) AS total
      FROM gastos g
      WHERE ${whereGastos}
      GROUP BY g.categoria
      ORDER BY total DESC
      `,
      paramsGastos
    );

    const [gastosPorSub] = await pool.query(
      `
      SELECT g.categoria, g.subcategoria, COALESCE(SUM(g.monto), 0) AS total
      FROM gastos g
      WHERE ${whereGastos}
      GROUP BY g.categoria, g.subcategoria
      ORDER BY g.categoria ASC, total DESC
      `,
      paramsGastos
    );

    const [[totalGastos]] = await pool.query(
      `
      SELECT COALESCE(SUM(g.monto), 0) AS total
      FROM gastos g
      WHERE ${whereGastos}
      `,
      paramsGastos
    );

    const [[gastosEfectivo]] = await pool.query(
      `
      SELECT COALESCE(SUM(g.monto), 0) AS total
      FROM gastos g
      WHERE ${whereGastos} AND g.metodo_pago = 'efectivo'
      `,
      paramsGastos
    );

    const caja = Number(efectivoCaja) - Number(gastosEfectivo.total || 0);

    return res.json({
      mensaje: `Reporte ${periodo}`,
      data: {
        periodo,
        fecha: fecha || "ACTUAL",
        ventasPorPago,
        ventasPorCategoria,
        totalVentas: Number(totalVentas.total || 0),
        totalAbonos,
        totalCobrado: Number(
          (Number(totalVentas.total || 0) + Number(totalAbonos || 0)).toFixed(2)
        ),
        gastosPorCategoria,
        gastosPorSub,
        totalGastos: Number(totalGastos.total || 0),
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

    const { where: whereVentasSimple, params: paramsVentasSimple } = buildWhere({
      fecha,
      periodo,
      columnaFecha: "created_at",
    });

    const { where: whereVentasAliasV, params: paramsVentasAliasV } = buildWhere({
      fecha,
      periodo,
      columnaFecha: "v.created_at",
    });

    const { where: whereGastosSimple, params: paramsGastosSimple } = buildWhere({
      fecha,
      periodo,
      columnaFecha: "created_at",
    });

    const baseDate = fecha ? new Date(`${fecha}T12:00:00`) : new Date();
    const now = new Date();

    const { ventasPorPago, totalAbonos, efectivoCaja } =
      await obtenerResumenPagos(fecha, periodo);

    const [ventasPorCategoria] = await pool.query(
      `
      SELECT categoria, COALESCE(SUM(total_final), 0) AS total, COUNT(*) AS cantidad
      FROM ventas
      WHERE ${whereVentasSimple} AND ${filtroVentasReales}
      GROUP BY categoria
      ORDER BY total DESC
      `,
      paramsVentasSimple
    );

    const [[totalVentas]] = await pool.query(
      `
      SELECT COALESCE(SUM(total_final), 0) AS total
      FROM ventas
      WHERE ${whereVentasSimple} AND ${filtroVentasReales}
      `,
      paramsVentasSimple
    );

    const [gastosPorCategoria] = await pool.query(
      `
      SELECT categoria, COALESCE(SUM(monto), 0) AS total
      FROM gastos
      WHERE ${whereGastosSimple}
      GROUP BY categoria
      ORDER BY total DESC
      `,
      paramsGastosSimple
    );

    const categoriasAuto = [
      "border",
      "corteza",
      "fertilizante",
      "maceta",
      "tierra",
      "malla",
      "duranta",
      "agribon",
    ];

    const [productosAutoRows] = await pool.query(
      `
      SELECT
        categoria,
        SUM(piezas) AS piezas,
        SUM(total) AS total
      FROM (
        SELECT
          CASE
            WHEN LOWER(TRIM(COALESCE(p.categoria_planta, ''))) = 'border' OR LOWER(COALESCE(p.nombre, '')) LIKE '%border%' THEN 'border'
            WHEN LOWER(TRIM(COALESCE(p.categoria_planta, ''))) = 'corteza' OR LOWER(COALESCE(p.nombre, '')) LIKE '%corteza%' THEN 'corteza'
            WHEN LOWER(TRIM(COALESCE(p.categoria_planta, ''))) = 'fertilizante' OR LOWER(COALESCE(p.nombre, '')) LIKE '%fertilizante%' THEN 'fertilizante'
            WHEN LOWER(TRIM(COALESCE(p.categoria_planta, ''))) = 'maceta' OR LOWER(COALESCE(p.nombre, '')) LIKE '%maceta%' THEN 'maceta'
            WHEN LOWER(TRIM(COALESCE(p.categoria_planta, ''))) = 'tierra' OR LOWER(COALESCE(p.nombre, '')) LIKE '%tierra%' THEN 'tierra'
            WHEN LOWER(TRIM(COALESCE(p.categoria_planta, ''))) = 'malla' OR LOWER(COALESCE(p.nombre, '')) LIKE '%malla%' THEN 'malla'
            WHEN LOWER(TRIM(COALESCE(p.categoria_planta, ''))) = 'duranta' OR LOWER(COALESCE(p.nombre, '')) LIKE '%duranta%' THEN 'duranta'
            WHEN LOWER(TRIM(COALESCE(p.categoria_planta, ''))) = 'agribon' OR LOWER(COALESCE(p.nombre, '')) LIKE '%agribon%' THEN 'agribon'
            ELSE NULL
          END AS categoria,
          COALESCE(vi.cantidad, 0) AS piezas,
          COALESCE(vi.subtotal, 0) AS total
        FROM ventas_items vi
        INNER JOIN ventas v ON v.id = vi.venta_id
        INNER JOIN productos p ON p.id = vi.producto_id
        WHERE ${whereVentasAliasV}
          AND ${filtroVentasRealesAliasV}
      ) t
      WHERE categoria IS NOT NULL
      GROUP BY categoria
      ORDER BY categoria ASC
      `,
      paramsVentasAliasV
    );

    const [[totalGastos]] = await pool.query(
      `
      SELECT COALESCE(SUM(monto), 0) AS total
      FROM gastos
      WHERE ${whereGastosSimple}
      `,
      paramsGastosSimple
    );

    const totalAuto = productosAutoRows.reduce(
      (acc, item) => acc + Number(item.total || 0),
      0
    );

    const totalManual = Number(totalGastos.total || 0);
    const totalGeneralGastos = totalManual + totalAuto;

    const [[gastosEfectivo]] = await pool.query(
      `
      SELECT COALESCE(SUM(monto), 0) AS total
      FROM gastos
      WHERE ${whereGastosSimple} AND metodo_pago = 'efectivo'
      `,
      paramsGastosSimple
    );

    const caja = Number(efectivoCaja || 0) - Number(gastosEfectivo.total || 0);

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
      "cheque",
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
    lines.push(`TOTAL ABONOS: ${money(totalAbonos)}`);
    lines.push(
      `TOTAL COBRADO: ${money(Number(totalVentas.total || 0) + Number(totalAbonos || 0))}`
    );
    lines.push("------------------------------");
    lines.push("GASTOS / INSUMOS");

    const categoriasManual = ["gasolina", "comida", "renta", "sueldos", "gastos"];

    const gastosMap = Object.fromEntries(
      gastosPorCategoria.map((g) => [
        String(g.categoria || "").trim().toLowerCase(),
        Number(g.total || 0),
      ])
    );

    const productosAutoMap = Object.fromEntries(
      productosAutoRows.map((r) => [
        String(r.categoria || "").trim().toLowerCase(),
        {
          piezas: Number(r.piezas || 0),
          total: Number(r.total || 0),
        },
      ])
    );

    lines.push("AUTO DESDE VENTAS");
    categoriasAuto.forEach((cat) => {
      const row = productosAutoMap[cat] || { piezas: 0, total: 0 };
      lines.push(`${cat}: ${row.piezas} pzas | ${money(row.total)}`);
    });

    lines.push("------------------------------");
    lines.push("MANUALES");

    categoriasManual.forEach((cat) => {
      lines.push(`${cat}: ${money(gastosMap[cat] || 0)}`);
    });

    const gastosExtras = gastosPorCategoria.filter((g) => {
      const nombre = String(g.categoria || "").trim().toLowerCase();
      return !categoriasManual.includes(nombre) && !categoriasAuto.includes(nombre);
    });

    gastosExtras.forEach((g) => {
      lines.push(`${g.categoria}: ${money(g.total)}`);
    });

    lines.push(`TOTAL GASTOS: ${money(totalGeneralGastos)}`);
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
    return res.status(500).json({
      error: "Error en BD",
      message: err.message,
    });
  }
};

export const reporteProductosPorCategoriaPDF = async (req, res) => {
  try {
    const fecha = req.query.fecha || null;
    const periodo = String(req.query.periodo || "diario").toLowerCase();

    const { where: whereVentasDetalle, params: paramsVentasDetalle } = buildWhere({
      fecha,
      periodo,
      columnaFecha: "v.created_at",
    });

    const filtroVentasRealesAliasVLocal = `
      v.es_cotizacion = 0
      AND COALESCE(v.es_cotizacion_pedido, 0) = 0
    `;

    const [rows] = await pool.query(
      `
      SELECT
        COALESCE(NULLIF(TRIM(p.categoria_planta), ''), 'sin_categoria') AS categoria_planta,
        p.id,
        COALESCE(p.codigo, '') AS codigo,
        p.nombre,
        COALESCE(SUM(vi.cantidad), 0) AS cantidad,
        COALESCE(SUM(vi.subtotal), 0) AS total
      FROM ventas_items vi
      INNER JOIN ventas v ON v.id = vi.venta_id
      INNER JOIN productos p ON p.id = vi.producto_id
      WHERE ${whereVentasDetalle}
        AND ${filtroVentasRealesAliasVLocal}
      GROUP BY categoria_planta, p.id, p.codigo, p.nombre
      ORDER BY categoria_planta ASC, p.nombre ASC
      `,
      paramsVentasDetalle
    );

    const agrupadoMap = new Map();

    for (const row of rows) {
      const categoria = row.categoria_planta || "sin_categoria";

      if (!agrupadoMap.has(categoria)) {
        agrupadoMap.set(categoria, {
          categoria,
          totalCantidad: 0,
          totalImporte: 0,
          productos: [],
        });
      }

      const grupo = agrupadoMap.get(categoria);

      const item = {
        id: row.id,
        codigo: row.codigo || "",
        nombre: row.nombre || "",
        cantidad: Number(row.cantidad || 0),
        total: Number(row.total || 0),
      };

      grupo.productos.push(item);
      grupo.totalCantidad += item.cantidad;
      grupo.totalImporte += item.total;
    }

    const categorias = Array.from(agrupadoMap.values()).map((g) => ({
      ...g,
      totalCantidad: Number(g.totalCantidad.toFixed(2)),
      totalImporte: Number(g.totalImporte.toFixed(2)),
    }));

    categorias.sort((a, b) =>
      String(a.categoria || "").localeCompare(String(b.categoria || ""), "es", {
        sensitivity: "base",
      })
    );

    categorias.forEach((cat) => {
      cat.productos.sort((a, b) =>
        String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", {
          sensitivity: "base",
        })
      );
    });

    const resumen = {
      totalCategorias: categorias.length,
      totalProductos: categorias.reduce((acc, c) => acc + c.productos.length, 0),
      totalPiezas: categorias.reduce((acc, c) => acc + c.totalCantidad, 0),
      totalImporte: Number(
        categorias.reduce((acc, c) => acc + c.totalImporte, 0).toFixed(2)
      ),
    };

    return res.json({
      mensaje: `Reporte productos por categoría ${periodo}`,
      data: {
        periodo,
        fecha: fecha || "ACTUAL",
        categorias,
        resumen,
      },
    });
  } catch (err) {
    console.error("ERROR reporteProductosPorCategoriaPDF:", err);
    return res.status(500).json({
      error: "Error en BD",
      message: err.message,
    });
  }
};

// POST /api/cierres
export const crearCierre = async (req, res) => {
  try {
    const now = new Date();

    const fechaMX = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const horaMX = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Mexico_City",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now);

    await pool.query("INSERT INTO cierres (fecha, hora) VALUES (?, ?)", [
      fechaMX,
      horaMX,
    ]);

    return res.json({
      mensaje: "✅ Cierre guardado",
      data: { fecha: fechaMX, hora: horaMX },
    });
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

    const colMX = `CONVERT_TZ(v.created_at, '+00:00', '-06:00')`;

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
      WHERE DATE(${colMX}) BETWEEN ? AND ?
        AND v.es_cotizacion = 0
        AND COALESCE(v.es_cotizacion_pedido, 0) = 0
      GROUP BY p.id, p.codigo, p.nombre
      ORDER BY cantidad_vendida DESC, importe_vendido DESC
      LIMIT 10
      `,
      [fechaInicio, fechaFin]
    );

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
      WHERE DATE(${colMX}) BETWEEN ? AND ?
        AND v.es_cotizacion = 0
        AND COALESCE(v.es_cotizacion_pedido, 0) = 0
      GROUP BY p.id, p.codigo, p.nombre
      HAVING cantidad_vendida > 0
      ORDER BY cantidad_vendida ASC, importe_vendido ASC
      LIMIT 10
      `,
      [fechaInicio, fechaFin]
    );

    const [ventasPorDia] = await pool.query(
      `
      SELECT 
        DATE(${colMX}) AS fecha,
        COALESCE(SUM(vi.subtotal), 0) AS total,
        COALESCE(SUM(vi.cantidad), 0) AS piezas
      FROM ventas v
      INNER JOIN ventas_items vi ON vi.venta_id = v.id
      WHERE DATE(${colMX}) BETWEEN ? AND ?
        AND v.es_cotizacion = 0
        AND COALESCE(v.es_cotizacion_pedido, 0) = 0
      GROUP BY DATE(${colMX})
      ORDER BY fecha ASC
      `,
      [fechaInicio, fechaFin]
    );

    const [resumenRows] = await pool.query(
      `
      SELECT
        COALESCE(SUM(vi.cantidad), 0) AS piezas_vendidas,
        COALESCE(SUM(vi.subtotal), 0) AS importe_total,
        COUNT(DISTINCT v.id) AS total_ventas
      FROM ventas v
      INNER JOIN ventas_items vi ON vi.venta_id = v.id
      WHERE DATE(${colMX}) BETWEEN ? AND ?
        AND v.es_cotizacion = 0
        AND COALESCE(v.es_cotizacion_pedido, 0) = 0
      `,
      [fechaInicio, fechaFin]
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
