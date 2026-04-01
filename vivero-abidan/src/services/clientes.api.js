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
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await manejarRespuesta(res, "No se pudieron obtener los clientes");
  return Array.isArray(data?.data) ? data.data : [];
}

export async function getClienteById(id) {
  const res = await fetch(`${API_URL}/clientes/${id}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await manejarRespuesta(res, "No se pudo obtener el cliente");
  return data?.data || null;
}

export async function createCliente(payload) {
  const res = await fetch(`${API_URL}/clientes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await manejarRespuesta(res, "No se pudo crear el cliente");
  return data?.data || null;
}

export async function updateCliente(id, payload) {
  const res = await fetch(`${API_URL}/clientes/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await manejarRespuesta(res, "No se pudo actualizar el cliente");
  return data?.data || null;
}

export async function deleteCliente(id) {
  const res = await fetch(`${API_URL}/clientes/${id}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });

  return manejarRespuesta(res, "No se pudo desactivar el cliente");
}

export async function activateCliente(id) {
  const res = await fetch(`${API_URL}/clientes/${id}/activar`, {
    method: "PATCH",
    headers: {
      ...getAuthHeaders(),
    },
  });

  return manejarRespuesta(res, "No se pudo activar el cliente");
}

export async function getAdeudosCliente(id) {
  const res = await fetch(`${API_URL}/clientes/${id}/adeudos`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await manejarRespuesta(res, "No se pudieron cargar los adeudos");
  return data?.data || { cliente: null, adeudos: [] };
}

export async function registrarAbonoCliente(clienteId, ventaId, payload) {
  const res = await fetch(
    `${API_URL}/clientes/${clienteId}/adeudos/${ventaId}/abono`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await manejarRespuesta(res, "No se pudo registrar el abono");
  return data?.data || null;
}