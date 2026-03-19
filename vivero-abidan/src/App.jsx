import { useEffect, useMemo, useRef, useState } from "react";
import TicketModal from "./components/TicketModal";
import Drawer from "./components/Drawer";
import Clientes from "./pages/Clientes";
import ReporteProductos from "./pages/ReporteProductos";

const API_URL = import.meta.env.VITE_API_URL || "https://vivero-abidan.onrender.com/api";

const CATEGORIAS_PLANTA = [  "sombra","sol","follage","arboles","palmas","frutales","arbustos",
  "suculentas","plantas_exoticas","maceta","insumos_jardineria",
  "flete","hierbas_de_olor","mano_de_obra",
  "sin_categoria"
];



export default function App() {
  // ===== THEME (claro + verde) =====
  const theme = {
    bg: "#f4f7f6",
    card: "#ffffff",
    border: "#d7e3de",
    text: "#0f1f18",
    muted: "#5b6f67",
    green: "#17c964",
    green2: "#0ea75a",
    danger: "#ff4d4d",
  };

  // ===== NAV =====
  const [codigoScan, setCodigoScan] = useState("");
const [scanLoading, setScanLoading] = useState(false);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [view, setView] = useState("ventas");
  const [cameraOpen, setCameraOpen] = useState(false);
const [cameraError, setCameraError] = useState("");
const [cameraSupported, setCameraSupported] = useState(true);
const videoRef = useRef(null);
const streamRef = useRef(null);
const scanIntervalRef = useRef(null);
const [barcodeSearch, setBarcodeSearch] = useState("");
const [barcodeResultados, setBarcodeResultados] = useState([]);
const [barcodeSeleccionados, setBarcodeSeleccionados] = useState([]);
const [barcodeLoading, setBarcodeLoading] = useState(false);
const [showBarcodeResultados, setShowBarcodeResultados] = useState(false); // ✅ NUEVO
const [editandoVentaId, setEditandoVentaId] = useState(null);
const [clienteSearch, setClienteSearch] = useState("");
const [clienteSug, setClienteSug] = useState([]);
const [showClienteSug, setShowClienteSug] = useState(false);
const [clienteLoading, setClienteLoading] = useState(false);
const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
const [esCotizacionPedido, setEsCotizacionPedido] = useState(false);
const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
const [guardarSaldoFavor, setGuardarSaldoFavor] = useState(false);
useEffect(() => {
  const onResize = () => setIsMobile(window.innerWidth <= 768);
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}, []);
function seleccionarClienteVenta(c) {
  setClienteSeleccionado(c);
  setClienteSearch(c.nombre || "");
  setClienteSug([]);
  setShowClienteSug(false);

  const cat = String(c.categoria_cliente || "publico").toLowerCase();

  // Auto-llenar categoría desde cliente
  setForm((f) => ({
    ...f,
    categoria: cat,
  }));

  // Recalcular precios del carrito con la categoría del cliente
  setCarrito((prev) =>
    prev.map((it) => ({
      ...it,
      precio_unitario: obtenerPrecioPorCategoria(it, cat),
    }))
  );
}
  // ===== Productos: buscador en vivo =====

   // ventas | reporte | productos | clientes
  // ===== Productos: buscador en vivo =====


  // Reporte (placeholder por ahora)
  const [reporteTipo, setReporteTipo] = useState("diario");
  const [reporteData, setReporteData] = useState(null);
  const pagosFijos = [
  "efectivo",
  "transferencia",
  "tarjeta_credito",
  "tarjeta_debito",
  "a_cuenta",
  "a_cuenta_pendiente",
];

const ventasPagoMap = useMemo(() => {
  const arr = reporteData?.ventasPorPago || [];
  return Object.fromEntries(arr.map((x) => [x.tipo_pago, Number(x.total)]));
}, [reporteData]);

  const [gastoForm, setGastoForm] = useState({
  categoria: "gasolina",
  subcategoria: "",
  monto: "",
  metodo_pago: "efectivo",
  nota: "",
});
const [categoriasGasto, setCategoriasGasto] = useState([
  "gasolina",
  "comida",
  "duranta",
  "fertilizante",
  "tierra",
  "renta",
  "sueldos",
  "gastos",
]);

const [nuevaCategoriaGasto, setNuevaCategoriaGasto] = useState("");



  // ===== AUTH =====
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null")
  );

  // ===== DATA =====
 // ===== DATA =====
const [ventas, setVentas] = useState([]);
const [resumen, setResumen] = useState(null);

// ✅ AGREGAR ESTOS 2 (movimientos)
const [movimientos, setMovimientos] = useState([]);
const [movimientosLoading, setMovimientosLoading] = useState(false);
const [movForm, setMovForm] = useState({
  tipo: "entrada",       // entrada | salida | ajuste
  producto_id: "",
  cantidad: "",
  motivo: "compra",
  referencia: "",
});
const [movProdSearch, setMovProdSearch] = useState("");
const [movProdSugerencias, setMovProdSugerencias] = useState([]);
const [movProdBuscando, setMovProdBuscando] = useState(false);
const [movProdSeleccionado, setMovProdSeleccionado] = useState(null);

const [loading, setLoading] = useState(false);
const [msg, setMsg] = useState({ type: "", text: "" });

 

  // ---- TICKET ----
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  


  // ---- LOGIN FORM ----
  const [loginForm, setLoginForm] = useState({ usuario: "", password: "" });
  const [userForm, setUserForm] = useState({
  nombre: "",
  usuario: "",
  password: "",
  rol: "vendedor",
});
const [userSaving, setUserSaving] = useState(false);

  // ---- VENTA FORM ----
const [form, setForm] = useState({
  categoria: "publico",
  tipoPago: "efectivo",
  efectivo: "",
  tarjeta: "",
  recibido: "",
  cambio: "",
  esCotizacion: false,
  esCotizacionPedido: false,
  fecha_vencimiento: "",
  observaciones_credito: "",
});
const [nuevoProducto, setNuevoProducto] = useState({
  nombre: "",
  precio: "",
  categoria_planta: "sin_categoria",
});
const [imagenProducto, setImagenProducto] = useState(null);
const [previewImagen, setPreviewImagen] = useState("");
const fileInputRef = useRef(null);
  // ---- PRODUCTOS / CARRITO ----
  const [search, setSearch] = useState("");
  const [productos, setProductos] = useState([]);
  const [qProd, setQProd] = useState("");
  // ✅ NUEVO: categoría seleccionada en vista Productos
const [catProd, setCatProd] = useState(""); // "" = todas
const productosFiltrados = useMemo(() => {
  return Array.isArray(productos) ? productos : [];
}, [productos]);




  const [carrito, setCarrito] = useState([]);
const [prodForm, setProdForm] = useState({
  id: null,
  nombre: "",
  precio_publico: "",
  precio_mayoreo: "",
  precio_vivero: "",
  precio_especial: "",
  costo: "",
  categoria_planta: "sin_categoria",
});
const [prodSaving, setProdSaving] = useState(false);
const [borradores, setBorradores] = useState([]);
const [borradorActivo, setBorradorActivo] = useState(null);
const [mostrarBorradores, setMostrarBorradores] = useState(false);
async function buscarClientesVenta(texto) {
  const q = String(texto || "").trim();

  if (!q) {
    setClienteSug([]);
    setShowClienteSug(false);
    return;
  }

  try {
    setClienteLoading(true);
    const data = await apiFetch(`/clientes?search=${encodeURIComponent(q)}&activo=1`);
    const list = Array.isArray(data.data) ? data.data : data; // por si tu servicio devuelve directo array
    setClienteSug(list.slice(0, 8));
    setShowClienteSug(true);
  } catch (err) {
    console.error(err);
    setClienteSug([]);
    setShowClienteSug(false);
  } finally {
    setClienteLoading(false);
  }
}
function limpiarClienteVenta() {
  setClienteSeleccionado(null);
  setClienteSearch("");
  setClienteSug([]);
  setShowClienteSug(false);

  const cat = "publico";

  setForm((f) => ({ ...f, categoria: cat }));

  // Recalcular carrito al precio público
  setCarrito((prev) =>
    prev.map((it) => ({
      ...it,
      precio_unitario: obtenerPrecioPorCategoria(it, cat),
    }))
  );
}
async function crearProducto() {
  try {
    const fd = new FormData();
    fd.append("nombre", nuevoProducto.nombre);
    fd.append("precio", nuevoProducto.precio);
    fd.append("categoria_planta", nuevoProducto.categoria_planta || "sin_categoria");

    if (imagenProducto) {
      fd.append("imagen", imagenProducto); // 👈 nombre debe coincidir con multer.single("imagen")
    }

    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/productos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // ❌ NO pongas Content-Type manual cuando uses FormData
      },
      body: fd,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo crear");

    alert("Producto creado");

    // limpiar
        // limpiar
    setNuevoProducto((p) => ({ ...p, nombre: "", precio: "" }));
    setImagenProducto(null);

    if (previewImagen) {
      URL.revokeObjectURL(previewImagen);
    }
    setPreviewImagen("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // recargar lista (tu función actual)
        // recargar lista
    await buscarProductos("", "");
  } catch (err) {
    alert(err.message || "Error al crear producto");
    console.error(err);
  }
}
// ===== BORRADORES =====
async function cargarBorradores() {
  try {
    const data = await apiFetch("/ventas/borradores");
    setBorradores(Array.isArray(data.data) ? data.data : []);
  } catch (e) {
    console.error(e);
    alert(e?.message || "Error cargando borradores");
  }
}

async function eliminarBorrador(id) {
  try {
    const ok = window.confirm(`¿Eliminar borrador #${id}?`);
    if (!ok) return;

    await apiFetch(`/ventas/borradores/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (borradorActivo === id) {
      setBorradorActivo(null);
    }

    await cargarBorradores();
    setMessage("success", `✅ Borrador #${id} eliminado`);
  } catch (e) {
    console.error(e);
    setMessage("error", e?.message || "Error eliminando borrador");
  }
}

// ✅ BUSCAR SUGERENCIAS (CORREGIDO)
async function buscarSugerenciasProductos(texto) {
  const q = String(texto || "").trim();

  if (!q) {
    setSugerencias([]);
    setShowSugerencias(false);
    return;
  }

  try {
    setLoadingSugerencias(true);

    const data = await apiFetch(`/productos?q=${encodeURIComponent(q)}&limit=20`, {
      cache: "no-store",
    });

    setSugerencias(Array.isArray(data.data) ? data.data : []);
    setShowSugerencias(true);
  } catch (err) {
    console.error("Error buscando sugerencias:", err);
    setSugerencias([]);
    setShowSugerencias(false);
  } finally {
    setLoadingSugerencias(false);
  }
}

// ✅ AFUERA de la función anterior (NO dentro)
function onChangeBusqueda(e) {
  const value = e.target.value;
  setBusqueda(value);
  buscarSugerenciasProductos(value);
}

function seleccionarSugerencia(producto) {
  agregarProductoEscaneadoAlCarrito(producto);
  setBusqueda("");
  setSugerencias([]);
  setShowSugerencias(false);
}

  // ---- AUTOCOMPLETE ----
  const [busqueda, setBusqueda] = useState("");
const [sugerencias, setSugerencias] = useState([]);
const [showSugerencias, setShowSugerencias] = useState(false);
const [loadingSugerencias, setLoadingSugerencias] = useState(false);
  const [buscando, setBuscando] = useState(false);

  const isAdmin = user?.rol === "admin";
  const isMixto = form.tipoPago === "mixto";
  const isTarjeta =
    form.tipoPago === "tarjeta_credito" || form.tipoPago === "tarjeta_debito";

  // ====== TOTAL CARRITO ======
  const totalCarrito = useMemo(() => {
  return carrito.reduce(
    (acc, it) => acc + Number(it.cantidad) * Number(it.precio_unitario),
    0
  );
}, [carrito]);

const totalNum = useMemo(() => Number(totalCarrito || 0), [totalCarrito]);
const descuentoPctNum = 0;
const descuentoMonto = 0;
const totalFinalUI = totalNum;


  const efectivoNum = useMemo(
    () => Number(form.efectivo || 0),
    [form.efectivo]
  );
  const tarjetaNum = useMemo(() => Number(form.tarjeta || 0), [form.tarjeta]);

  const recibidoNum = useMemo(() => Number(form.recibido || 0), [form.recibido]);

const cambioNum = useMemo(() => {
  if (form.tipoPago === "efectivo") {
    return Math.max(recibidoNum - totalFinalUI, 0);
  }
  if (form.tipoPago === "mixto") {
    return Math.max(recibidoNum - efectivoNum, 0);
  }
  return 0;
}, [form.tipoPago, recibidoNum, totalFinalUI, efectivoNum]);


  // ✅ Autocomplete de importes según tipo de pago
  useEffect(() => {
  setForm((f) => {
    if (f.tipoPago === "efectivo") {
      return {
        ...f,
        efectivo: totalFinalUI ? String(totalFinalUI) : "",
        tarjeta: "0",
      };
    }

    if (f.tipoPago === "tarjeta_credito" || f.tipoPago === "tarjeta_debito") {
      return {
        ...f,
        tarjeta: totalFinalUI ? String(totalFinalUI) : "",
        efectivo: "0",
      };
    }

    return f;
  });
}, [totalFinalUI]);



  function setMessage(type, text) {
    setMsg({ type, text });
  }

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  const money = (n) => {
    const num = Number(n || 0);
    return num.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  };

  async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

  // ====== PRODUCTOS (manual) ======
async function buscarProductos(q = "", cat = "") {
  try {
    const params = new URLSearchParams();
    params.set("limit", "5000");

    if (q && q.trim()) params.set("q", q.trim());
    if (cat && cat.trim()) params.set("categoria", cat.trim());

    const data = await apiFetch(`/productos?${params.toString()}`, {
      cache: "no-store",
    });

    setProductos(Array.isArray(data.data) ? data.data : []);
  } catch (err) {
    console.error("Error cargando productos:", err);
    setProductos([]);
    setMessage("error", err?.message || "No se pudieron cargar los productos.");
  }
}
useEffect(() => {
  if (view !== "productos") return;

  const timer = setTimeout(() => {
    buscarProductos(qProd, catProd);
  }, 250);

  return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [qProd, catProd, view]);
// ====== CÓDIGOS DE BARRAS ======
// ====== CÓDIGOS DE BARRAS ======
async function buscarProductosBarcode(q = "") {
  try {
    setBarcodeLoading(true);

    const texto = String(q || "").trim();
    if (!texto) {
      setBarcodeResultados([]);
      return;
    }

    const data = await apiFetch(`/productos?q=${encodeURIComponent(texto)}&limit=50`);
    setBarcodeResultados(Array.isArray(data.data) ? data.data : []);
  } catch (err) {
    console.error(err);
    setMessage("error", err.data?.error || err.message || "No se pudieron buscar productos.");
    setBarcodeResultados([]);
  } finally {
    setBarcodeLoading(false);
  }
}

function agregarProductoBarcode(p) {
  setBarcodeSeleccionados((prev) => {
    const existe = prev.find((x) => x.id === p.id);
    if (existe) {
      return prev.map((x) =>
        x.id === p.id ? { ...x, copias: Number(x.copias || 1) + 1 } : x
      );
    }

    return [
      ...prev,
      {
        id: p.id,
        codigo: p.codigo_cat || p.codigo || "",
        nombre: p.nombre || "",
        precio: Number(p.precio || 0),
        copias: 1,
      },
    ];
  });

  // ✅ Cerrar y limpiar buscador después de seleccionar
  setBarcodeSearch("");
  setBarcodeResultados([]);
  setShowBarcodeResultados(false);
}

function cambiarCopiasBarcode(id, value) {
  if (value === "") {
    setBarcodeSeleccionados((prev) =>
      prev.map((x) => (x.id === id ? { ...x, copias: "" } : x))
    );
    return;
  }

  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return;

  setBarcodeSeleccionados((prev) =>
    prev.map((x) => (x.id === id ? { ...x, copias: n } : x))
  );
}

function quitarProductoBarcode(id) {
  setBarcodeSeleccionados((prev) => prev.filter((x) => x.id !== id));
}

function limpiarBarcodeSeleccionados() {
  setBarcodeSeleccionados([]);
}

  function onProdChange(e) {
  const { name, value } = e.target;
  setProdForm((p) => ({ ...p, [name]: value }));
}

function editarProductoUI(p) {
  setProdForm({
    id: p.id,
    nombre: p.nombre || "",
    precio_publico: String(p.precio_publico ?? p.precio ?? ""),
    precio_mayoreo: String(p.precio_mayoreo ?? p.precio_publico ?? p.precio ?? ""),
    precio_vivero: String(p.precio_vivero ?? p.precio_publico ?? p.precio ?? ""),
    precio_especial: String(p.precio_especial ?? p.precio_publico ?? p.precio ?? ""),
    costo: String(p.costo ?? ""),
    categoria_planta: p.categoria_planta || "sin_categoria",
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}


function limpiarProductoUI() {
  setProdForm({
    id: null,
    nombre: "",
    precio_publico: "",
    precio_mayoreo: "",
    precio_vivero: "",
    precio_especial: "",
    costo: "",
    categoria_planta: "sin_categoria",
  });

  setImagenProducto(null);

  if (previewImagen) {
    URL.revokeObjectURL(previewImagen);
  }
  setPreviewImagen("");

  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
}

async function guardarProductoUI(e) {
  e.preventDefault();
  setMessage("", "");

  const nombre = (prodForm.nombre || "").trim();
  const categoria_planta = (prodForm.categoria_planta || "sin_categoria").trim();

  const precio_publico = Number(prodForm.precio_publico);
  const precio_mayoreo = Number(prodForm.precio_mayoreo);
  const precio_vivero = Number(prodForm.precio_vivero);
  const precio_especial = Number(prodForm.precio_especial);
  const costo = Number(prodForm.costo);

  // ✅ Validación (precio_especial puede ser 0 si quieres, aquí lo pido >0)
  if (
    !nombre ||
    !Number.isFinite(precio_publico) || precio_publico <= 0 ||
    !Number.isFinite(precio_mayoreo) || precio_mayoreo <= 0 ||
    !Number.isFinite(precio_vivero) || precio_vivero <= 0 ||
    !Number.isFinite(precio_especial) || precio_especial <= 0
  ) {
    setMessage("error", "Completa nombre y todos los precios con valores válidos.");
    return;
  }

  try {
    setProdSaving(true);

    if (prodForm.id) {
      // ✅ EDITAR (JSON)
      await apiFetch(`/productos/${prodForm.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          nombre,
          categoria_planta,
          precio_publico,
          precio_mayoreo,
          precio_vivero,
          precio_especial,
          costo,
        }),
      });

      setMessage("success", "✅ Producto actualizado");
    } else {
      // ✅ CREAR (FormData + imagen)
      const fd = new FormData();
      fd.append("nombre", nombre);
      fd.append("categoria_planta", categoria_planta);
      fd.append("precio_publico", String(precio_publico));
      fd.append("precio_mayoreo", String(precio_mayoreo));
      fd.append("precio_vivero", String(precio_vivero));
      fd.append("precio_especial", String(precio_especial));
      fd.append("costo", String(costo));

      if (imagenProducto) fd.append("imagen", imagenProducto);

      await apiFetch(`/productos`, { method: "POST", body: fd });

      setMessage("success", "✅ Producto creado");
    }

    // ✅ AHORA SÍ: limpiar + recargar (DESPUÉS de guardar)

    limpiarProductoUI();
    setImagenProducto(null);

    if (previewImagen) {
      URL.revokeObjectURL(previewImagen);
    }
    setPreviewImagen("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    await buscarProductos(qProd, catProd);
  } catch (err) {
    console.error(err);
    setMessage("error", err?.message || "No se pudo guardar.");
  } finally {
    setProdSaving(false);
  }
}

async function eliminarProductoUI(id) {
  const ok = window.confirm(`¿Eliminar producto ID ${id}?`);
  if (!ok) return;

  try {
    setProdSaving(true);

    await apiFetch(`/productos/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    // quitar de la tabla inmediatamente sin refrescar
    setProductos((prev) => prev.filter((p) => p.id !== id));

    setMessage("success", "🗑️ Producto eliminado");
  } catch (err) {
    console.error(err);
    setMessage("error", err?.message || "No se pudo eliminar.");
  } finally {
    setProdSaving(false);
  }
}


async function nuevaVentaBorrador() {
  try {
    const data = await apiFetch("/ventas/borrador", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ categoria: form.categoria }),
    });

    const id = data?.data?.id;
    if (!id) return alert("No se pudo crear borrador");

    setBorradorActivo(id);
    await cargarBorradores();
    alert("Borrador creado: #" + id);
  } catch (e) {
    console.error(e);
    alert(e?.message || "Error creando borrador");
  }
}

  useEffect(() => {
  if (view === "productos") {
    setQProd("");
    setCatProd("");
    buscarProductos("", "");
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [view]);
useEffect(() => {
  if (cameraOpen) {
    iniciarCamaraYDeteccion();
  } else {
    // por seguridad, si se cierra
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  }

  return () => {
    // cleanup al desmontar
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [cameraOpen]);
function obtenerCategoriaPrecioActual() {
  // Si hay cliente seleccionado, manda su categoría
  if (clienteSeleccionado?.categoria_cliente) {
    return String(clienteSeleccionado.categoria_cliente).toLowerCase();
  }

  // Si no hay cliente, usa la categoría manual del formulario
  return String(form.categoria || "publico").toLowerCase();
}

function obtenerPrecioPorCategoria(producto, categoria) {
  const cat = String(categoria || "publico").toLowerCase();

  const mapa = {
  publico: producto.precio_publico,
  mayoreo: producto.precio_mayoreo,
  vivero: producto.precio_vivero,
  especial: producto.precio_especial,
  
};

  const precioCat = Number(mapa[cat]);
  const precioBase = Number(producto.precio || 0);

  // Si no existe precio de esa categoría, usa el precio normal
  return Number.isFinite(precioCat) && precioCat > 0 ? precioCat : precioBase;
}

  function agregarProductoEscaneadoAlCarrito(p) {
  const categoriaActual = obtenerCategoriaPrecioActual();
  const precioAplicado = obtenerPrecioPorCategoria(p, categoriaActual);

  setCarrito((prev) => {
    const idx = prev.findIndex((item) => item.producto_id === p.id);

    if (idx >= 0) {
      const copia = [...prev];
      copia[idx] = {
        ...copia[idx],
        cantidad: Number(copia[idx].cantidad || 1) + 1,
        precio_unitario: precioAplicado,
      };
      return copia;
    }

    return [
      ...prev,
      {
        producto_id: p.id,
        codigo: p.codigo_cat || p.codigo || "",
        nombre: p.nombre || "",

        precio_publico: Number(p.precio_publico ?? p.precio ?? 0),
        precio_mayoreo: Number(p.precio_mayoreo ?? p.precio_publico ?? p.precio ?? 0),
        precio_vivero: Number(p.precio_vivero ?? p.precio_publico ?? p.precio ?? 0),
        precio_especial: Number(p.precio_especial ?? p.precio_publico ?? p.precio ?? 0),

        precio_unitario: precioAplicado,
        cantidad: 1,
      },
    ];
  });
}

  function cambiarCantidad(itemKey, value) {
  if (value === "") {
    setCarrito((prev) =>
      prev.map((x) =>
        (x.producto_id ?? x._rowId) === itemKey ? { ...x, cantidad: "" } : x
      )
    );
    return;
  }

  const n = Number(value);
  if (!Number.isFinite(n)) return;

  setCarrito((prev) =>
    prev.map((x) =>
      (x.producto_id ?? x._rowId) === itemKey ? { ...x, cantidad: n } : x
    )
  );
}

  function quitarDelCarrito(itemKey) {
  setCarrito((prev) =>
    prev.filter((x) => (x.producto_id ?? x._rowId) !== itemKey)
  );
}
  async function buscarProductoPorCodigo(codigoLeido) {
  const codigo = String(codigoLeido || "").trim();
  if (!codigo) return;

  try {
    setScanLoading(true);

    const data = await apiFetch(
      `/productos?q=${encodeURIComponent(codigo)}&limit=20`,
      { cache: "no-store" }
    );

    const lista = Array.isArray(data.data) ? data.data : [];

    const p =
      lista.find(
        (item) =>
          String(item.codigo_cat || item.codigo || "").toLowerCase() ===
          codigo.toLowerCase()
      ) || lista[0];

    if (!p) {
      throw new Error("No se encontró el producto");
    }

    agregarProductoEscaneadoAlCarrito(p);
    setCodigoScan("");
  } catch (err) {
    console.error("Error escaneando código:", err);
    alert(err.message || "No se pudo buscar el producto por código");
  } finally {
    setScanLoading(false);
  }
}
function onScanKeyDown(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    buscarProductoPorCodigo(codigoScan);
  }
}
async function abrirCamaraEscaner() {
  setCameraError("");

  if (!navigator.mediaDevices?.getUserMedia) {
    setCameraSupported(false);
    setCameraError("Este dispositivo/navegador no soporta cámara.");
    return;
  }

  setCameraOpen(true);
}

function cerrarCamaraEscaner() {
  setCameraOpen(false);
  setCameraError("");

  if (scanIntervalRef.current) {
    clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = null;
  }

  if (streamRef.current) {
    streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  if (videoRef.current) {
    videoRef.current.srcObject = null;
  }
}

async function iniciarCamaraYDeteccion() {
  try {
    setCameraError("");

    // Abrir cámara trasera si es posible
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
      },
      audio: false,
    });

    streamRef.current = stream;

    if (!videoRef.current) return;

    videoRef.current.srcObject = stream;
    await videoRef.current.play();

    // Si BarcodeDetector no existe, mostrar mensaje
    if (!("BarcodeDetector" in window)) {
      setCameraError(
        "Tu navegador no soporta escaneo automático aquí. Puedes escribir el código manualmente o usar Chrome/Edge actualizado."
      );
      return;
    }

    // Tipos comunes
    const detector = new window.BarcodeDetector({
      formats: [
        "code_128",
        "code_39",
        "ean_13",
        "ean_8",
        "upc_a",
        "upc_e",
        "itf",
        "codabar",
        "qr_code",
      ],
    });

    let leyendo = false;

    scanIntervalRef.current = setInterval(async () => {
      try {
        if (leyendo) return;
        if (!videoRef.current || videoRef.current.readyState < 2) return;

        leyendo = true;
        const barcodes = await detector.detect(videoRef.current);

        if (barcodes && barcodes.length > 0) {
          const raw = String(barcodes[0].rawValue || "").trim();

          if (raw) {
            setCodigoScan(raw);

            // Cerrar cámara primero para liberar recursos
            cerrarCamaraEscaner();

            // Buscar producto por código
            await buscarProductoPorCodigo(raw);
          }
        }
      } catch (err) {
        console.error("Error detectando código:", err);
      } finally {
        leyendo = false;
      }
    }, 350);
  } catch (err) {
    console.error("Error abriendo cámara:", err);
    setCameraError(
      err?.message || "No se pudo abrir la cámara. Revisa permisos."
    );
  }
}

  // ====== TICKET ======
  async function verTicket(id) {
  try {
    // ✅ limpia antes (para que no se quede el anterior)
    setTicketData(null);
    setShowTicket(false);

    const data = await apiFetch(`/ventas/${id}/ticket`, { cache: "no-store" });

    setTicketData(data.data);
    setShowTicket(true);
  } catch (err) {
    alert("No se pudo cargar el ticket");
    console.error(err);
  }
}
  async function editarVentaDesdeTabla(v) {
  try {
    setMessage("", "");

    // 1) Obtener ticket/detalle completo (ya trae venta + items)
    const data = await apiFetch(`/ventas/${v.id}/ticket`, { cache: "no-store" });
    const ventaData = data?.data?.venta || {};
    const items = Array.isArray(data?.data?.items) ? data.data.items : [];

    // 2) Cargar modo edición
    setEditandoVentaId(v.id);

    // 3) Cargar flags (venta / cotización / pedido)
    const esCot = !!ventaData.es_cotizacion;
    const esPedido = !!ventaData.es_cotizacion_pedido;

    setEsCotizacionPedido(esPedido);

    // 4) Cargar form
    setForm((f) => ({
  ...f,
  categoria: ventaData.categoria || "publico",
  tipoPago: ventaData.tipo_pago || "efectivo",
  efectivo: String(ventaData.efectivo ?? ""),
  tarjeta: String(ventaData.tarjeta ?? ""),
  recibido: String(ventaData.recibido ?? ""),
  cambio: String(ventaData.cambio ?? ""),
  esCotizacion: esCot,
  esCotizacionPedido: esPedido,
}));

    // 5) Cargar carrito desde items (MAPEO CORRECTO)
    const itemsEdit = items.map((it) => ({
      producto_id: Number(it.producto_id || it.id || 0),
      id: Number(it.producto_id || it.id || 0),
      codigo: it.codigo || "",
      nombre: it.nombre || it.producto_nombre || "",
      producto_nombre: it.producto_nombre || it.nombre || "",
      precio_unitario: Number(it.precio_unitario ?? it.precio ?? 0),
      precio: Number(it.precio_unitario ?? it.precio ?? 0),
      cantidad: Number(it.cantidad || 1),
      subtotal: Number(it.subtotal ?? it.importe ?? 0),
    }));

  setCarrito(
  items.map((it, idx) => ({
    producto_id: it.producto_id != null ? Number(it.producto_id) : null,
    codigo: it.codigo || "",
    nombre: it.nombre || it.producto_nombre || "",
    precio_unitario: Number(it.precio_unitario || 0),
    cantidad: Number(it.cantidad || 1),

    // ✅ id local para render estable cuando producto_id venga null
    _rowId: `${it.producto_id ?? "manual"}-${idx}-${Date.now()}`
  }))
);
    // 6) Ir arriba visualmente (opcional)
    window.scrollTo({ top: 0, behavior: "smooth" });

    setMessage(
      "success",
      `✏️ Editando ${esPedido ? "pedido" : esCot ? "cotización" : "venta"} #${v.id}`
    );
  } catch (err) {
    console.error(err);
    setMessage("error", err.data?.error || err.message || "No se pudo cargar para edición.");
  }
}
  function cancelarEdicionVenta() {
  setEditandoVentaId(null);

  setCarrito([]);
  setSugerencias([]);
  setSearch("");

  setForm({
  categoria: "publico",
  tipoPago: "efectivo",
  efectivo: "",
  tarjeta: "",
  recibido: "",
  cambio: "",
  esCotizacion: false,
  esCotizacionPedido: false,
  fecha_vencimiento: "",
  observaciones_credito: "",
});

  setEsCotizacionPedido(false);
  setMessage("success", "Edición cancelada.");
}
  // ====== CARGA DE DATOS ======
  async function cargarVentas() {
    const data = await apiFetch("/ventas");
    setVentas(Array.isArray(data.data) ? data.data : []);
  }

  async function cargarResumen() {
    if (!isAdmin) return;
    const data = await apiFetch("/ventas/resumen");
    setResumen(data.data || null);
  }
  async function cargarReporteDiario(tipo = reporteTipo) {
  const q = new URLSearchParams();
  q.set("periodo", tipo || "diario");

  const data = await apiFetch(`/reporte/diario?${q.toString()}`);
  setReporteData(data.data);
}
async function cargarMovimientos() {
  try {
    setMovimientosLoading(true);
    const data = await apiFetch("/inventario/movimientos");
    setMovimientos(Array.isArray(data.data) ? data.data : []);
  } catch (err) {
    console.error(err);
    setMessage("error", err.data?.error || err.message || "No se pudieron cargar movimientos.");
  } finally {
    setMovimientosLoading(false);
  }
}
function seleccionarProductoMovimiento(p) {
  console.log("PRODUCTO SELECCIONADO:", p);

  setMovForm((f) => ({ ...f, producto_id: String(p.id) }));
  setMovProdSeleccionado(p);
  setMovProdSearch(`${p.codigo_cat || p.codigo} — ${p.nombre}`);
  setMovProdSugerencias([]);
}

function limpiarProductoMovimiento() {
  setMovForm((f) => ({ ...f, producto_id: "" }));
  setMovProdSeleccionado(null);
  setMovProdSearch("");
  setMovProdSugerencias([]);
}
async function refrescarProductoSeleccionadoMovimiento(productoId) {
  try {
    const data = await apiFetch(`/inventario`, { cache: "no-store" });
    const list = Array.isArray(data.data) ? data.data : [];
    const actualizado = list.find((p) => Number(p.id) === Number(productoId));

    if (actualizado) {
      setMovProdSeleccionado(actualizado);
      setMovProdSearch(`${actualizado.codigo_cat || actualizado.codigo} — ${actualizado.nombre}`);
      setMovForm((f) => ({ ...f, producto_id: String(actualizado.id) }));
    }
  } catch (err) {
    console.error("No se pudo refrescar producto seleccionado:", err);
  }
}
async function guardarMovimiento(e) {
  e.preventDefault();
  setMessage("", "");

  const tipo = String(movForm.tipo || "").trim().toLowerCase();
  const productoId = Number(movForm.producto_id);
  const cantidad = Number(movForm.cantidad);
  const referencia = String(movForm.referencia || movForm.motivo || "").trim();

  if (!Number.isFinite(productoId) || productoId <= 0) {
    setMessage("error", "Selecciona un producto.");
    return;
  }

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    setMessage("error", "La cantidad debe ser mayor a 0.");
    return;
  }

  if (tipo === "salida" && movProdSeleccionado) {
    const stockActual = Number(movProdSeleccionado.stock || 0);
    if (cantidad > stockActual) {
      setMessage("error", `No hay suficiente stock. Disponible: ${stockActual}`);
      return;
    }
  }

  try {
    if (tipo === "entrada") {
      await apiFetch("/inventario/entrada", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          productoId,
          cantidad,
          referencia,
        }),
      });
    } else if (tipo === "salida") {
      await apiFetch("/inventario/salida", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          productoId,
          cantidad,
          referencia,
        }),
      });
    } else if (tipo === "ajuste") {
      await apiFetch("/inventario/ajuste", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          productoId,
          nuevoStock: cantidad,
          referencia: referencia || "Ajuste manual",
        }),
      });
    } else {
      setMessage("error", "Tipo de movimiento inválido.");
      return;
    }

    setMessage("success", "✅ Movimiento guardado");

setMovForm((f) => ({
  ...f,
  cantidad: "",
  referencia: "",
}));

await cargarMovimientos();
await refrescarProductoSeleccionadoMovimiento(productoId);
    await buscarProductos("", "");
  } catch (err) {
    console.error(err);
    setMessage("error", err.data?.error || err.message || "No se pudo guardar movimiento.");
  }
}

async function imprimirCorteTicket() {
  try {
    // ✅ 1) guardar cierre (ruta correcta)
    await apiFetch("/reporte/cierres", {
      method: "POST",
      headers: authHeaders(),
    });

    // ✅ 2) generar ticket del corte con período seleccionado (ruta correcta)
    const q = new URLSearchParams();
    q.set("periodo", reporteTipo || "diario");

    const data = await apiFetch(`/reporte/corte/ticket?${q.toString()}`, {
      headers: authHeaders(),
    });

    // ✅ 3) abrir modal para imprimir
    setTicketData({
      tipo: "corte",
      texto: data.data.texto,
    });
    setShowTicket(true);
  } catch (err) {
    console.error(err);
    alert("No se pudo generar el corte para imprimir");
  }
}

async function guardarGasto(e) {
  e.preventDefault();
  setMessage("", "");

  const payload = {
    ...gastoForm,
    monto: Number(gastoForm.monto || 0),
  };

  if (!payload.categoria || !Number.isFinite(payload.monto) || payload.monto <= 0) {
    setMessage("error", "Pon categoría y monto válido.");
    return;
  }

  try {
    await apiFetch("/reporte/gastos", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    setMessage("success", "✅ Gasto guardado");

    // limpiar form
    setGastoForm({
      categoria: "gasolina",
      subcategoria: "",
      monto: "",
      metodo_pago: "efectivo",
      nota: "",
    });

    // recargar reporte
    await cargarReporteDiario();
  } catch (err) {
    console.error(err);
    setMessage("error", err.data?.error || err.message || "No se pudo guardar gasto.");
  }
}



  async function recargarTodo() {
    try {
      setMessage("", "");
      await Promise.all([cargarVentas(), cargarResumen()]);
    } catch (e) {
      console.error(e);
      setMessage("error", e.message || "Error al cargar datos");
      if ((e.message || "").toLowerCase().includes("token")) logout();
    }
  }

  async function me() {
    const data = await apiFetch("/auth/me");
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
  }

  useEffect(() => {
    if (token) {
      me().then(recargarTodo).catch(() => logout());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  useEffect(() => {
  if (!user) return;

  // ✅ Vendedor solo puede usar la vista de ventas
  if (user.rol === "vendedor" && view !== "ventas") {
    setView("ventas");
    setMessage("error", "Acceso restringido: el vendedor solo puede usar Ventas.");
  }
}, [user, view]);
useEffect(() => {
  if (view === "reporte") {
    cargarReporteDiario(reporteTipo);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [view, reporteTipo]);
// Carga inicial al entrar a la vista de movimientos
useEffect(() => {
  if (view === "movimientos") {
    cargarMovimientos();
    buscarProductos("", "");
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [view]);
// Búsqueda automática para códigos de barras
// Búsqueda automática para códigos de barras
useEffect(() => {
  if (view !== "codigos_barras") return;

  // limpiar estado visual al entrar a la vista
  setShowBarcodeResultados(false);
  setBarcodeResultados([]);
}, [view]);
useEffect(() => {
  if (view !== "codigos_barras") return;

  const q = barcodeSearch.trim();
  if (q.length < 2) {
    setBarcodeResultados([]);
    return;
  }

  const t = setTimeout(() => {
    buscarProductosBarcode(q);
  }, 250);

  return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [barcodeSearch, view]);

// Autocomplete de producto para movimientos (mínimo 3 letras)
useEffect(() => {
  if (view !== "movimientos") return;

  const q = movProdSearch.trim();

  // Solo buscar cuando haya 3 letras o más
  if (q.length < 3) {
    setMovProdSugerencias([]);
    setMovProdBuscando(false);
    return;
  }

  // Si el texto coincide con el seleccionado, no buscar de nuevo
  if (
    movProdSeleccionado &&
    q === `${movProdSeleccionado.codigo_cat || movProdSeleccionado.codigo} — ${movProdSeleccionado.nombre}`
  ) {
    setMovProdSugerencias([]);
    setMovProdBuscando(false);
    return;
  }

  const timer = setTimeout(async () => {
    try {
      setMovProdBuscando(true);

      const data = await apiFetch(`/productos?q=${encodeURIComponent(q)}&limit=30`);
      const list = Array.isArray(data.data) ? data.data : [];

      const qq = q.toLowerCase();

      const filtrados = list.filter((p) =>
        String(p.codigo_cat || p.codigo || "").toLowerCase().includes(qq) ||
        String(p.nombre || "").toLowerCase().includes(qq)
      );

      setMovProdSugerencias(filtrados.slice(0, 20));
    } catch (err) {
      console.error(err);
      setMovProdSugerencias([]);
    } finally {
      setMovProdBuscando(false);
    }
  }, 250);

  return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [movProdSearch, view, movProdSeleccionado]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  function logout() {
    setToken("");
    setUser(null);
    setVentas([]);
    setResumen(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  // ====== LOGIN ======
  function onLoginChange(e) {
    const { name, value } = e.target;
    setLoginForm((f) => ({ ...f, [name]: value }));
  }

  async function onLoginSubmit(e) {
    e.preventDefault();
    setMessage("", "");

    if (!loginForm.usuario || !loginForm.password) {
      setMessage("error", "Completa usuario y contraseña.");
      return;
    }
    

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage("error", data?.error || "No se pudo iniciar sesión.");
        return;
      }
    

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      if (data.user?.rol === "vendedor") {
  setView("ventas");
}
      setMessage(
        "success",
        `✅ Bienvenido, ${data.user?.nombre || data.user?.usuario}`
      );
    } catch (err) {
      console.error(err);
      setMessage("error", "Error de conexión.");
    } finally {
      setLoading(false);
    }
  }
  function onUserFormChange(e) {
  const { name, value } = e.target;
  setUserForm((f) => ({ ...f, [name]: value }));
}

async function onCreateUserSubmit(e) {
  e.preventDefault();
  setMessage("", "");

  if (!isAdmin) {
    setMessage("error", "Solo admin puede crear usuarios.");
    return;
  }

  if (!userForm.usuario || !userForm.password) {
    setMessage("error", "Completa usuario y contraseña.");
    return;
  }

  try {
    setUserSaving(true);

    const data = await apiFetch("/auth/register-user", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        nombre: userForm.nombre?.trim() || null,
        usuario: userForm.usuario.trim(),
        password: userForm.password,
        rol: userForm.rol,
      }),
    });

    setMessage("success", `✅ ${data?.mensaje || "Usuario creado"}`);

    setUserForm({
      nombre: "",
      usuario: "",
      password: "",
      rol: "vendedor",
    });
  } catch (err) {
    console.error(err);
    setMessage("error", err.data?.error || err.message || "No se pudo crear el usuario.");
  } finally {
    setUserSaving(false);
  }
}

  // ====== VENTAS ======
  function onChange(e) {
  const { name, value } = e.target;

  setForm((f) => ({ ...f, [name]: value }));

  if (name === "categoria") {
    setCarrito((prev) =>
      prev.map((it) => ({
        ...it,
        precio_unitario: obtenerPrecioPorCategoria(it, value),
      }))
    );
  }
}

  function onChangeTipoPago(e) {
  const value = e.target.value;

  setForm((f) => {
    const total = Number(totalFinalUI || 0);

    if (value === "efectivo") {
      return {
        ...f,
        tipoPago: value,
        efectivo: total ? String(total) : "",
        tarjeta: "0",
        recibido: f.recibido || "",
        cambio: f.cambio || "",
      };
    }

    if (value === "tarjeta_credito" || value === "tarjeta_debito") {
      return {
        ...f,
        tipoPago: value,
        efectivo: "0",
        tarjeta: total ? String(total) : "",
        recibido: f.recibido || "",
        cambio: f.cambio || "",
      };
    }

    if (value === "transferencia" || value === "cheque") {
      return {
        ...f,
        tipoPago: value,
        efectivo: "0",
        tarjeta: "0",
      };
    }

    if (value === "mixto") {
      return {
        ...f,
        tipoPago: value,
      };
    }

    if (value === "a_cuenta") {
      return {
        ...f,
        tipoPago: value,
        efectivo: "0",
        tarjeta: "0",
        recibido: "",
        cambio: "",
      };
    }

    return { ...f, tipoPago: value };
  });
}
function onChangeMixtoEfectivo(e) {
  const value = e.target.value;

  setForm((f) => {
    if (f.tipoPago !== "mixto") {
      return { ...f, efectivo: value };
    }

    if (value === "") {
      return { ...f, efectivo: "", tarjeta: "" };
    }

    let efectivo = Number(value);
    const total = Number(totalFinalUI || 0);

    if (!Number.isFinite(efectivo)) efectivo = 0;
    if (efectivo < 0) efectivo = 0;
    if (efectivo > total) efectivo = total;

    const tarjeta = Number((total - efectivo).toFixed(2));

    return {
      ...f,
      efectivo: String(efectivo),
      tarjeta: String(tarjeta),
    };
  });
}

function onChangeMixtoTarjeta(e) {
  const value = e.target.value;

  setForm((f) => {
    if (f.tipoPago !== "mixto") {
      return { ...f, tarjeta: value };
    }

    if (value === "") {
      return { ...f, tarjeta: "", efectivo: "" };
    }

    let tarjeta = Number(value);
    const total = Number(totalFinalUI || 0);

    if (!Number.isFinite(tarjeta)) tarjeta = 0;
    if (tarjeta < 0) tarjeta = 0;
    if (tarjeta > total) tarjeta = total;

    const efectivo = Number((total - tarjeta).toFixed(2));

    return {
      ...f,
      tarjeta: String(tarjeta),
      efectivo: String(efectivo),
    };
  });
}

  async function onSubmit(e) {
    e.preventDefault();
    setMessage("", "");

    if (carrito.length === 0) {
      setMessage("error", "Agrega al menos 1 producto al carrito.");
      return;
    }

    if (
  !form.esCotizacion &&
  !esCotizacionPedido &&
  form.categoria === "publico" &&
  !["efectivo", "a_cuenta"].includes(form.tipoPago)
) {
  setMessage("error", "Venta al público solo acepta efectivo o a cuenta.");
  return;
}

    const sumaMixto = Number((efectivoNum + tarjetaNum).toFixed(2));
const totalEsperado = Number(Number(totalFinalUI).toFixed(2));

if (isMixto) {
  if (efectivoNum < 0 || tarjetaNum < 0) {
    setMessage("error", "En pago mixto no se permiten cantidades negativas.");
    return;
  }

  if (sumaMixto !== totalEsperado) {
    setMessage(
      "error",
      "En pago mixto: efectivo + tarjeta debe ser igual al total."
    );
    return;
  }
}

    const items = carrito.map((it) => ({
  producto_id: it.producto_id,
  cantidad: Number(it.cantidad),
  precio_unitario: Number(it.precio_unitario),
}));

const payload = {
  categoria: form.categoria,
  tipoPago: form.tipoPago,
  cliente_id: clienteSeleccionado?.id || null,
  esCotizacionPedido: !!esCotizacionPedido,
  descuentoPct: 0,
  efectivo: isTarjeta ? 0 : Number(form.efectivo || (form.tipoPago === "efectivo" ? totalFinalUI : 0)),
  tarjeta: form.tipoPago === "efectivo" ? 0 : Number(form.tarjeta || (isTarjeta ? totalFinalUI : 0)),
  recibido: Number(form.recibido || 0),
  cambio: Number(cambioNum || 0),
  esCotizacion: form.esCotizacion,
  guardarSaldoFavor,
  abono_inicial: form.tipoPago === "a_cuenta" ? Number(form.efectivo || 0) : 0,
  fecha_vencimiento: form.fecha_vencimiento || null,
  observaciones_credito: form.observaciones_credito || "",
  items,
};
    try {
      setLoading(true);

      const endpoint = editandoVentaId ? `/ventas/${editandoVentaId}` : "/ventas";
const method = editandoVentaId ? "PUT" : "POST";

const data = await apiFetch(endpoint, {
  method,
  headers: authHeaders(),
  body: JSON.stringify(payload),
});
      


      setMessage("success", `✅ ${data?.mensaje || "Guardado"}`);

      setCarrito([]);
      setProductos([]);
      setSugerencias([]);
      setSearch("");
      setForm({
  categoria: "publico",
  tipoPago: "efectivo",
  efectivo: "",
  tarjeta: "",
  recibido: "",
  cambio: "",
  esCotizacion: false,
  esCotizacionPedido: false,
});
setEsCotizacionPedido(false);


      await recargarTodo();
if (view === "productos") {
  await buscarProductos("", "");
}

      if (!payload.esCotizacion && !payload.esCotizacionPedido && data?.data?.id) {
  await verTicket(data.data.id);
}

      return data;
    } catch (err) {
      console.error(err);
      setMessage("error", err.data?.error || err.message || "Error al guardar.");
    } finally {
      setLoading(false);
    }
  }

  async function eliminar(id) {
  if (!isAdmin) return;

  const ok = window.confirm(
    `¿Seguro que deseas eliminar la venta #${id}? Se devolverá stock al inventario.`
  );
  if (!ok) return;

  try {
    setLoading(true);
    await apiFetch(`/ventas/${id}`, { method: "DELETE" });
setMessage("success", "🗑️ Venta eliminada");

await recargarTodo();

if (view === "movimientos") {
  await cargarMovimientos();
}

    // Si luego haces una vista de movimientos, aquí puedes recargarla también
    // await cargarMovimientos();
  } catch (err) {
    console.error(err);
    setMessage("error", err.data?.error || err.message || "No se pudo eliminar.");
  } finally {
    setLoading(false);
  }
}


  // ====== STYLES ======
  const thStyle = {
  textAlign: "left",
  borderBottom: `1px solid ${theme.border}`,
  padding: isMobile ? 8 : 10,
  fontWeight: 800,
  whiteSpace: isMobile ? "normal" : "nowrap",
  color: theme.text,
  background: "#f7fbf9",
  fontSize: isMobile ? 12 : 14,
};
  const pageStyle = {
  minHeight: "100vh",
  background: theme.bg,
  color: theme.text,
  fontFamily: "Arial",
  padding: isMobile ? 10 : 20,
  boxSizing: "border-box",
  overflowX: "hidden",
};

  const cardStyle = {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
  };

  const labelStyle = { display: "block", marginBottom: 10, color: theme.text };

  const inputStyle = {
  display: "block",
  width: "100%",
  marginTop: 6,
  padding: isMobile ? 9 : 10,
  borderRadius: 12,
  border: `1px solid ${theme.border}`,
  background: "#ffffff",
  color: theme.text,
  outline: "none",
  boxSizing: "border-box", // ✅ importantísimo
  minWidth: 0,             // ✅ evita que se desborde
};

  const btn = (variant = "primary") => {
    const base = {
      padding: "10px 12px",
      borderRadius: 12,
      border: `1px solid ${theme.border}`,
      cursor: "pointer",
      fontWeight: 700,
      whiteSpace: "nowrap",
    };

    if (variant === "primary") {
      return {
        ...base,
        background: theme.green,
        border: `1px solid ${theme.green2}`,
        color: "#072012",
      };
    }
    if (variant === "ghost") {
      return { ...base, background: "transparent", color: theme.text };
    }
    if (variant === "danger") {
      return {
        ...base,
        background: "rgba(255,77,77,0.12)",
        border: "1px solid rgba(255,77,77,0.35)",
        color: theme.text,
      };
    }
    return base;
  };

  const tdStyle = {
  borderBottom: `1px solid ${theme.border}`,
  padding: isMobile ? 8 : 10,
  whiteSpace: isMobile ? "normal" : "nowrap",
  color: theme.text,
  fontSize: isMobile ? 12 : 14,
  verticalAlign: "top",
};
  const badge = (type) => {
    const base = {
      marginTop: 12,
      padding: 10,
      borderRadius: 12,
      border: `1px solid ${theme.border}`,
      background: "#f7fbf9",
      color: theme.text,
      fontWeight: 600,
    };
    if (type === "error")
      return {
        ...base,
        border: "1px solid rgba(255,77,77,0.35)",
        background: "rgba(255,77,77,0.08)",
      };
    if (type === "success")
      return {
        ...base,
        border: `1px solid ${theme.green2}`,
        background: "rgba(23,201,100,0.10)",
      };
    return base;
  };

  // ====== UI ======
  if (!token) {
    return (
      <div style={{ ...pageStyle, display: "grid", placeItems: "center" }}>
        <div style={{ ...cardStyle, width: 360, padding: 18 }}>
          <h2 style={{ marginTop: 0, marginBottom: 6 }}>Vivero Abidan 🌱</h2>
          <p style={{ marginTop: 0, color: theme.muted }}>Inicia sesión</p>

          <form onSubmit={onLoginSubmit}>
            <label style={labelStyle}>
              Usuario:
              <input
                name="usuario"
                value={loginForm.usuario}
                onChange={onLoginChange}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Contraseña:
              <input
                name="password"
                type="password"
                value={loginForm.password}
                onChange={onLoginChange}
                style={inputStyle}
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...btn("primary"),
                width: "100%",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            {msg.text && <div style={badge(msg.type)}>{msg.text}</div>}
          </form>

          <div style={{ marginTop: 12, color: theme.muted, fontSize: 12 }}>
            * Si es la primera vez, crea el usuario admin en Postman con{" "}
            <b>/api/auth/register</b>.
          </div>
        </div>
      </div>
    );
  }

  return (
    
      <div style={pageStyle}>
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
         <div
  style={{
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    minWidth: 0,
  }}
>
            <button
              onClick={() => setDrawerOpen(true)}
              style={btn("ghost")}
              title="Menú"
            >
              ☰
            </button>

            <div>
              <h1 style={{ marginBottom: 6 }}>Vivero Abidan 🌱</h1>
              <p style={{ marginTop: 0, color: theme.muted }}>
                Sesión: <b>{user?.usuario}</b> · Rol: <b>{user?.rol}</b>
              </p>
            </div>
          </div>

          <button
  onClick={logout}
  style={{ ...btn("ghost"), width: isMobile ? "100%" : "auto" }}
>
  Cerrar sesión
</button>
        </div>

        {/* RESUMEN (solo admin) */}
        {isAdmin && (
          <div
  style={{
    display: "grid",
    gap: 12,
    gridTemplateColumns: isMobile
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(auto-fit, minmax(170px, 1fr))",
    marginBottom: 16,
  }}
>
            <Card
              title="Ventas hoy"
              value={resumen ? resumen.ventasHoy : "—"}
              cardStyle={cardStyle}
              theme={theme}
            />
            <Card
              title="Total hoy"
              value={resumen ? money(resumen.totalHoy) : "—"}
              cardStyle={cardStyle}
              theme={theme}
            />
            <Card
              title="Ventas totales"
              value={resumen ? resumen.ventasTotales : "—"}
              cardStyle={cardStyle}
              theme={theme}
            />
            <Card
              title="Total general"
              value={resumen ? money(resumen.totalGeneral) : "—"}
              cardStyle={cardStyle}
              theme={theme}
            />
          </div>
        )}
        

        {/* ===== VISTAS ===== */}
{view === "ventas" && (
  <div
  style={{
    display: "flex",
    gap: 20,
    flexWrap: "wrap",
    alignItems: "flex-start",
  }}
>
    {/* FORM */}
<div
  style={{
    ...cardStyle,
    padding: 16,
    flex: "1 1 360px",
    width: "100%",
    minWidth: 0,
    maxWidth: isMobile ? "100%" : 560,
    boxSizing: "border-box",
    order: isMobile ? 1 : 2,
  }}

>
      <h2 style={{ marginTop: 0 }}>
  {editandoVentaId
    ? esCotizacionPedido
      ? `Editar cotización de pedido #${editandoVentaId}`
      : form.esCotizacion
      ? `Editar cotización #${editandoVentaId}`
      : `Editar venta #${editandoVentaId}`
    : esCotizacionPedido
    ? "Registrar cotización de pedido"
    : form.esCotizacion
    ? "Registrar cotización"
    : "Registrar venta"}
</h2>
      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
  <button
    type="button"
    style={{ ...btn("primary"), padding: "8px 12px", fontSize: 13, width: "auto" }}
    onClick={async () => {
      await nuevaVentaBorrador();
      await cargarBorradores();
      setMostrarBorradores(true);
    }}
  >
    + Nueva venta
  </button>

  <button
    type="button"
    style={{ ...btn("ghost"), padding: "8px 12px", fontSize: 13, width: "auto" }}
    onClick={async () => {
      if (!mostrarBorradores) {
        await cargarBorradores();
      }
      setMostrarBorradores((v) => !v);
    }}
  >
    {mostrarBorradores ? "Ocultar borradores" : "Ver borradores"}
  </button>

  {borradorActivo && (
    <div style={{ alignSelf: "center", fontSize: 12, opacity: 0.8 }}>
      Borrador activo: #{borradorActivo}
    </div>
  )}
</div>
{mostrarBorradores && (
  <div
    style={{
      ...cardStyle,
      padding: 10,
      marginBottom: 12,
      boxShadow: "none",
      border: `1px dashed ${theme.border}`,
      maxHeight: 220,
      overflowY: "auto",
    }}
  >
    <div style={{ fontWeight: 800, marginBottom: 8 }}>Borradores</div>

    {borradores.length === 0 ? (
      <div style={{ color: theme.muted, fontSize: 13 }}>
        No hay borradores.
      </div>
    ) : (
      borradores.map((b) => (
        <div
          key={b.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            padding: "8px 0",
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <div style={{ fontSize: 13 }}>
            <div>
              <b>#{b.id}</b> · {b.categoria || "sin categoría"}
            </div>
            <div style={{ color: theme.muted, fontSize: 12 }}>
              {b.created_at ? new Date(b.created_at).toLocaleString() : ""}
            </div>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
  <button
    type="button"
    style={btn("ghost")}
    onClick={() => {
      setBorradorActivo(b.id);
      setMessage("success", `✅ Borrador #${b.id} seleccionado`);
    }}
  >
    Usar
  </button>

  <button
    type="button"
    style={btn("danger")}
    onClick={() => eliminarBorrador(b.id)}
  >
    Eliminar
  </button>
</div>
        </div>
      ))
    )}
  </div>
)}
<div style={{ position: "relative", marginBottom: 10 }}>
  <label style={labelStyle}>
    Cliente (opcional):
    <div style={{ display: "flex", gap: 8 }}>
      <input
        type="text"
        value={clienteSearch}
        onChange={(e) => {
          const v = e.target.value;
          setClienteSearch(v);

          // si escribe algo nuevo, quitamos selección previa
          if (clienteSeleccionado) setClienteSeleccionado(null);

          buscarClientesVenta(v);
        }}
        onFocus={() => {
          if (clienteSug.length) setShowClienteSug(true)
        }}
        onBlur={() => {
          setTimeout(() => setShowClienteSug(false), 150);
        }}
        placeholder="Buscar cliente por nombre, teléfono o email..."
        autoComplete="off"
        style={inputStyle}
      />

      <button
        type="button"
        onClick={limpiarClienteVenta}
        style={btn("ghost")}
        title="Quitar cliente"
      >
        ✕
      </button>
    </div>
  </label>

  {clienteSeleccionado && (
    <div style={{ marginTop: 6, fontSize: 12, color: theme.muted }}>
      Cliente seleccionado: <b>{clienteSeleccionado.nombre}</b> · Categoría:{" "}
      <b>{clienteSeleccionado.categoria_cliente || "publico"}</b>
    </div>
  )}

  {showClienteSug && (
    <div
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        marginTop: 6,
        background: "#fff",
        border: `1px solid ${theme.border}`,
        borderRadius: 10,
        boxShadow: "0 8px 18px rgba(0,0,0,0.08)",
        maxHeight: 240,
        overflowY: "auto",
        zIndex: 60,
      }}
    >
      {clienteLoading ? (
        <div style={{ padding: 10, fontSize: 13 }}>Buscando...</div>
      ) : clienteSug.length === 0 ? (
        <div style={{ padding: 10, fontSize: 13, color: theme.muted }}>
          Sin resultados
        </div>
      ) : (
        clienteSug.map((c) => (
          <button
            key={c.id}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => seleccionarClienteVenta(c)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "10px 12px",
              border: "none",
              borderBottom: "1px solid #edf2ef",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 700 }}>{c.nombre}</div>
            <div style={{ fontSize: 12, color: theme.muted }}>
              {c.telefono || "-"} · {c.email || "-"} · cat: {c.categoria_cliente || "publico"}
            </div>
          </button>
        ))
      )}
    </div>
  )}
</div>

      <form onSubmit={onSubmit}>
        <label style={labelStyle}>
  Categoría:
  <select
    name="categoria"
    value={form.categoria}
    onChange={onChange}
    style={inputStyle}
    disabled={!!clienteSeleccionado}
  >
    <option value="publico">Público</option>
<option value="mayoreo">Mayoreo</option>
<option value="vivero">Vivero</option>
<option value="especial">Precio especial</option>
  </select>

  {clienteSeleccionado && (
    <div style={{ marginTop: 6, fontSize: 12, color: theme.muted }}>
      La categoría se tomó del cliente seleccionado.
    </div>
  )}
</label>

        {/* CARRITO */}
        <div
          style={{
            ...cardStyle,
            padding: 12,
            marginBottom: 10,
            boxShadow: "none",
          }}
        >
          <div
            style={{
              fontWeight: 900,
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>🛒 Carrito</span>
            <span style={{ color: theme.green2 }}>{money(totalCarrito)}</span>
          </div>

          <div style={{ position: "relative", marginBottom: 10 }}>
  <div style={{ display: "flex", gap: 8 }}>
    <input
      type="text"
      value={busqueda}
      onChange={onChangeBusqueda}
      onFocus={() => {
        if (sugerencias.length) setShowSugerencias(true);
      }}
      onBlur={() => {
        // pequeño delay para permitir click en sugerencia
        setTimeout(() => setShowSugerencias(false), 150);
      }}
      placeholder="Escribe para buscar (ej. C, CH, CHI...)"
      autoComplete="off"
      style={{
        flex: 1,
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #cfd8d3",
        outline: "none",
      }}
    />

    <button
      type="button"
      onClick={() => buscarSugerenciasProductos(busqueda)}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid #0ea75a",
        background: "#17c964",
        color: "#fff",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      Buscar
    </button>
  </div>
  

  {showSugerencias && (
    <div
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        marginTop: 6,
        background: "#fff",
        border: "1px solid #d7e3de",
        borderRadius: 10,
        boxShadow: "0 8px 18px rgba(0,0,0,0.08)",
        maxHeight: 260,
        overflowY: "auto",
        zIndex: 50,
      }}
    >
      {loadingSugerencias ? (
        <div style={{ padding: 10, fontSize: 13 }}>Buscando...</div>
      ) : sugerencias.length === 0 ? (
        <div style={{ padding: 10, fontSize: 13, color: "#5b6f67" }}>
          Sin resultados
        </div>
      ) : (
        sugerencias.map((p) => (
          <button
  key={p.id}
  type="button"
  onMouseDown={(e) => e.preventDefault()} // evita que el blur cierre antes del click
  onClick={() => seleccionarSugerencia(p)}
  style={{
    width: "100%",
    textAlign: "left",
    padding: "10px 12px",
    border: "none",
    borderBottom: "1px solid #edf2ef",
    background: "#fff",
    cursor: "pointer",
  }}
>
  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
    {/* Imagen */}
    {p.imagen_url ? (
      <img
        src={`${API_URL.replace("/api", "")}${p.imagen_url}`}
        alt={p.nombre}
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          objectFit: "cover",
          border: "1px solid #d7e3de",
          flex: "0 0 auto",
        }}
      />
    ) : (
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          border: "1px solid #d7e3de",
          background: "#f7fbf9",
          display: "grid",
          placeItems: "center",
          color: "#8aa39a",
          fontSize: 10,
          flex: "0 0 auto",
        }}
      >
        Sin foto
      </div>
    )}

    {/* Texto */}
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontWeight: 800,
          fontSize: 13,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {p.nombre}
      </div>
      <div style={{ fontSize: 12, color: "#5b6f67" }}>
        {p.codigo_cat || p.codigo} • {money(p.precio_publico ?? p.precio ?? 0)}
      </div>
    </div>
  </div>
</button>
        ))
      )}
    </div>
  )}
</div>
          <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
  <label style={{ fontSize: 13, fontWeight: 600 }}>
    Escanear código de barras
  </label>

  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
  <input
    type="text"
    value={codigoScan}
    onChange={(e) => setCodigoScan(e.target.value)}
    onKeyDown={onScanKeyDown}
    placeholder="Escanea o escribe código (ej. SIN-00001)"
    autoComplete="off"
    style={{
      flex: 1,
      minWidth: 220,
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid #cfd8d3",
      outline: "none",
    }}
  />

  <button
    type="button"
    onClick={() => buscarProductoPorCodigo(codigoScan)}
    disabled={scanLoading}
    style={{
      padding: "10px 14px",
      borderRadius: 10,
      border: "1px solid #0ea75a",
      background: scanLoading ? "#b7e7cb" : "#17c964",
      color: "#fff",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    {scanLoading ? "Buscando..." : "Agregar"}
  </button>

  <button
    type="button"
    onClick={abrirCamaraEscaner}
    style={{
      padding: "10px 14px",
      borderRadius: 10,
      border: "1px solid #0b6bff",
      background: "#1f7aff",
      color: "#fff",
      fontWeight: 700,
      cursor: "pointer",
    }}
    title="Usar cámara del teléfono o tableta"
  >
    📷 Escanear con cámara
  </button>
</div>

  <small style={{ color: "#5b6f67" }}>
    Funciona con lector USB (como teclado) o con celular si escribe el código aquí.
  </small>
</div>

          {carrito.length > 0 ? (
            <div style={{ marginTop: 10 }}>
              {carrito.map((it) => (
                <div
                  key={it.producto_id ?? it._rowId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 0",
                  }}
                >
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <b>{it.codigo}</b> — {it.nombre}
                    <div style={{ color: theme.muted }}>
                      {money(it.precio_unitario)}
                    </div>
                  </div>

                  <input
                    type="number"
                    min="0"
                    value={it.cantidad}
                    onChange={(e) =>
                      cambiarCantidad(it.producto_id ?? it._rowId, e.target.value)
                    }
                    onBlur={() => {
                      setCarrito((prev) =>
                        prev.map((x) =>
                          (x.producto_id ?? x._rowId) === (it.producto_id ?? it._rowId)
                            ? {
                                ...x,
                                cantidad: x.cantidad === "" ? 1 : x.cantidad,
                              }
                            : x
                        )
                      );
                    }}
                    style={{ ...inputStyle, marginTop: 0, padding: 8, width: 80 }}
                  />

                  <button
                    type="button"
                    onClick={() => quitarDelCarrito(it.producto_id ?? it._rowId)}
                    style={btn("danger")}
                  >
                    ✖
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 10, color: theme.muted, fontSize: 13 }}>
              Carrito vacío.
            </div>
          )}
        </div>

        <label style={labelStyle}>
          Tipo de pago:
          <select
  name="tipoPago"
  value={form.tipoPago}
  onChange={onChangeTipoPago}
  style={inputStyle}
>
  <option value="efectivo">Efectivo</option>
  <option value="tarjeta_credito">Tarjeta (Crédito)</option>
  <option value="tarjeta_debito">Tarjeta (Débito)</option>
  <option value="transferencia">Transferencia</option>
  <option value="cheque">Cheque</option>
  <option value="mixto">Mixto</option>
  <option value="a_cuenta">A cuenta</option>
</select>
        </label>
        {form.tipoPago === "a_cuenta" && (
  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
    <label style={labelStyle}>
      Fecha de vencimiento:
      <input
        type="date"
        name="fecha_vencimiento"
        value={form.fecha_vencimiento}
        onChange={onChange}
        style={inputStyle}
      />
    </label>

    <label style={labelStyle}>
      Observaciones de crédito:
      <input
        type="text"
        name="observaciones_credito"
        value={form.observaciones_credito}
        onChange={onChange}
        placeholder="Notas del crédito"
        style={inputStyle}
      />
    </label>
  </div>
)}

        <label style={labelStyle}>
          Efectivo:
          <input
            name="efectivo"
            value={form.efectivo}
            onChange={onChangeMixtoEfectivo}
            type="number"
            step="0.01"
            style={inputStyle}
            disabled={
              isTarjeta ||
              form.tipoPago === "transferencia" ||
              form.tipoPago === "cheque"
            }
          />
        </label>

        <label style={labelStyle}>
          Tarjeta:
          <input
            name="tarjeta"
            value={form.tarjeta}
            onChange={onChangeMixtoTarjeta}
            type="number"
            step="0.01"
            style={inputStyle}
            disabled={
              form.tipoPago === "efectivo" ||
              form.tipoPago === "transferencia" ||
              form.tipoPago === "cheque"
            }
          />
        </label>

        

        {(form.tipoPago === "efectivo" || form.tipoPago === "mixto") && (
          <>
            <label style={labelStyle}>
              Recibido:
              <input
                name="recibido"
                value={form.recibido}
                onChange={onChange}
                type="number"
                step="0.01"
                style={inputStyle}
                placeholder="Ej: 500"
              />
            </label>

            <div style={{ marginTop: 6, color: theme.muted, fontSize: 13 }}>
              Cambio: <b>{money(cambioNum)}</b>
            </div>
          </>
        )}
        {(form.tipoPago === "efectivo") && clienteSeleccionado && cambioNum > 0 && (
  <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
    <input
      type="checkbox"
      checked={guardarSaldoFavor}
      onChange={(e) => setGuardarSaldoFavor(e.target.checked)}
    />
    Guardar cambio como saldo a favor
  </label>
)}

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <input
    type="checkbox"
    checked={form.esCotizacion}
    onChange={(e) => {
      const checked = e.target.checked;
      setForm((f) => ({ ...f, esCotizacion: checked }));
      if (checked) setEsCotizacionPedido(false);
    }}
  />
  Es cotización (no es venta)
</label>

  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <input
      type="checkbox"
      checked={!!esCotizacionPedido}
      onChange={(e) => {
        const checked = e.target.checked;
        setEsCotizacionPedido(checked);
        if (checked) {
          setForm((f) => ({ ...f, esCotizacion: false }));
        }
      }}
    />
    Cotización de pedido
  </label>
</div>

        <button
          type="submit"
          disabled={loading}
          style={{
            ...btn("primary"),
            width: "100%",
            marginTop: 10,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
  ? (editandoVentaId ? "Actualizando..." : "Guardando...")
  : editandoVentaId
  ? "Actualizar ticket"
  : esCotizacionPedido
  ? "Guardar cotización de pedido"
  : form.esCotizacion
  ? "Guardar cotización"
  : "Guardar venta"}
        </button>
        {editandoVentaId && (
  <button
    type="button"
    onClick={cancelarEdicionVenta}
    style={{ ...btn("ghost"), width: "100%", marginTop: 8 }}
  >
    Cancelar edición
  </button>
)}

        {msg.text && <div style={badge(msg.type)}>{msg.text}</div>}
      </form>
    </div>

    {/* TABLA */}
<div
  style={{
    flex: "2 1 700px",
    width: "100%",
    minWidth: 0,
    order: isMobile ? 2 : 1,
  }}
>
      <h2 style={{ marginTop: 0 }}>Ventas</h2>
      <div
  style={{
    ...cardStyle,
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    width: "100%",
  }}
>
        <table
  style={{
    width: "100%",
    minWidth: isMobile ? 950 : 0, // ✅ scroll interno en móvil
    borderCollapse: "collapse",
  }}
>
          <thead>
            <tr>
              {[
                "ID",
                "Categoría",
                "Productos",
                "Total",
                "Descuento",
                "Total Final",
                "Pago",
                "Fecha",
                "Acciones",
              ].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ventas.map((v) => (
              <tr key={v.id}>
                <td style={tdStyle}>{v.id}</td>
                <td style={tdStyle}>{v.categoria}</td>
                <td style={{ ...tdStyle, whiteSpace: "normal", maxWidth: 340 }}>
                  {v.productos_resumen || "—"}
                </td>
                <td style={tdStyle}>{money(v.total)}</td>
                <td style={tdStyle}>{money(v.descuento)}</td>
                <td style={tdStyle}>
                  <b style={{ color: theme.green2 }}>{money(v.total_final)}</b>
                </td>
                <td style={tdStyle}>{v.tipo_pago}</td>
                <td style={tdStyle}>{new Date(v.created_at).toLocaleString()}</td>
                <td style={tdStyle}>
                  <button onClick={() => verTicket(v.id)} style={btn("primary")}>
                    🧾 Ticket
                  </button>
                  {isAdmin && (
  <button
    type="button"
    onClick={() => editarVentaDesdeTabla(v)}
    style={{ ...btn("ghost"), marginLeft: 8 }}
  >
    ✏️ Editar
  </button>
)}
                  {isAdmin && (
                    <button
                      onClick={() => eliminar(v.id)}
                      disabled={loading}
                      style={{
                        ...btn("danger"),
                        marginLeft: 8,
                        opacity: loading ? 0.7 : 1,
                      }}
                    >
                      Eliminar
                    </button>
                    
                  )}
                </td>
              </tr>
            ))}
            

            {ventas.length === 0 && (
              <tr>
                <td style={tdStyle} colSpan={9}>
                  No hay ventas aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}
{view === "reporte" && (
  <div style={{ ...cardStyle, padding: 16 }}>
    <h2 style={{ marginTop: 0 }}>Reporte</h2>
    <div className="no-print" style={{ marginBottom: 12, maxWidth: 320 }}>
  <label style={{ ...labelStyle, marginBottom: 6 }}>
    Tipo de reporte:
    <select
      value={reporteTipo}
      onChange={(e) => setReporteTipo(e.target.value)}
      style={inputStyle}
    >
      <option value="diario">Diario</option>
      <option value="semanal">Semanal</option>
      <option value="mensual">Mensual</option>
      <option value="anual">Anual</option>
    </select>
  </label>
</div>

    {/* ❌ ESTO NO SE IMPRIME */}
    <div className="no-print">
      <div style={{ color: theme.muted, fontSize: 13, marginBottom: 10 }}>
  Corte {reporteTipo}: <b>{new Date().toLocaleString("es-MX")}</b>
</div>

      <button
  type="button"
  onClick={imprimirCorteTicket}
  style={{ ...btn("primary"), marginBottom: 14 }}
>
  Imprimir corte {reporteTipo}
</button>



      {/* ✅ FORMULARIO GASTOS (solo admin) */}
      {isAdmin && (
        <form
          onSubmit={guardarGasto}
          style={{
            marginBottom: 16,
            display: "grid",
            gap: 10,
            maxWidth: 520,
          }}
        >
          <h3 style={{ margin: 0 }}>Agregar gasto</h3>

          <label style={labelStyle}>
            Categoría:
            <select
              value={gastoForm.categoria}
              onChange={(e) =>
                setGastoForm((g) => ({ ...g, categoria: e.target.value }))
              }
              style={inputStyle}
            >
              {categoriasGasto.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          {/* ✅ Agregar nueva categoría */}
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={nuevaCategoriaGasto}
              onChange={(e) => setNuevaCategoriaGasto(e.target.value)}
              placeholder="Nueva categoría (ej: papeleria)"
              style={{ ...inputStyle, marginTop: 0 }}
            />
            <button
              type="button"
              style={btn("ghost")}
              onClick={() => {
                const cat = nuevaCategoriaGasto.trim().toLowerCase();
                if (!cat) return;

                setCategoriasGasto((prev) =>
                  prev.includes(cat) ? prev : [...prev, cat]
                );
                setGastoForm((g) => ({ ...g, categoria: cat }));
                setNuevaCategoriaGasto("");
              }}
            >
              + Agregar
            </button>
          </div>

          <label style={labelStyle}>
            Subcategoría (opcional):
            <input
              value={gastoForm.subcategoria}
              onChange={(e) =>
                setGastoForm((g) => ({ ...g, subcategoria: e.target.value }))
              }
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Monto:
            <input
              value={gastoForm.monto}
              onChange={(e) =>
                setGastoForm((g) => ({ ...g, monto: e.target.value }))
              }
              style={inputStyle}
              type="number"
              step="0.01"
            />
          </label>

          <label style={labelStyle}>
            Método de pago:
            <select
              value={gastoForm.metodo_pago}
              onChange={(e) =>
                setGastoForm((g) => ({ ...g, metodo_pago: e.target.value }))
              }
              style={inputStyle}
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta_credito">Tarjeta crédito</option>
              <option value="tarjeta_debito">Tarjeta débito</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </label>

          <label style={labelStyle}>
            Nota:
            <input
              value={gastoForm.nota}
              onChange={(e) => setGastoForm((g) => ({ ...g, nota: e.target.value }))}
              style={inputStyle}
            />
          </label>

          <button type="submit" style={btn("primary")}>
            Guardar gasto
          </button>
        </form>
      )}
    </div>

    {/* ✅ ESTO SÍ SE IMPRIME */}
    <div id="reporte-print">
      {!reporteData ? (
        <div style={{ color: theme.muted }}>Cargando reporte...</div>
      ) : (
        <>
          <h3>Reporte de pagos</h3>
          {pagosFijos.map((p) => (
            <div
              key={p}
              style={{ display: "flex", justifyContent: "space-between", maxWidth: 420 }}
            >
              <span>{p}</span>
              <b>{money(ventasPagoMap[p] || 0)}</b>
            </div>
          ))}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              maxWidth: 420,
              marginTop: 8,
            }}
          >
            <span>
              <b>Total ventas</b>
            </span>
            <b>{money(reporteData.totalVentas)}</b>
          </div>

          <hr style={{ margin: "14px 0" }} />

          <h3>Gastos</h3>
          {reporteData.gastosPorCategoria.map((g) => (
            <div
              key={g.categoria}
              style={{ display: "flex", justifyContent: "space-between", maxWidth: 420 }}
            >
              <span>{g.categoria}</span>
              <b>{money(g.total)}</b>
            </div>
          ))}

          <hr style={{ margin: "14px 0" }} />

          <h4>Detalle de gastos (subcategoría)</h4>
          {reporteData.gastosPorSub.map((x, i) => (
            <div
              key={i}
              style={{ display: "flex", justifyContent: "space-between", maxWidth: 420 }}
            >
              <span>
                {x.categoria}
                {x.subcategoria ? ` / ${x.subcategoria}` : ""}
              </span>
              <b>{money(x.total)}</b>
            </div>
          ))}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              maxWidth: 420,
              marginTop: 8,
            }}
          >
            <span>
              <b>Total gastos</b>
            </span>
            <b>{money(reporteData.totalGastos)}</b>
          </div>

          <hr style={{ margin: "14px 0" }} />

          <h3>Ventas por categoría</h3>
          {reporteData.ventasPorCategoria.map((c) => (
            <div
              key={c.categoria}
              style={{ display: "flex", justifyContent: "space-between", maxWidth: 420 }}
            >
              <span>
                {c.categoria} ({c.cantidad})
              </span>
              <b>{money(c.total)}</b>
            </div>
          ))}

          <hr style={{ margin: "14px 0" }} />

          <h3>Total en caja (efectivo - gastos efectivo)</h3>
          <div style={{ fontSize: 18 }}>
            <b>{money(reporteData.caja)}</b>
          </div>
        </>
      )}
    </div>
  </div>
)}
{view === "movimientos" && (
  <div style={{ ...cardStyle, padding: 16 }}>
    <h2 style={{ marginTop: 0 }}>Movimientos de inventario</h2>

    {/* ✅ FORMULARIO NUEVO */}
    <form
      onSubmit={guardarMovimiento}
      style={{
        display: "grid",
        gap: 10,
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        marginBottom: 12,
      }}
    >
      <label style={labelStyle}>
        Tipo:
        <select
          value={movForm.tipo}
          onChange={(e) => setMovForm((f) => ({ ...f, tipo: e.target.value }))}
          style={inputStyle}
        >
          <option value="entrada">Entrada (producto llegado)</option>
          <option value="salida">Salida manual</option>
          <option value="ajuste">Ajuste</option>
        </select>
      </label>

      <label style={{ ...labelStyle, position: "relative" }}>
  Producto:
 <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    <input
      value={movProdSearch}
      onChange={(e) => {
        const value = e.target.value;
        setMovProdSearch(value);

        // Si empieza a escribir otra cosa, quitar selección previa
        if (movProdSeleccionado) {
          setMovProdSeleccionado(null);
          setMovForm((f) => ({ ...f, producto_id: "" }));
        }
      }}
      style={inputStyle}
      placeholder="Escribe 3 letras del nombre o código..."
      autoComplete="off"
    />

    <button
      type="button"
      style={btn("ghost")}
      onClick={limpiarProductoMovimiento}
      title="Limpiar producto"
    >
      ✕
    </button>
  </div>

  {/* Mensaje guía */}
  {movProdSearch.trim().length > 0 && movProdSearch.trim().length < 3 && !movProdSeleccionado && (
    <div style={{ marginTop: 6, fontSize: 12, color: theme.muted }}>
      Escribe al menos 3 letras para buscar...
    </div>
  )}

  {/* Producto seleccionado */}
  {movProdSeleccionado && (
  <div style={{ marginTop: 6, fontSize: 12, color: theme.muted }}>
  Seleccionado: <b>{movProdSeleccionado?.codigo_cat || movProdSeleccionado?.codigo}</b> —{" "}
  {movProdSeleccionado?.nombre}
  <br />
  <b>
    Disponible:{" "}
    {movProdSeleccionado && movProdSeleccionado.stock !== undefined && movProdSeleccionado.stock !== null
      ? movProdSeleccionado.stock
      : "N/D"}
  </b>
</div>
)}

  {/* Lista de sugerencias */}
  {(movProdBuscando || movProdSugerencias.length > 0) && !movProdSeleccionado && (
    <div
      style={{
        position: "absolute",
        zIndex: 20,
        left: 0,
        right: 0,
        marginTop: 6,
        background: "#fff",
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        maxHeight: 240,
        overflowY: "auto",
        boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
      }}
    >
      {movProdBuscando && (
        <div style={{ padding: 10, color: theme.muted, fontSize: 13 }}>
          Buscando...
        </div>
      )}

      {!movProdBuscando &&
        movProdSugerencias.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => seleccionarProductoMovimiento(p)}
            style={{
              width: "100%",
              textAlign: "left",
              border: "none",
              background: "transparent",
              padding: 10,
              cursor: "pointer",
              borderBottom: `1px solid ${theme.border}`,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {p.codigo_cat || p.codigo} — {p.nombre}
            </div>
           <div style={{ fontSize: 12, color: theme.muted }}>
  Precio: {money(p.precio)}{" "}
  {typeof p.stock !== "undefined" ? `· Disponible: ${p.stock}` : ""}
</div>
          </button>
        ))}

      {!movProdBuscando &&
        movProdSugerencias.length === 0 &&
        movProdSearch.trim().length >= 3 && (
          <div style={{ padding: 10, color: theme.muted, fontSize: 13 }}>
            Sin resultados.
          </div>
        )}
    </div>
  )}
</label>

      <label style={labelStyle}>
  {movForm.tipo === "ajuste" ? "Nuevo stock:" : "Cantidad:"}
  <input
    type="number"
    min="0"
    step="1"
    value={movForm.cantidad}
    onChange={(e) => setMovForm((f) => ({ ...f, cantidad: e.target.value }))}
    style={inputStyle}
    placeholder={movForm.tipo === "ajuste" ? "Ej: 120" : "Ej: 10"}
  />
</label>
{movProdSeleccionado && (
  <div style={{ marginTop: -4, marginBottom: 4, fontSize: 12, color: theme.muted }}>
    Disponible actual: <b>{Number(movProdSeleccionado.stock || 0)}</b>
  </div>
)}

      <label style={labelStyle}>
        Motivo:
        <input
          value={movForm.motivo}
          onChange={(e) => setMovForm((f) => ({ ...f, motivo: e.target.value }))}
          style={inputStyle}
          placeholder="compra, merma, devolución..."
        />
      </label>

      <label style={labelStyle}>
        Referencia:
        <input
          value={movForm.referencia}
          onChange={(e) => setMovForm((f) => ({ ...f, referencia: e.target.value }))}
          style={inputStyle}
          placeholder="Factura, proveedor, nota..."
        />
      </label>

      <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
        <button type="submit" style={btn("primary")}>
          Guardar movimiento
        </button>

       <button
  type="button"
  style={btn("ghost")}
  onClick={() => {
    setMovForm({
      tipo: "entrada",
      producto_id: "",
      cantidad: "",
      motivo: "compra",
      referencia: "",
    });
    setMovProdSeleccionado(null);
    setMovProdSearch("");
    setMovProdSugerencias([]);
  }}
>
  Limpiar
</button>
      </div>
    </form>
    

    <button
      type="button"
      onClick={cargarMovimientos}
      style={{ ...btn("ghost"), marginBottom: 12 }}
    >
      {movimientosLoading ? "Recargando..." : "Recargar"}
    </button>

    {/* ✅ TABLA DENTRO DEL MISMO BLOQUE */}
    <div style={{ ...cardStyle, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Fecha</th>
            <th style={thStyle}>Tipo</th>
            <th style={thStyle}>Producto</th>
            <th style={thStyle}>Código</th>
            <th style={thStyle}>Cantidad</th>
            <th style={thStyle}>Motivo</th>
            <th style={thStyle}>Referencia</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((m, i) => (
            <tr key={m.id || i}>
              <td style={tdStyle}>
                {m.created_at ? new Date(m.created_at).toLocaleString() : "—"}
              </td>
              <td style={tdStyle}>
                <b>{m.tipo || "—"}</b>
              </td>
              <td style={tdStyle}>{m.producto_nombre || m.nombre || "—"}</td>
              <td style={tdStyle}>{m.codigo || "—"}</td>
              <td style={tdStyle}>{m.cantidad ?? "—"}</td>
              <td style={tdStyle}>{m.motivo || "—"}</td>
              <td style={tdStyle}>
                {m.referencia || (m.venta_id ? `Venta #${m.venta_id}` : "—")}
              </td>
            </tr>
          ))}

          {movimientos.length === 0 && (
            <tr>
              <td style={tdStyle} colSpan={7}>
                {movimientosLoading
                  ? "Cargando movimientos..."
                  : "No hay movimientos registrados."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
)}



{view === "productos" && (
  <div style={{ ...cardStyle, padding: 16 }}>
    <h2 style={{ marginTop: 0 }}>Productos</h2>

    {/* Form crear/editar */}
    <form
  onSubmit={guardarProductoUI}
  style={{ display: "grid", gap: 10, marginBottom: 12 }}
>
  {/* Categoría */}
  <label style={{ ...labelStyle, marginBottom: 0 }}>
    Categoría del NUEVO producto:
    <select
      name="categoria_planta"
      value={prodForm.categoria_planta}
      onChange={onProdChange}
      style={{ ...inputStyle, maxWidth: 260 }}
    >
      {CATEGORIAS_PLANTA.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  </label>

  {/* Nombre */}
  <input
    name="nombre"
    value={prodForm.nombre}
    onChange={onProdChange}
    placeholder="Nombre"
    style={inputStyle}
  />

  {/* Precios (con etiqueta abajo) */}
  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
    <div style={{ display: "grid", gap: 4 }}>
      <input
        name="precio_publico"
        value={prodForm.precio_publico}
        onChange={onProdChange}
        type="number"
        step="0.01"
        placeholder="0.00"
        style={{ ...inputStyle, minWidth: 140, marginTop: 0 }}
      />
      <div style={{ fontSize: 12, color: theme.muted, textAlign: "center" }}>Público</div>
    </div>

    <div style={{ display: "grid", gap: 4 }}>
      <input
        name="precio_mayoreo"
        value={prodForm.precio_mayoreo}
        onChange={onProdChange}
        type="number"
        step="0.01"
        placeholder="0.00"
        style={{ ...inputStyle, minWidth: 140, marginTop: 0 }}
      />
      <div style={{ fontSize: 12, color: theme.muted, textAlign: "center" }}>Mayoreo</div>
    </div>

    <div style={{ display: "grid", gap: 4 }}>
      <input
        name="precio_vivero"
        value={prodForm.precio_vivero}
        onChange={onProdChange}
        type="number"
        step="0.01"
        placeholder="0.00"
        style={{ ...inputStyle, minWidth: 140, marginTop: 0 }}
      />
      <div style={{ fontSize: 12, color: theme.muted, textAlign: "center" }}>Vivero</div>
    </div>

    <div style={{ display: "grid", gap: 4 }}>
      <input
        name="precio_especial"
        value={prodForm.precio_especial}
        onChange={onProdChange}
        type="number"
        step="0.01"
        placeholder="0.00"
        style={{ ...inputStyle, minWidth: 140, marginTop: 0 }}
      />
      <div style={{ fontSize: 12, color: theme.muted, textAlign: "center" }}>Especial</div>
    </div>

    <div style={{ display: "grid", gap: 4 }}>
      <input
        name="costo"
        value={prodForm.costo}
        onChange={onProdChange}
        type="number"
        step="0.01"
        placeholder="0.00"
        style={{ ...inputStyle, minWidth: 160, marginTop: 0 }}
      />
      <div style={{ fontSize: 12, color: theme.muted, textAlign: "center" }}>Costo (llegada)</div>
    </div>
  </div>

  {/* Imagen */}
  <input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  onChange={(e) => {
    const file = e.target.files?.[0] || null;
    setImagenProducto(file);

    if (previewImagen) {
      URL.revokeObjectURL(previewImagen);
    }

    setPreviewImagen(file ? URL.createObjectURL(file) : "");
  }}
/>

  {previewImagen && (
    <img
      src={previewImagen}
      alt="Vista previa"
      style={{
        width: 90,
        height: 90,
        objectFit: "cover",
        borderRadius: 8,
        border: "1px solid #d7e3de",
      }}
    />
  )}

  {/* Botones */}
  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
    <button
      type="submit"
      disabled={prodSaving}
      style={{ ...btn("primary"), opacity: prodSaving ? 0.7 : 1 }}
    >
      {prodForm.id ? "Guardar cambios" : "Crear"}
    </button>

    {prodForm.id && (
  <button
    type="button"
    onClick={() => {
      limpiarProductoUI();
      setImagenProducto(null);

      if (previewImagen) {
        URL.revokeObjectURL(previewImagen);
      }
      setPreviewImagen("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }}
    style={btn("ghost")}
  >
    Cancelar
  </button>
)}
  </div>
</form>

    {/* Filtro para la tabla */}
    <label style={{ ...labelStyle, marginBottom: 0 }}>
      Filtrar tabla por categoría:
      <select
        value={catProd}
        onChange={(e) => setCatProd(e.target.value)}
        style={{ ...inputStyle, maxWidth: 220 }}
      >
        <option value="">Todas</option>
        {CATEGORIAS_PLANTA.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>

    <input
      value={qProd}
      onChange={(e) => setQProd(e.target.value)}
      placeholder="Buscar por código o nombre..."
      style={{ ...inputStyle, minWidth: 260, marginBottom: 12 }}
    />

    <button
      type="button"
      onClick={() => {
        setQProd("");
        setCatProd("");
      }}
      style={btn("ghost")}
    >
      Limpiar
    </button>

    <div
      style={{
        overflowX: "auto",
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        marginTop: 12,
      }}
    >
      <table
  style={{
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed", // ✅ evita que se rompa el diseño
  }}
>
  <thead>
    <tr>
      <th style={{ ...thStyle, width: 70 }}>ID</th>
      <th style={{ ...thStyle, width: 150 }}>Código</th>
      <th style={{ ...thStyle, width: 110, textAlign: "center" }}>Imagen</th>
      <th style={thStyle}>Nombre</th>
      <th style={{ ...thStyle, width: 140 }}>Precio</th>
      <th style={{ ...thStyle, width: 190 }}>Acciones</th>
    </tr>
  </thead>

  <tbody>
    {productosFiltrados.map((p) => (
      <tr key={p.id}>
        <td style={tdStyle}>{p.id}</td>

        <td style={{ ...tdStyle, fontWeight: 700 }}>
          {p.codigo_cat || p.codigo || "—"}
        </td>

        <td style={{ ...tdStyle, textAlign: "center" }}>
          {p.imagen_url ? (
            <img
              src={`${API_URL.replace("/api", "")}${p.imagen_url}`}
              alt={p.nombre}
              style={{
                width: 56,
                height: 56,
                objectFit: "cover",
                borderRadius: 8,
                border: "1px solid #d7e3de",
                display: "inline-block",
                verticalAlign: "middle",
              }}
            />
          ) : (
            <span style={{ color: "#888", fontSize: 13 }}>Sin foto</span>
          )}
        </td>

        <td
          style={{
            ...tdStyle,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={p.nombre}
        >
          {p.nombre}
        </td>

        <td style={tdStyle}>{money(p.precio_publico ?? p.precio)}</td>

        <td style={tdStyle}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
  type="button"
  style={btn("ghost")}
  onClick={() => editarProductoUI(p)}
>
  Editar
</button>

            <button
              type="button"
              style={btn("danger")}
              onClick={() => eliminarProductoUI(p.id)}
              disabled={prodSaving}
            >
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    ))}

    {productosFiltrados.length === 0 && (
      <tr>
        <td style={tdStyle} colSpan={6}>
          No hay productos.
        </td>
      </tr>
    )}
  </tbody>
</table>
    </div>
  </div>
)}

{view === "reporte_productos" && (
  <div style={{ ...cardStyle, padding: 16 }}>
    <ReporteProductos token={token} />
  </div>
)}

{view === "clientes" && (
  <div style={{ ...cardStyle, padding: 16 }}>
    <Clientes />
  </div>
  
)}



      

      {/* MODAL DEL TICKET */}
      {showTicket && ticketData && typeof TicketModal === "function" ? (
        <TicketModal
  data={ticketData}
  recibido={ticketData?.venta?.recibido ?? 0}
  cambio={ticketData?.venta?.cambio ?? 0}
  onClose={() => {
    setShowTicket(false);
    setTicketData(null);
  }}
/>



      ) : null}

      {cameraOpen && (
  <div
    onClick={cerrarCamaraEscaner}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.75)",
      zIndex: 2000,
      display: "grid",
      placeItems: "center",
      padding: 12,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        maxWidth: 520,
        background: "#fff",
        borderRadius: 14,
        padding: 12,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <b>Escanear código con cámara</b>
        <button type="button" onClick={cerrarCamaraEscaner} style={btn("ghost")}>
          ✖
        </button>
      </div>

      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        style={{
          width: "100%",
          borderRadius: 10,
          background: "#000",
          minHeight: 220,
          objectFit: "cover",
        }}
      />

      <div style={{ marginTop: 8, fontSize: 13, color: theme.muted }}>
        Apunta al código de barras. Se agregará automáticamente al detectarlo.
      </div>

      {cameraError && (
        <div style={{ ...badge("error"), marginTop: 8 }}>
          {cameraError}
        </div>
      )}
    </div>
  </div>
)}
{view === "usuarios" && (
  <div style={{ ...cardStyle, padding: 16, maxWidth: 700 }}>
    <h2 style={{ marginTop: 0 }}>Usuarios</h2>

    {!isAdmin ? (
      <div style={badge("error")}>Solo un administrador puede crear usuarios.</div>
    ) : (
      <>
        <div style={{ color: theme.muted, fontSize: 13, marginBottom: 12 }}>
          Desde aquí puedes crear <b>vendedores</b> o <b>administradores</b>.
        </div>

        <form
          onSubmit={onCreateUserSubmit}
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            alignItems: "end",
          }}
        >
          <label style={labelStyle}>
            Nombre (opcional):
            <input
              name="nombre"
              value={userForm.nombre}
              onChange={onUserFormChange}
              style={inputStyle}
              placeholder="Ej: Luis vendedor"
            />
          </label>

          <label style={labelStyle}>
            Usuario:
            <input
              name="usuario"
              value={userForm.usuario}
              onChange={onUserFormChange}
              style={inputStyle}
              placeholder="Ej: luis"
              required
            />
          </label>

          <label style={labelStyle}>
            Contraseña:
            <input
              name="password"
              type="password"
              value={userForm.password}
              onChange={onUserFormChange}
              style={inputStyle}
              placeholder="Mínimo recomendado 6 caracteres"
              required
            />
          </label>

          <label style={labelStyle}>
            Rol:
            <select
              name="rol"
              value={userForm.rol}
              onChange={onUserFormChange}
              style={inputStyle}
            >
              <option value="vendedor">Vendedor</option>
              <option value="admin">Administrador</option>
            </select>
          </label>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={userSaving}
              style={{
                ...btn("primary"),
                opacity: userSaving ? 0.7 : 1,
              }}
            >
              {userSaving ? "Guardando..." : "Crear usuario"}
            </button>

            <button
              type="button"
              style={btn("ghost")}
              onClick={() =>
                setUserForm({
                  nombre: "",
                  usuario: "",
                  password: "",
                  rol: "vendedor",
                })
              }
            >
              Limpiar
            </button>
          </div>
        </form>

        {msg.text && <div style={badge(msg.type)}>{msg.text}</div>}
      </>
    )}
  </div>
)}
{view === "codigos_barras" && (
  <div style={{ ...cardStyle, padding: 16 }}>
    <h2 style={{ marginTop: 0 }}>Generar códigos de barras</h2>

    <div style={{ color: theme.muted, fontSize: 13, marginBottom: 10 }}>
      Busca productos, agrégalos a la lista y luego imprime las etiquetas.
    </div>

    {/* Buscador */}
    <div style={{ position: "relative", marginBottom: 14 }}>
      <input
  value={barcodeSearch}
  onChange={(e) => {
    setBarcodeSearch(e.target.value);
    setShowBarcodeResultados(true);
  }}
  onFocus={() => {
    if (barcodeSearch.trim().length >= 2) setShowBarcodeResultados(true);
  }}
  onBlur={() => {
    // pequeño delay para permitir click en una opción
    setTimeout(() => setShowBarcodeResultados(false), 150);
  }}
  placeholder="Buscar por código o nombre (mínimo 2 letras)..."
  style={inputStyle}
/>

      {showBarcodeResultados && barcodeSearch.trim().length >= 2 && (
        <div
          style={{
            position: "absolute",
            zIndex: 20,
            left: 0,
            right: 0,
            marginTop: 6,
            background: "#fff",
            border: `1px solid ${theme.border}`,
            borderRadius: 12,
            maxHeight: 260,
            overflowY: "auto",
            boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
          }}
        >
          {barcodeLoading ? (
            <div style={{ padding: 10, color: theme.muted, fontSize: 13 }}>
              Buscando...
            </div>
          ) : barcodeResultados.length === 0 ? (
            <div style={{ padding: 10, color: theme.muted, fontSize: 13 }}>
              Sin resultados.
            </div>
          ) : (
            barcodeResultados.map((p) => (
              <button
  key={p.id}
  type="button"
  onMouseDown={(e) => e.preventDefault()} // ✅ evita que blur cierre antes del click
  onClick={() => agregarProductoBarcode(p)}
  style={{
    width: "100%",
    textAlign: "left",
    border: "none",
    background: "transparent",
    padding: 10,
    cursor: "pointer",
    borderBottom: `1px solid ${theme.border}`,
  }}
>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {p.codigo_cat || p.codigo} — {p.nombre}
                </div>
                <div style={{ fontSize: 12, color: theme.muted }}>
                  Precio: {money(p.precio)}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>

    {/* Acciones */}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      <button
        type="button"
        style={btn("primary")}
        onClick={() => window.print()}
        disabled={barcodeSeleccionados.length === 0}
      >
        🖨️ Imprimir etiquetas
      </button>

      <button
        type="button"
        style={btn("ghost")}
        onClick={limpiarBarcodeSeleccionados}
        disabled={barcodeSeleccionados.length === 0}
      >
        Limpiar lista
      </button>
    </div>

    {/* Lista editable */}
    <div style={{ ...cardStyle, padding: 12, marginBottom: 12, boxShadow: "none" }}>
      <h3 style={{ marginTop: 0 }}>Productos seleccionados</h3>

      {barcodeSeleccionados.length === 0 ? (
        <div style={{ color: theme.muted, fontSize: 13 }}>
          No has agregado productos.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {barcodeSeleccionados.map((p) => (
            <div
              key={p.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 90px auto",
                gap: 8,
                alignItems: "center",
                borderBottom: `1px solid ${theme.border}`,
                paddingBottom: 8,
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>
                  {p.codigo} — {p.nombre}
                </div>
                <div style={{ color: theme.muted, fontSize: 12 }}>
                  {money(p.precio)}
                </div>
              </div>

              <input
                type="number"
                min="1"
                step="1"
                value={p.copias}
                onChange={(e) => cambiarCopiasBarcode(p.id, e.target.value)}
                onBlur={() => {
                  setBarcodeSeleccionados((prev) =>
                    prev.map((x) =>
                      x.id === p.id ? { ...x, copias: x.copias === "" ? 1 : x.copias } : x
                    )
                  );
                }}
                style={{ ...inputStyle, marginTop: 0, width: 90 }}
                title="Copias"
              />

              <button
                type="button"
                style={btn("danger")}
                onClick={() => quitarProductoBarcode(p.id)}
              >
                ✖
              </button>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Área de impresión */}
    <div id="print-barcodes">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #print-barcodes, #print-barcodes * {
              visibility: visible;
            }
            #print-barcodes {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white;
              padding: 8px;
            }
          }
        `}
      </style>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {barcodeSeleccionados.flatMap((p) => {
          const copias = Math.max(1, Number(p.copias || 1));
          return Array.from({ length: copias }).map((_, idx) => (
            <div
              key={`${p.id}-${idx}`}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 8,
                background: "#fff",
                minHeight: 110,
                display: "grid",
                alignContent: "space-between",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.1 }}>
                {p.nombre}
              </div>

              <div style={{ textAlign: "center", margin: "6px 0" }}>
                <img
                  src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(
                    p.codigo
                  )}&code=Code128&dpi=96`}
                  alt={`Código ${p.codigo}`}
                  style={{ maxWidth: "100%", height: 42, objectFit: "contain" }}
                />
                <div style={{ fontSize: 11, marginTop: 2 }}>{p.codigo}</div>
              </div>

              <div style={{ textAlign: "right", fontWeight: 900, fontSize: 13 }}>
                {money(p.precio)}
              </div>
            </div>
          ));
        })}
      </div>
    </div>
  </div>
)}

            {/* DRAWER */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        theme={theme}
        cardStyle={cardStyle}
        isAdmin={isAdmin}
        setView={setView}
        setReporteTipo={setReporteTipo}
        btn={btn}
      />

    </div> 

          

  );
}


function Card({ title, value, cardStyle, theme }) {
  return (
    <div style={{ ...cardStyle, padding: 12, minWidth: 0, width: "100%" }}>
      <div style={{ color: theme.muted, fontSize: 13, fontWeight: 700 }}>
        {title}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}
