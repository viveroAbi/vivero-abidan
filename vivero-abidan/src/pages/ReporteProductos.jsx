import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const API_URL = "http://localhost:4000/api";

const COLORS = [
  "#17c964",
  "#0ea75a",
  "#36cfc9",
  "#40a9ff",
  "#7c4dff",
  "#ffa940",
  "#ff7875",
  "#73d13d",
  "#13c2c2",
  "#9254de",
];

export default function ReporteProductos({ token }) {
  const [data, setData] = useState({
    resumen: {},
    masVendidos: [],
    menosVendidos: [],
    ventasPorDia: [],
  });

  const [inicio, setInicio] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });

  const [fin, setFin] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const money = (n) =>
    Number(n || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });

  async function cargar() {
    try {
      if (!token) {
        setError("No hay token. Vuelve a iniciar sesión.");
        return;
      }

      if (inicio > fin) {
        setError("La fecha inicio no puede ser mayor que la fecha fin");
        return;
      }

      setLoading(true);
      setError("");

      const res = await fetch(
        `${API_URL}/reporte/productos?inicio=${inicio}&fin=${fin}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.message || json.error || "Error al cargar reporte");
      }

      setData(json);
    } catch (e) {
      console.error("ERROR ReporteProductos:", e);
      setError(e.message || "Error al cargar reporte");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ===== Datos para gráficas =====
  const pieMasVendidos = useMemo(() => {
    return (data.masVendidos || []).map((p) => ({
      name: `${p.codigo} - ${p.nombre}`,
      value: Number(p.cantidad_vendida || 0),
      importe: Number(p.importe_vendido || 0),
    }));
  }, [data.masVendidos]);

  const barVentasPorDia = useMemo(() => {
    return (data.ventasPorDia || []).map((d) => ({
      fecha: new Date(d.fecha).toLocaleDateString("es-MX"),
      piezas: Number(d.piezas || 0),
      total: Number(d.total || 0),
    }));
  }, [data.ventasPorDia]);

  const barMasVendidos = useMemo(() => {
    return (data.masVendidos || []).map((p) => ({
      nombre:
        String(p.nombre || "").length > 18
          ? `${String(p.nombre).slice(0, 18)}...`
          : p.nombre,
      cantidad: Number(p.cantidad_vendida || 0),
      importe: Number(p.importe_vendido || 0),
    }));
  }, [data.masVendidos]);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Reporte de productos</h2>

      {/* Filtros */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 12,
          flexWrap: "wrap",
          alignItems: "end",
        }}
      >
        <div>
          <label>Inicio</label>
          <br />
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            style={{ padding: 6 }}
          />
        </div>

        <div>
          <label>Fin</label>
          <br />
          <input
            type="date"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
            style={{ padding: 6 }}
          />
        </div>

        <button
          onClick={cargar}
          disabled={loading}
          style={{
            height: 34,
            padding: "0 12px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          {loading ? "Cargando..." : "Generar"}
        </button>
      </div>

      {error ? (
        <div style={{ color: "red", marginBottom: 10, fontWeight: 600 }}>
          {error}
        </div>
      ) : null}

      {/* Resumen */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: "1px solid #d7e3de",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <b>Piezas vendidas:</b> {Number(data.resumen?.piezas_vendidas || 0)}
        <br />
        <b>Importe total:</b> {money(data.resumen?.importe_total || 0)}
        <br />
        <b>Ventas:</b> {Number(data.resumen?.total_ventas || 0)}
      </div>

      {/* ===== GRÁFICAS ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {/* Pie: Más vendidos por cantidad */}
        <div
          style={{
            border: "1px solid #d7e3de",
            borderRadius: 12,
            background: "#fff",
            padding: 12,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Pastel: Más vendidos (cantidad)</h3>

          {pieMasVendidos.length === 0 ? (
            <div style={{ color: "#666" }}>Sin datos para graficar.</div>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieMasVendidos}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    label={({ name, percent }) =>
                      `${name.slice(0, 14)}${name.length > 14 ? "..." : ""} (${(
                        (percent || 0) * 100
                      ).toFixed(0)}%)`
                    }
                  >
                    {pieMasVendidos.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _, item) => [
                      `${Number(value)} piezas`,
                      item?.payload?.name || "Producto",
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Barras: ventas por día */}
        <div
          style={{
            border: "1px solid #d7e3de",
            borderRadius: 12,
            background: "#fff",
            padding: 12,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Barras: Ventas por día (piezas)</h3>

          {barVentasPorDia.length === 0 ? (
            <div style={{ color: "#666" }}>Sin datos para graficar.</div>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={barVentasPorDia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "piezas") return [`${value} piezas`, "Piezas"];
                      if (name === "total") return [money(value), "Total"];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="piezas" name="piezas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Barras: top productos */}
        <div
          style={{
            border: "1px solid #d7e3de",
            borderRadius: 12,
            background: "#fff",
            padding: 12,
            gridColumn: "1 / -1",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Barras: Top productos (cantidad vendida)</h3>

          {barMasVendidos.length === 0 ? (
            <div style={{ color: "#666" }}>Sin datos para graficar.</div>
          ) : (
            <div style={{ width: "100%", height: 340 }}>
              <ResponsiveContainer>
                <BarChart data={barMasVendidos}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name, item) => {
                      if (name === "cantidad") return [`${value} piezas`, "Cantidad"];
                      if (name === "importe")
                        return [money(item?.payload?.importe || 0), "Importe"];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="cantidad" name="cantidad" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ===== LISTAS (siguen útiles) ===== */}
      <h3>Más vendidos</h3>
      <ul>
        {(data.masVendidos || []).map((p) => (
          <li key={`${p.id}-${p.nombre}`}>
            {p.codigo} - {p.nombre} | Cantidad: {Number(p.cantidad_vendida || 0)} | Importe:{" "}
            {money(p.importe_vendido)}
          </li>
        ))}
      </ul>

      <h3>Menos vendidos</h3>
      <ul>
        {(data.menosVendidos || []).map((p) => (
          <li key={`m-${p.id}-${p.nombre}`}>
            {p.codigo} - {p.nombre} | Cantidad: {Number(p.cantidad_vendida || 0)} | Importe:{" "}
            {money(p.importe_vendido)}
          </li>
        ))}
      </ul>

      <h3>Ventas por día</h3>
      <ul>
        {(data.ventasPorDia || []).map((d, i) => (
          <li key={i}>
            {new Date(d.fecha).toLocaleDateString("es-MX")} | Piezas:{" "}
            {Number(d.piezas || 0)} | Total: {money(d.total || 0)}
          </li>
        ))}
      </ul>
    </div>
  );
}