import { useEffect, useMemo, useState } from "react";
import {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  activateCliente, // ✅ nuevo
} from "../services/clientes.api";

const emptyForm = {
  nombre: "",
  telefono: "",
  email: "",
  direccion: "",
  rfc: "",
  notas: "",
  categoria_cliente: "publico", // ✅ nuevo
};

export default function Clientes() {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activo, setActivo] = useState("1");
  const [clientes, setClientes] = useState([]);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const title = useMemo(() => (editId ? "Editar cliente" : "Nuevo cliente"), [editId]);
    const [sugerencias, setSugerencias] = useState([]);
const [showSug, setShowSug] = useState(false);
const [timerId, setTimerId] = useState(null);

  async function cargar(searchOverride = search, activoOverride = activo) {
  setLoading(true);
  try {
    const data = await getClientes({ search: searchOverride, activo: activoOverride });
    setClientes(data);
  } catch (e) {
    alert(e.message);
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);
function buscarEnVivo(texto) {
  // cancela el timer anterior (debounce)
  if (timerId) clearTimeout(timerId);

  const id = setTimeout(async () => {
    const q = (texto || "").trim();

    if (!q) {
      setSugerencias([]);
      setShowSug(false);
      return;
    }

    try {
      // trae sugerencias (limitamos visualmente a 6)
      const data = await getClientes({ search: q, activo });
      setSugerencias(data.slice(0, 6));
      setShowSug(true);
    } catch (e) {
      setSugerencias([]);
      setShowSug(false);
    }
  }, 250); // 250ms se siente rápido

  setTimerId(id);
}

  // Buscar con Enter
  const onBuscar = (e) => {
    e.preventDefault();
    cargar();
  };

  const abrirNuevo = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const abrirEditar = (c) => {
    setEditId(c.id);
    setForm({
  nombre: c.nombre || "",
  telefono: c.telefono || "",
  email: c.email || "",
  direccion: c.direccion || "",
  rfc: c.rfc || "",
  notas: c.notas || "",
  categoria_cliente: c.categoria_cliente || "publico",
});
    setOpen(true);
  };

  const cerrarModal = () => {
    setOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return alert("Nombre es obligatorio");

    try {
      if (editId) {
        await updateCliente(editId, form);
      } else {
        await createCliente(form);
      }
      cerrarModal();
      cargar();
    } catch (e) {
      alert(e.message);
    }
  };

  const desactivar = async (id) => {
    if (!confirm("¿Desactivar este cliente?")) return;
    try {
      await deleteCliente(id);
      cargar();
    } catch (e) {
      alert(e.message);
    }
  };
  const activar = async (id) => {
  if (!confirm("¿Activar este cliente?")) return;
  try {
    await activateCliente(id);
    cargar();
  } catch (e) {
    alert(e.message);
  }
};

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 10 }}>Clientes</h2>

      <form onSubmit={onBuscar} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
  {/* AQUÍ VA EL AUTOCOMPLETADO */}
  <div style={{ position: "relative" }}>
    <input
      value={search}
      onChange={(e) => {
        const v = e.target.value;
        setSearch(v);
        buscarEnVivo(v);
      }}
      onFocus={() => {
        if (sugerencias.length) setShowSug(true);
      }}
      onBlur={() => {
        setTimeout(() => setShowSug(false), 150);
      }}
      placeholder="Buscar por nombre, teléfono o email..."
      style={{ padding: 10, minWidth: 280 }}
    />

    {showSug && sugerencias.length > 0 && (
      <div
        style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: 8,
          marginTop: 6,
          overflow: "hidden",
          zIndex: 50,
        }}
      >
        {sugerencias.map((c) => (
          <div
            key={c.id}
            onMouseDown={() => {
  setSearch(c.nombre);
  setShowSug(false);
  setTimeout(() => cargar(c.nombre, activo), 0);
}}

            style={{
              padding: "10px 12px",
              cursor: "pointer",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <div style={{ fontWeight: 600 }}>{c.nombre}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {c.telefono || "-"} · {c.email || "-"}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>

  {/* LO DEMÁS SE QUEDA IGUAL */}
  <select value={activo} onChange={(e) => setActivo(e.target.value)} style={{ padding: 10 }}>
    <option value="1">Activos</option>
    <option value="0">Inactivos</option>
  </select>

  <button type="submit" style={{ padding: "10px 14px" }}>
    Buscar
  </button>

  <button type="button" onClick={abrirNuevo} style={{ padding: "10px 14px" }}>
    + Nuevo
  </button>
</form>


      <div style={{ marginTop: 15, border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f6f6f6" }}>
              <th style={{ textAlign: "left", padding: 10 }}>Nombre</th>
              <th style={{ textAlign: "left", padding: 10 }}>Teléfono</th>
              <th style={{ textAlign: "left", padding: 10 }}>Email</th>
              <th style={{ textAlign: "left", padding: 10 }}>RFC</th>
              <th style={{ textAlign: "left", padding: 10 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: 12 }}>Cargando...</td></tr>
            ) : clientes.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: 12 }}>Sin resultados</td></tr>
            ) : (
              clientes.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 10 }}>{c.nombre}</td>
                  <td style={{ padding: 10 }}>{c.telefono || "-"}</td>
                  <td style={{ padding: 10 }}>{c.email || "-"}</td>
                  <td style={{ padding: 10 }}>{c.rfc || "-"}</td>
                  <td style={{ padding: 10, display: "flex", gap: 8 }}>
  <button type="button" onClick={() => abrirEditar(c)}>Editar</button>

  {String(activo) === "1" ? (
    <button type="button" onClick={() => desactivar(c.id)}>Desactivar</button>
  ) : (
    <button type="button" onClick={() => activar(c.id)}>Activar</button>
  )}
</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal simple */}
      {open && (
        <div
          onClick={cerrarModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", padding: 16, borderRadius: 12, width: 520, maxWidth: "100%" }}
          >
            <h3 style={{ marginTop: 0 }}>{title}</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre *"
                style={{ padding: 10, gridColumn: "1 / -1" }}
              />
              <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="Teléfono"
                style={{ padding: 10 }}
              />
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
                style={{ padding: 10 }}
              />
              <input
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                placeholder="Dirección"
                style={{ padding: 10, gridColumn: "1 / -1" }}
              />
              <input
                value={form.rfc}
                onChange={(e) => setForm({ ...form, rfc: e.target.value })}
                placeholder="RFC"
                style={{ padding: 10 }}
              />
              <select
  value={form.categoria_cliente}
  onChange={(e) => setForm({ ...form, categoria_cliente: e.target.value })}
  style={{ padding: 10 }}
>
  <option value="publico">Público</option>
  <option value="revendedor">Revendedor</option>
  <option value="jardinero">Jardinero</option>
  <option value="paisajista">Paisajista</option>
  <option value="arquitecto">Arquitecto</option>
  <option value="mayoreo">Mayoreo</option>
  <option value="vivero">Vivero</option>
</select>
              <input
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                placeholder="Notas"
                style={{ padding: 10 }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button onClick={cerrarModal}>Cancelar</button>
              <button onClick={guardar}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
