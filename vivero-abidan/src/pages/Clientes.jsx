import { useEffect, useMemo, useState } from "react";
import {
  getClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
  activateCliente,
} from "../services/clientes.api";

const emptyForm = {
  nombre: "",
  telefono: "",
  email: "",
  direccion: "",
  rfc: "",
  notas: "",
  categoria_cliente: "publico",
  permite_credito: false,
  deuda_maxima: "",
  saldo_actual: 0,
};

export default function Clientes() {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activo, setActivo] = useState("1");
  const [clientes, setClientes] = useState([]);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const title = useMemo(
    () => (editId ? "Editar cliente" : "Nuevo cliente"),
    [editId]
  );

  const [sugerencias, setSugerencias] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [timerId, setTimerId] = useState(null);

  function getNotaPendiente(c) {
    return String(c.notas || "").trim() || "Sin notas";
  }

  async function cargar(searchOverride = search, activoOverride = activo) {
    setLoading(true);
    try {
      const data = await getClientes({
        search: searchOverride,
        activo: activoOverride,
      });
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
    if (timerId) clearTimeout(timerId);

    const id = setTimeout(async () => {
      const q = (texto || "").trim();

      if (!q) {
        setSugerencias([]);
        setShowSug(false);
        return;
      }

      try {
        const data = await getClientes({ search: q, activo });
        setSugerencias(data.slice(0, 6));
        setShowSug(true);
      } catch (e) {
        setSugerencias([]);
        setShowSug(false);
      }
    }, 250);

    setTimerId(id);
  }

  const onBuscar = (e) => {
    e.preventDefault();
    cargar();
  };

  const abrirNuevo = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const abrirEditar = async (c) => {
    try {
      setLoading(true);

      const cliente = await getClienteById(c.id);

      setEditId(cliente.id);
      setForm({
        nombre: cliente.nombre || "",
        telefono: cliente.telefono || "",
        email: cliente.email || "",
        direccion: cliente.direccion || "",
        rfc: cliente.rfc || "",
        notas: cliente.notas || "",
        categoria_cliente: cliente.categoria_cliente || "publico",
        permite_credito: Number(cliente.permite_credito || 0) === 1,
        deuda_maxima: cliente.deuda_maxima ?? "",
        saldo_actual: Number(cliente.saldo_actual || 0),
      });

      setOpen(true);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const cerrarModal = () => {
    setOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return alert("Nombre es obligatorio");

    const payload = {
      ...form,
      notas: String(form.notas || "").trim(),
      permite_credito: form.permite_credito ? 1 : 0,
      deuda_maxima: form.permite_credito ? Number(form.deuda_maxima || 0) : 0,
    };

    try {
      if (editId) {
        await updateCliente(editId, payload);
      } else {
        await createCliente(payload);
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

      <form
        onSubmit={onBuscar}
        style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
      >
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

        <select
          value={activo}
          onChange={(e) => setActivo(e.target.value)}
          style={{ padding: 10 }}
        >
          <option value="1">Activos</option>
          <option value="0">Inactivos</option>
        </select>

        <button type="submit" style={{ padding: "10px 14px" }}>
          Buscar
        </button>

        <button
          type="button"
          onClick={abrirNuevo}
          style={{ padding: "10px 14px" }}
        >
          + Nuevo
        </button>
      </form>

      <div
        style={{
          marginTop: 15,
          border: "1px solid #ddd",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f6f6f6" }}>
              <th style={{ textAlign: "left", padding: 10 }}>Nombre</th>
              <th style={{ textAlign: "left", padding: 10 }}>Teléfono</th>
              <th style={{ textAlign: "left", padding: 10 }}>Email</th>
              <th style={{ textAlign: "left", padding: 10 }}>RFC</th>
              <th style={{ textAlign: "left", padding: 10 }}>Crédito</th>
              <th style={{ textAlign: "left", padding: 10 }}>Deuda máxima</th>
              <th style={{ textAlign: "left", padding: 10 }}>Saldo actual</th>
              <th style={{ textAlign: "left", padding: 10 }}>Notas pendientes</th>
              <th style={{ textAlign: "left", padding: 10 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ padding: 12 }}>
                  Cargando...
                </td>
              </tr>
            ) : clientes.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: 12 }}>
                  Sin resultados
                </td>
              </tr>
            ) : (
              clientes.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 10 }}>{c.nombre}</td>
                  <td style={{ padding: 10 }}>{c.telefono || "-"}</td>
                  <td style={{ padding: 10 }}>{c.email || "-"}</td>
                  <td style={{ padding: 10 }}>{c.rfc || "-"}</td>
                  <td style={{ padding: 10 }}>
                    {Number(c.permite_credito || 0) === 1 ? "Sí" : "No"}
                  </td>
                  <td style={{ padding: 10 }}>
                    ${Number(c.deuda_maxima || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: 10 }}>
                    ${Number(c.saldo_actual || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: 10, maxWidth: 260, whiteSpace: "pre-wrap" }}>
                    {getNotaPendiente(c)}
                  </td>
                  <td style={{ padding: 10, display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => abrirEditar(c)}>
                      Editar
                    </button>
                    <button type="button" onClick={() => verAdeudos(c)}>
  Ver adeudos
</button>

                    {String(activo) === "1" ? (
                      <button type="button" onClick={() => desactivar(c.id)}>
                        Desactivar
                      </button>
                    ) : (
                      <button type="button" onClick={() => activar(c.id)}>
                        Activar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
            style={{
              background: "white",
              padding: 16,
              borderRadius: 12,
              width: 620,
              maxWidth: "100%",
            }}
          >
            <h3 style={{ marginTop: 0 }}>{title}</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
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
                onChange={(e) =>
                  setForm({ ...form, categoria_cliente: e.target.value })
                }
                style={{ padding: 10 }}
              >
                <option value="publico">Público</option>
                <option value="mayoreo">Mayoreo</option>
                <option value="vivero">Vivero</option>
                <option value="especial">Especial</option>
              </select>

              <label
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <input
                  type="checkbox"
                  checked={!!form.permite_credito}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      permite_credito: e.target.checked,
                      deuda_maxima: e.target.checked ? form.deuda_maxima : "",
                    })
                  }
                />
                Permite crédito
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.deuda_maxima}
                onChange={(e) =>
                  setForm({ ...form, deuda_maxima: e.target.value })
                }
                placeholder="Deuda máxima"
                disabled={!form.permite_credito}
                style={{ padding: 10 }}
              />

              <input
                value={Number(form.saldo_actual || 0).toFixed(2)}
                readOnly
                placeholder="Saldo actual"
                style={{ padding: 10, background: "#f7f7f7" }}
              />

              <textarea
                value={form.notas || ""}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                placeholder="Notas"
                rows={3}
                style={{
                  padding: 10,
                  gridColumn: "1 / -1",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 14,
              }}
            >
              <button onClick={cerrarModal}>Cancelar</button>
              <button onClick={guardar}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}