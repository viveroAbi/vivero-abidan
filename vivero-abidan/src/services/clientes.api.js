const API_URL =
  import.meta.env.VITE_API_URL || "https://vivero-abidan.onrender.com/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function manejarRespuesta(res, mensajeDefault) {
  let data;

  try {
    data = await res.json();
  } catch {
    throw new Error("El servidor no respondió con JSON válido");
  }

  if (!res.ok) {
    throw new Error(data?.error || mensajeDefault);
  }

  return data;
}

export async function getClientes({ search = "", activo = "1" } = {}) {
  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  if (activo !== undefined && activo !== null) qs.set("activo", String(activo));

  const res = await fetch(`${API_URL}/clientes?${qs.toString()}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await manejarRespuesta(res, "Error al listar clientes");
  return Array.isArray(data.data) ? data.data : [];
}

export async function getClienteById(id) {
  const res = await fetch(`${API_URL}/clientes/${id}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await manejarRespuesta(res, "Error al obtener cliente");
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

  const data = await manejarRespuesta(res, "Error al crear cliente");
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

  const data = await manejarRespuesta(res, "Error al actualizar cliente");
  return data.data;
}

export async function deleteCliente(id) {
  const res = await fetch(`${API_URL}/clientes/${id}`, {
    method: "DELETE",
    cache: "no-store",
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await manejarRespuesta(res, "Error al desactivar cliente");
  return data;
}

export async function activateCliente(id) {
  const res = await fetch(`${API_URL}/clientes/${id}/activar`, {
    method: "PATCH",
    cache: "no-store",
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await manejarRespuesta(res, "Error al activar cliente");
  return data;
}