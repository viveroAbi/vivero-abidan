// src/components/TicketModal.jsx
export default function TicketModal({ data, onClose, recibido = 0, cambio = 0 }) {

  // data esperado:
  // {
  //   venta: { id, created_at, total, descuento, total_final, es_cotizacion, ... },
  //   items: [{ cantidad, codigo, nombre, precio_unitario, importe? }],
  //   pago?: "efectivo" | "tarjeta_credito" | "tarjeta_debito" | "transferencia" | "cheque"
  // }

  const venta = data?.venta || {};
  console.log("TICKET DATA:", data);
console.log("VENTA EN TICKET:", venta);
console.log("es_cotizacion_pedido:", venta.es_cotizacion_pedido);
console.log("es_cotizacion:", venta.es_cotizacion);
  const items = Array.isArray(data?.items) ? data.items : [];

  function imprimirSoloTicket() {
  const ticket = document.getElementById("ticket");
  if (!ticket) return;

  const contenido = ticket.innerHTML;

  const win = window.open("", "_blank", "width=420,height=900");
  if (!win) return;

  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Ticket</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }

          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            font-family: monospace;
          }

          body {
            width: 72mm;
            max-width: 72mm;
            padding: 2mm 3mm;
            box-sizing: border-box;
            color: #000;
          }

          .no-print {
            display: none !important;
          }

          #ticket {
            width: 100%;
            max-width: 100%;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          img {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        <div id="ticket">${contenido}</div>
      </body>
    </html>
  `);
  const printStyles = (
  <style>{`
    @page {
      size: 80mm auto;
      margin: 0;
    }

    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }

      #ticket {
        width: 72mm !important;
        max-width: 72mm !important;
        margin: 0 auto !important;
        padding: 2mm 3mm !important;
        box-sizing: border-box !important;
        overflow: visible !important;
        background: #fff !important;
        color: #000 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      .no-print {
        display: none !important;
      }
    }
  `}</style>
);

  win.document.close();
  win.focus();

  setTimeout(() => {
    win.print();
    win.close();
  }, 500);
}
    // ✅ SI ES CORTE, MOSTRAR SOLO TEXTO (ticket de corte)
  if (data?.tipo === "corte") {
    return (
      <div
  style={{
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "grid",
    placeItems: "center",
    zIndex: 1000,
  }}
>
         {printStyles}
        <div
  id="ticket"
  style={{
    width: "72mm",
    maxWidth: "72mm",
    background: "white",
    color: "black",
    padding: "3mm",
    fontFamily: "monospace",
    fontSize: 11,
    lineHeight: 1.2,
    boxSizing: "border-box",
    overflow: "visible",
    pageBreakInside: "avoid",
    breakInside: "avoid",
  }}
>
          <pre style={{ fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap" }}>
            {data.texto}
          </pre>

<div className="no-print" style={{ display: "flex", gap: 8, marginTop: 10 }}>            <button style={{ flex: 1 }} onClick={imprimirSoloTicket}>
              🖨️ Imprimir
            </button>
            <button style={{ flex: 1 }} onClick={onClose}>
              ❌ Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }


  const money = (n) =>
    Number(n || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });

  const formaPagoLabel = (p) => {
    const s = String(p || "").toLowerCase();
    if (!s) return "—";
    if (s.includes("credito")) return "Tarjeta crédito";
    if (s.includes("debito")) return "Tarjeta débito";
    if (s.includes("transfer")) return "Transferencia";
    if (s.includes("cheque")) return "Cheque";
    if (s.includes("tarjeta")) return "Tarjeta";
    if (s.includes("efectivo")) return "Efectivo";
    return p; // lo que venga del backend
  };

  const formaPago = formaPagoLabel(data?.pago || venta?.forma_pago || venta?.tipo_pago);

  const totalFinal = Number(venta.total_final ?? venta.total ?? 0);
const descuento = Number(venta.descuento ?? 0);

// ✅ NUEVO: detectar cotización de pedido
const esCotizacionPedido =
  Number(venta.es_cotizacion_pedido ?? venta.esCotizacionPedido ?? 0) === 1;

// ✅ NUEVO: detectar cotización normal
const esCotizacionNormal =
  Number(venta.es_cotizacion ?? venta.esCotizacion ?? 0) === 1;

// ✅ Cliente / cajero para ticket de pedido
const clienteNombre =
  venta.cliente_nombre ||
  venta.cliente ||
  data?.cliente ||
  "PÚBLICO EN GENERAL";

const cajeroNombre =
  venta.cajero_nombre ||
  venta.usuario_nombre ||
  data?.cajero ||
  "Kenia Cardenas";

// ✅ Número de artículos (suma de cantidades)
const numeroArticulos = items.reduce(
  (acc, it) => acc + Number(it.cantidad || 0),
  0
);

  // suma de items (por si quieres validar)
const totalItems = items.reduce(
  (acc, it) => acc + Number(it.cantidad || 0) * Number(it.precio_unitario || 0),
  0
);

// ✅ TICKET ESPECIAL: COTIZACIÓN DE PEDIDO
if (esCotizacionPedido) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
      }}
    >
       {printStyles}
      <div
        id="ticket"
        style={{
          position: "relative",
          width: 320,
          background: "white",
          color: "black",
          padding: 16,
          fontFamily: "monospace",
          pageBreakInside: "avoid",
breakInside: "avoid",
        }}
      >
        {/* MARCA DE AGUA PEDIDO */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            opacity: 0.08,
            transform: "rotate(-25deg)",
            fontSize: 46,
            fontWeight: 900,
            letterSpacing: 1,
          }}
        >
          PEDIDO
          PEDIDO
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <h3 style={{ textAlign: "center", margin: 0 }}>VIVERO ABIDAN</h3>
          <p style={{ textAlign: "center", fontSize: 12, marginTop: 6, marginBottom: 6 }}>
             PEDIDO
          </p>

          <hr />

          <p style={{ fontSize: 12, margin: 0 }}>
            <b>Fecha y hora:</b>{" "}
            {venta.created_at ? new Date(venta.created_at).toLocaleString() : "—"}
            <br />
            <b>Cliente:</b> {clienteNombre}
          </p>

          <hr />

          {/* LISTADO PEDIDO */}
          <div style={{ fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <b style={{ width: 70 }}>Cantidad</b>
              <b style={{ flex: 1 }}>Producto</b>
            </div>

            {items.length === 0 ? (
              <div style={{ marginTop: 8, color: "#666" }}>
                (Sin productos en el pedido)
              </div>
            ) : (
              items.map((it, idx) => {
                const cant = Number(it.cantidad || 0);
                const nombre = String(
                  it.producto_nombre || it.nombre || it.codigo || "SIN NOMBRE"
                );

                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      marginTop: 6,
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ width: 70 }}>X{cant}</span>
                    <span style={{ flex: 1, lineHeight: 1.15 }}>{nombre}</span>
                  </div>
                );
              })
            )}
          </div>

          <hr />

          <div style={{ fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Número de artículos:</span>
              <b>{numeroArticulos}</b>
            </div>

            {!venta.es_cotizacion_pedido && (
  <>
    <div>Número de artículos: {items.length}</div>
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span>Total:</span>
      <b>{money(venta.total_final || venta.total || 0)}</b>
    </div>
  </>
)}

            <div style={{ marginTop: 10 }}>
              <b>Cajero:</b> {cajeroNombre}
            </div>

            <div style={{ marginTop: 18 }}>
              <b>FIRMA:</b> ______________________________
            </div>
          </div>

<div className="no-print" style={{ display: "flex", gap: 8, marginTop: 12 }}>            <button style={{ flex: 1 }} onClick={imprimirSoloTicket}>
              🖨️ Imprimir
            </button>
            <button style={{ flex: 1 }} onClick={onClose}>
              ❌ Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
      }}
    >
       {printStyles}
      <div
        id="ticket"
        style={{
          position: "relative",
          width: 320,
          background: "white",
          color: "black",
          padding: 16,
          fontFamily: "monospace",
          pageBreakInside: "avoid",
breakInside: "avoid",
        }}
      >
        {/* MARCA DE AGUA */}
{(esCotizacionNormal || esCotizacionPedido) && (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "grid",
      placeItems: "center",
      pointerEvents: "none",
      opacity: 0.1,
      transform: "rotate(-25deg)",
      fontSize: esCotizacionPedido ? 46 : 42,
      fontWeight: 900,
      letterSpacing: 1,
    }}
  >
    {esCotizacionPedido ? "PEDIDO" : "COTIZACIÓN"}
  </div>
)}

        <h3 style={{ textAlign: "center", margin: 0 }}>VIVERO ABIDAN</h3>
        <p style={{ textAlign: "center", fontSize: 12, marginTop: 6 }}>
          Carretera Nacional Km 253<br />
          Col. Los Rodríguez, Santiago, N.L<br />
          Tel. 81 82 66 10 15<br />
          WhatsApp: 81 81 16 75 87<br />
          viveroabidan@gmail.com
        </p>

        <hr />

        <p style={{ fontSize: 12, margin: 0 }}>
          <b>No. Ticket:</b> {venta.id ?? "—"}
          <br />
          <b>Fecha:</b>{" "}
          {venta.created_at ? new Date(venta.created_at).toLocaleString() : "—"}
          <br />
          <b>Cliente:</b> {clienteNombre}
          <br />
          <b>Forma de pago:</b> {formaPago}
        </p>

        <hr />

        {/* LISTADO DE PRODUCTOS */}
        <div style={{ fontSize: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <b style={{ width: 28 }}>Cant.</b>
<b style={{ flex: 1 }}>Producto</b>
<b style={{ width: 62, textAlign: "right" }}>Impporte</b>
          </div>

          {items.length === 0 ? (
            <div style={{ marginTop: 8, color: "#666" }}>
              (Sin productos en el ticket)
              <br />
              Revisa que <b>/api/ventas/:id/ticket</b> regrese <b>items</b>.
            </div>
          ) : (
            items.map((it, idx) => {
              const cant = Number(it.cantidad || 0);
              const pu = Number(it.precio_unitario || 0);
              const imp =
                it.importe != null ? Number(it.importe) : Number(cant * pu);

              const nombre = String(it.producto_nombre || it.nombre || it.codigo || "SIN NOMBRE");

              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    marginTop: 6,
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ width: 28 }}>{cant}</span>
                  <span style={{ flex: 1, lineHeight: 1.15 }}>
                    {nombre}
                    <div style={{ color: "#666", fontSize: 11 }}>
                      {it.codigo ? `(${it.codigo}) ` : ""}
                      {money(pu)}
                    </div>
                  </span>
                  <span style={{ width: 62, textAlign: "right" }}>
                    {money(imp)}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <hr />

        {/* TOTALES */}
        <p style={{ fontSize: 12, margin: 0 }}>
          Subtotal: {money(items.length ? totalItems : venta.total ?? 0)}
          <br />
          Descuento: {money(descuento)}
          <br />
          IVA: {money(0)}
          <br />
          <b>Total: {money(totalFinal)}</b>
        </p>
        

 <div style={{ marginTop: 6 }}>
  {/* ✅ SOLO SI ES EFECTIVO O MIXTO */}
  {(venta.tipo_pago === "efectivo" || venta.tipo_pago === "mixto") && (
    <div style={{ fontSize: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Recibido:</span>
        <b>{money(venta.recibido)}</b>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Cambio:</span>
        <b>{money(venta.cambio)}</b>
      </div>
    </div>
  )}

  {/* ✅ QR PARA FACTURACIÓN WHATSAPP */}
  <div
  style={{
    textAlign: "center",
    marginTop: 10,
    marginBottom: 6,
    pageBreakInside: "avoid",
    breakInside: "avoid",
  }}
>
    <img
  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    "https://wa.me/528181167587?text=Hola,%20quiero%20solicitar%20mi%20factura.%20Adjunto%20mis%20datos."
  )}`}
  alt="QR WhatsApp Facturación"
  style={{
    width: 130,
    height: 130,
    objectFit: "contain",
    imageRendering: "pixelated",
  }}
/>

    <div style={{ marginTop: 6, fontWeight: "bold", fontSize: 11 }}>
      ESCANEAR PARA FACTURAR
    </div>
    <div style={{ fontSize: 11, fontWeight: "bold" }}>
      EN WHATSAPP
    </div>

    <div style={{ marginTop: 4, fontSize: 10 }}>
      POR CODIGO QR PARA FACTURAR
    </div>
    <div style={{ fontSize: 10 }}>
      ENVIA TU INFORMACION
    </div>

    <div style={{ marginTop: 4, fontSize: 10, fontWeight: "bold" }}>
      ATENCION A CLIENTES
    </div>
    <div style={{ fontSize: 10 }}>
      TEL. 81 82 66 10 15
    </div>
  </div>
</div>

<hr />

        <p style={{ fontSize: 11, textAlign: "center", margin: 0 }}>
          ESTIMADO CLIENTE
          <br />
          POR LA SEGURIDAD DE AMBAS PARTES
          <br />
          SALIDA LA MERCANCIA
          <br />
          NO HAY CAMBIOS NI DEVOLUCIONES 
          <br />
          SIN EXCEPCION ALGUNA
        </p>

<div className="no-print" style={{ display: "flex", gap: 8, marginTop: 10 }}>          <button style={{ flex: 1 }} onClick={imprimirSoloTicket}>
            🖨️ Imprimir
          </button>
          <button style={{ flex: 1 }} onClick={onClose}>
            ❌ Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
