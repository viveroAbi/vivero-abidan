export default function TicketModal({ data, onClose, recibido = 0, cambio = 0 }) {
  const venta = data?.venta || {};
  const items = Array.isArray(data?.items) ? data.items : [];

  const printStyles = (
    <style>{`
      @page {
        size: 80mm auto;
        margin: 0;
      }

      .ticket-overlay {
        overflow-y: auto;
        padding: 20px 0;
      }

      #ticket {
        max-height: 90vh;
        overflow-y: auto;
        overflow-x: hidden;
      }

      @media print {
        html, body {
          width: 80mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
        }

        body * {
          visibility: hidden !important;
        }

        #ticket, #ticket * {
          visibility: visible !important;
        }

        .ticket-overlay {
          position: static !important;
          inset: auto !important;
          background: #fff !important;
          display: block !important;
          overflow: visible !important;
          padding: 0 !important;
        }

        .no-print {
          display: none !important;
        }

        #ticket {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 72mm !important;
          max-width: 72mm !important;
          min-width: 72mm !important;
          max-height: none !important;
          margin: 0 !important;
          padding: 2mm 3mm !important;
          box-sizing: border-box !important;
          overflow: visible !important;
          background: #fff !important;
          color: #000 !important;
          box-shadow: none !important;
          border: none !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        img, svg, canvas {
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          margin: 0 auto !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        hr {
          border: none !important;
          border-top: 1px solid #999 !important;
          margin: 4px 0 !important;
        }

        p, div, span, h1, h2, h3, h4, h5, h6, pre {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      }
    `}</style>
  );

  function imprimirSoloTicket() {
    const ticket = document.getElementById("ticket-contenido");
    if (!ticket) return;

    const contenido = ticket.innerHTML;

    const win = window.open("", "_blank", "width=420,height=900");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Imprimir ticket</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }

            html, body {
              width: 80mm;
              margin: 0;
              padding: 0;
              background: #fff;
              font-family: monospace;
            }

            body {
              overflow: visible;
            }

            #ticket-print {
              width: 72mm;
              max-width: 72mm;
              min-width: 72mm;
              padding: 3mm;
              box-sizing: border-box;
              color: #000;
              background: #fff;
              height: auto;
              max-height: none;
              overflow: visible;
            }

            img, svg, canvas {
              max-width: 100%;
              height: auto;
              display: block;
              margin: 0 auto;
            }

            hr {
              border: none;
              border-top: 1px solid #999;
              margin: 4px 0;
            }

            p, div, span, h1, h2, h3, h4, h5, h6, pre {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <div id="ticket-print">${contenido}</div>
        </body>
      </html>
    `);

    win.document.close();

    const lanzarImpresion = () => {
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 300);
    };

    if (win.document.readyState === "complete") {
      lanzarImpresion();
    } else {
      win.onload = lanzarImpresion;
    }
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
    if (s.includes("mixto")) return "Mixto";
    return p;
  };

  const formaPago = formaPagoLabel(data?.pago || venta?.forma_pago || venta?.tipo_pago);
  const totalFinal = Number(venta.total_final ?? venta.total ?? 0);
  const descuento = Number(venta.descuento ?? 0);

  const esCotizacionPedido =
    Number(venta.es_cotizacion_pedido ?? venta.esCotizacionPedido ?? 0) === 1;

  const esCotizacionNormal =
    Number(venta.es_cotizacion ?? venta.esCotizacion ?? 0) === 1;

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

  const numeroArticulos = items.reduce(
    (acc, it) => acc + Number(it.cantidad || 0),
    0
  );

  const totalItems = items.reduce(
    (acc, it) => acc + Number(it.cantidad || 0) * Number(it.precio_unitario || 0),
    0
  );

  if (data?.tipo === "corte") {
    return (
      <div
        className="ticket-overlay"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          display: "grid",
          placeItems: "start center",
          zIndex: 1000,
          overflowY: "auto",
          padding: "20px 0",
        }}
      >
        {printStyles}

        <div
          id="ticket"
          style={{
            position: "relative",
            width: "72mm",
            maxWidth: "72mm",
            background: "white",
            color: "black",
            padding: "3mm",
            boxSizing: "border-box",
            fontFamily: "monospace",
            maxHeight: "90vh",
            overflowY: "auto",
            overflowX: "hidden",
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        >
          <div id="ticket-contenido">
            <pre
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                whiteSpace: "pre-wrap",
                margin: 0,
              }}
            >
              {data.texto}
            </pre>
          </div>

          <div className="no-print" style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={{ flex: 1 }} onClick={imprimirSoloTicket}>
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

  if (esCotizacionPedido) {
    return (
      <div
        className="ticket-overlay"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          display: "grid",
          placeItems: "start center",
          zIndex: 1000,
          overflowY: "auto",
          padding: "20px 0",
        }}
      >
        {printStyles}

        <div
          id="ticket"
          style={{
            position: "relative",
            width: "72mm",
            maxWidth: "72mm",
            background: "white",
            color: "black",
            padding: "3mm",
            boxSizing: "border-box",
            fontFamily: "monospace",
            maxHeight: "90vh",
            overflowY: "auto",
            overflowX: "hidden",
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        >
          <div id="ticket-contenido">
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
                zIndex: 0,
              }}
            >
              PEDIDO
            </div>

            <div style={{ position: "relative", zIndex: 1 }}>
              <h3 style={{ textAlign: "center", margin: 0 }}>VIVERO ABIDAN</h3>
              <p style={{ textAlign: "center", fontSize: 10, marginTop: 4, marginBottom: 4 }}>
                PEDIDO
              </p>

              <hr />

              <p style={{ fontSize: 11, margin: 0, lineHeight: 1.15 }}>
                <b>Fecha y hora:</b>{" "}
                {venta.created_at ? new Date(venta.created_at).toLocaleString() : "—"}
                <br />
                <b>Cliente:</b> {clienteNombre}
              </p>

              <hr />

              <div style={{ fontSize: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <b style={{ width: 28 }}>Cant.</b>
                  <b style={{ flex: 1 }}>Producto</b>
                </div>

                {items.length === 0 ? (
                  <div style={{ marginTop: 8, color: "#666" }}>
                    (Sin productos en el pedido)
                  </div>
                ) : (
                  items.map((it, idx) => {
                    const cant = Number(it.cantidad || 0);
                    const pu = Number(it.precio_unitario || 0);
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
                        <span style={{ width: 28 }}>{cant}</span>

                        <span style={{ flex: 1, lineHeight: 1.15 }}>
                          {nombre}
                          <div style={{ fontSize: 10, fontWeight: "bold", color: "#000" }}>
                            {money(pu)}
                          </div>
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <hr />

              <div style={{ fontSize: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Número de artículos:</span>
                  <b>{numeroArticulos}</b>
                </div>

                <div style={{ marginTop: 10 }}>
                  <b>Cajero:</b> {cajeroNombre}
                </div>

                <div style={{ marginTop: 18 }}>
                  <b>FIRMA:</b> ______________________________
                </div>
              </div>
            </div>
          </div>

          <div className="no-print" style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={{ flex: 1 }} onClick={imprimirSoloTicket}>
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

  return (
    <div
      className="ticket-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "grid",
        placeItems: "start center",
        zIndex: 1000,
        overflowY: "auto",
        padding: "20px 0",
      }}
    >
      {printStyles}

      <div
        id="ticket"
        style={{
          position: "relative",
          width: "72mm",
          maxWidth: "72mm",
          background: "white",
          color: "black",
          padding: "3mm",
          boxSizing: "border-box",
          fontFamily: "monospace",
          maxHeight: "90vh",
          overflowY: "auto",
          overflowX: "hidden",
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        <div id="ticket-contenido">
          {esCotizacionNormal && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                pointerEvents: "none",
                opacity: 0.1,
                transform: "rotate(-25deg)",
                fontSize: 42,
                fontWeight: 900,
                letterSpacing: 1,
                zIndex: 0,
              }}
            >
              COTIZACIÓN
            </div>
          )}

          <div style={{ position: "relative", zIndex: 1 }}>
            <h3 style={{ textAlign: "center", margin: 0 }}>VIVERO ABIDAN</h3>
            <p
              style={{
                textAlign: "center",
                fontSize: 10,
                marginTop: 4,
                marginBottom: 4,
                lineHeight: 1.15,
              }}
            >
              Carretera Nacional Km 253
              <br />
              Col. Los Rodríguez, Santiago, N.L
              <br />
              Tel. 81 82 66 10 15
              <br />
              WhatsApp: 81 81 16 75 87
              <br />
              viveroabidan@gmail.com
            </p>

            <hr />

            <p style={{ fontSize: 11, margin: 0, lineHeight: 1.15 }}>
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

            <div style={{ fontSize: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <b style={{ width: 28 }}>Cant.</b>
                <b style={{ flex: 1 }}>Producto</b>
                <b style={{ width: 62, textAlign: "right" }}>Importe</b>
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

                  const nombre = String(
                    it.nombre || it.producto_nombre || it.codigo || "SIN NOMBRE"
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
                      <span style={{ width: 28 }}>{cant}</span>

                      <span style={{ flex: 1, lineHeight: 1.15 }}>
                        {nombre}
                        <div style={{ color: "#000", fontSize: 10, fontWeight: "normal" }}>
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

            <p style={{ fontSize: 11, margin: 0, lineHeight: 1.15 }}>
              Subtotal: {money(items.length ? totalItems : venta.total ?? 0)}
              <br />
              Descuento: {money(descuento)}
              <br />
              IVA: {money(0)}
              <br />
              <b>Total: {money(totalFinal)}</b>
            </p>

            <div style={{ marginTop: 6 }}>
              {(venta.tipo_pago === "efectivo" || venta.tipo_pago === "mixto") && (
                <div style={{ fontSize: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Recibido:</span>
                    <b>{money(venta.recibido ?? recibido)}</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Cambio:</span>
                    <b>{money(venta.cambio ?? cambio)}</b>
                  </div>
                </div>
              )}

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
                    width: 80,
                    height: 80,
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
                <div style={{ fontSize: 10 }}>ENVIA TU INFORMACION</div>

                <div style={{ marginTop: 4, fontSize: 10, fontWeight: "bold" }}>
                  ATENCION A CLIENTES
                </div>
                <div style={{ fontSize: 10 }}>TEL. 81 82 66 10 15</div>
              </div>
            </div>

            <hr />

            <p style={{ fontSize: 10, textAlign: "center", margin: 0, lineHeight: 1.1 }}>
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
          </div>
        </div>

        <div className="no-print" style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button style={{ flex: 1 }} onClick={imprimirSoloTicket}>
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