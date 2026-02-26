const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getClientes({ search = "", activo = "1" } = {}) {
  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  if (activo !== undefined && activo !== null) qs.set("activo", String(activo));

  const res = await fetch(`${API_URL}/clientes?${qs.toString()}`, {
    cache: "no-store",
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error al listar clientes");
  return data.data;
}

export async function createCliente(payload) {
  const res = await fetch(`${API_URL}/clientes`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error al crear cliente");
  return data.data;
}

export async function updateCliente(id, payload) {
  const res = await fetch(`${API_URL}/clientes/${id}`, {
    method: "PUT",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error al actualizar cliente");
  return data.data;
}

// ⚠️ Lo dejas así para no romper tu código actual (lo usas como "desactivar")
export async function deleteCliente(id) {
  const res = await fetch(`${API_URL}/clientes/${id}`, {
    method: "DELETE",
    cache: "no-store",
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error al desactivar cliente");
  return data;
}

// ✅ NUEVO: activar cliente
export async function activateCliente(id) {
  const res = await fetch(`${API_URL}/clientes/${id}/activar`, {
    method: "PATCH",
    cache: "no-store",
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error al activar cliente");
  return data;
}