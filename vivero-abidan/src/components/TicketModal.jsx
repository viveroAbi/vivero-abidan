export default function TicketModal({ data, onClose, recibido = 0, cambio = 0 }) {
  const venta = data?.venta || {};
  const items = Array.isArray(data?.items) ? data.items : [];

  const thermalFont = '"Arial", "Helvetica", sans-serif';

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
        font-family: ${thermalFont};
      }

      @media print {
        html, body {
          width: 80mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          overflow: visible !important;
          font-family: ${thermalFont} !important;
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
          position: static !important;
          left: auto !important;
          top: auto !important;
          width: 72mm !important;
          max-width: 72mm !important;
          min-width: 72mm !important;
          max-height: none !important;
          margin: 0 auto !important;
          padding: 2.5mm 3mm !important;
          box-sizing: border-box !important;
          overflow: visible !important;
          background: #fff !important;
          color: #000 !important;
          box-shadow: none !important;
          border: none !important;
          font-family: ${thermalFont} !important;
        }

        img, svg, canvas {
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          margin: 0 auto !important;
          break-inside: auto !important;
          page-break-inside: auto !important;
        }

        hr {
          border: none !important;
          border-top: 1px dashed #000 !important;
          margin: 3px 0 !important;
        }

        p, div, span, h1, h2, h3, h4, h5, h6, pre, table, tr, td {
          break-inside: auto !important;
          page-break-inside: auto !important;
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
              color: #000;
              font-family: ${thermalFont};
              overflow: visible;
            }

            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            #ticket-print {
              width: 72mm;
              max-width: 72mm;
              min-width: 72mm;
              padding: 2.5mm 3mm;
              box-sizing: border-box;
              color: #000;
              background: #fff;
              height: auto;
              max-height: none;
              overflow: visible;
              margin: 0 auto;
              font-family: ${thermalFont};
            }

            img, svg, canvas {
              max-width: 100%;
              height: auto;
              display: block;
              margin: 0 auto;
            }

            hr {
              border: none;
              border-top: 1px dashed #000;
              margin: 3px 0;
            }

            p, div, span, h1, h2, h3, h4, h5, h6, pre, table, tr, td {
              break-inside: auto;
              page-break-inside: auto;
            }
          </style>
        </head>
        <body>
          <div id="ticket-print">${contenido}</div>
        </body>
      </html>
    `);

    win.document.close();

    const esperarImagenesEImprimir = () => {
      const imagenes = Array.from(win.document.images || []);

      if (imagenes.length === 0) {
        win.focus();
        setTimeout(() => {
          win.print();
          win.close();
        }, 500);
        return;
      }

      let cargadas = 0;
      const total = imagenes.length;

      const revisar = () => {
        cargadas += 1;
        if (cargadas >= total) {
          win.focus();
          setTimeout(() => {
            win.print();
            win.close();
          }, 700);
        }
      };

      imagenes.forEach((img) => {
        if (img.complete) {
          revisar();
        } else {
          img.onload = revisar;
          img.onerror = revisar;
        }
      });

      setTimeout(() => {
        win.focus();
        win.print();
        win.close();
      }, 2000);
    };

    if (win.document.readyState === "complete") {
      esperarImagenesEImprimir();
    } else {
      win.onload = esperarImagenesEImprimir;
    }
  }

  const money = (n) =>
    Number(n || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const moneyCompact = (n) =>
    `$${Number(n || 0).toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formaPagoLabel = (p) => {
    const s = String(p || "").toLowerCase().trim();
    if (!s) return "—";
    if (s.includes("a_cuenta") || s.includes("a cuenta")) return "A_CUENTA";
    if (s.includes("credito")) return "TARJETA CREDITO";
    if (s.includes("debito")) return "TARJETA DEBITO";
    if (s.includes("transfer")) return "TRANSFERENCIA";
    if (s.includes("cheque")) return "CHEQUE";
    if (s.includes("tarjeta")) return "TARJETA";
    if (s.includes("efectivo")) return "EFECTIVO";
    if (s.includes("mixto")) return "MIXTO";
    return String(p).toUpperCase();
  };

  const categoriaLabel = (c) => {
    const s = String(c || "").toLowerCase().trim();
    if (!s) return "PUBLICO";
    if (s === "publico" || s === "público") return "PUBLICO";
    if (s === "mayoreo") return "MAYOREO";
    if (s === "vivero") return "VIVERO";
    if (s === "especial" || s === "precio especial") return "PRECIO ESPECIAL";
    return String(c).toUpperCase();
  };

  const pickNum = (...values) => {
    for (const v of values) {
      if (v !== undefined && v !== null && v !== "") return Number(v || 0);
    }
    return 0;
  };

  const pickText = (...values) => {
    for (const v of values) {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
    return "";
  };

  const formaPago = formaPagoLabel(
    data?.pago || venta?.forma_pago || venta?.tipo_pago
  );

  const tipoPagoRaw = String(
    venta?.tipo_pago || venta?.forma_pago || data?.pago || ""
  )
    .toLowerCase()
    .trim();

  const esPagoACuenta =
    tipoPagoRaw === "a_cuenta" ||
    tipoPagoRaw === "a cuenta" ||
    tipoPagoRaw.includes("a_cuenta") ||
    tipoPagoRaw.includes("a cuenta");

  const totalFinal = Number(venta.total_final ?? venta.total ?? 0);
  const descuento = Number(venta.descuento ?? 0);

  const esCotizacionPedido =
    Number(venta.es_cotizacion_pedido ?? venta.esCotizacionPedido ?? 0) === 1;

  const esCotizacionNormal =
    Number(venta.es_cotizacion ?? venta.esCotizacion ?? 0) === 1;

  const clienteNombreRaw = pickText(
    venta?.cliente_nombre,
    venta?.cliente,
    venta?.nombre_cliente,
    venta?.clienteNombre,
    venta?.cliente_nombre_completo,
    venta?.cliente?.nombre,
    venta?.cliente?.razon_social,
    data?.cliente_nombre,
    data?.cliente,
    data?.nombre_cliente
  );

  const clienteNombre = clienteNombreRaw || "PUBLICO EN GENERAL";

  const categoriaVenta = venta.categoria || data?.categoria || "publico";

  const cajeroNombre =
    venta.cajero_nombre ||
    venta.usuario_nombre ||
    data?.cajero ||
    "KENIA CARDENAS";

  const numeroArticulos = items.reduce(
    (acc, it) => acc + Number(it.cantidad || 0),
    0
  );

  const totalItems = items.reduce(
    (acc, it) =>
      acc + Number(it.cantidad || 0) * Number(it.precio_unitario || 0),
    0
  );

  const pagoEfectivo = pickNum(
    venta.efectivo,
    venta.monto_efectivo,
    venta.pago_efectivo,
    data?.efectivo,
    data?.monto_efectivo
  );

  const pagoTarjeta = pickNum(
    venta.tarjeta,
    venta.monto_tarjeta,
    venta.pago_tarjeta,
    data?.tarjeta,
    data?.monto_tarjeta
  );

  const pagoTransferencia = pickNum(
    venta.transferencia,
    venta.monto_transferencia,
    venta.pago_transferencia,
    data?.transferencia,
    data?.monto_transferencia
  );

  const pagoCheque = pickNum(
    venta.cheque,
    venta.monto_cheque,
    venta.pago_cheque,
    data?.cheque,
    data?.monto_cheque
  );

  const pagoCredito = pickNum(
    venta.tarjeta_credito,
    venta.monto_tarjeta_credito,
    venta.pago_tarjeta_credito,
    data?.tarjeta_credito,
    data?.monto_tarjeta_credito
  );

  const pagoDebito = pickNum(
    venta.tarjeta_debito,
    venta.monto_tarjeta_debito,
    venta.pago_tarjeta_debito,
    data?.tarjeta_debito,
    data?.monto_tarjeta_debito
  );

  const pagosMixtos = [
    { label: "EFECTIVO", value: pagoEfectivo },
    { label: "TARJETA", value: pagoTarjeta },
    { label: "TRANSFERENCIA", value: pagoTransferencia },
    { label: "CHEQUE", value: pagoCheque },
    { label: "TARJ. CREDITO", value: pagoCredito },
    { label: "TARJ. DEBITO", value: pagoDebito },
  ].filter((x) => Number(x.value || 0) > 0);

  const dejaACuenta = pickNum(
    venta.abono,
    venta.anticipo,
    venta.deja,
    venta.monto_abonado,
    venta.monto_abono,
    venta.recibido,
    data?.abono,
    data?.anticipo,
    data?.deja,
    data?.monto_abonado,
    data?.monto_abono,
    recibido
  );

  let restaACuenta = pickNum(
    venta.resta,
    venta.saldo_pendiente,
    venta.adeudo_restante,
    venta.total_restante,
    venta.pendiente,
    venta.saldo,
    data?.resta,
    data?.saldo_pendiente,
    data?.adeudo_restante,
    data?.total_restante,
    data?.pendiente,
    data?.saldo
  );

  if (!restaACuenta && esPagoACuenta) {
    restaACuenta = Math.max(totalFinal - dejaACuenta, 0);
  }

  const ticketBoxStyle = {
    position: "relative",
    width: "72mm",
    maxWidth: "72mm",
    background: "white",
    color: "black",
    padding: "2.5mm 3mm",
    boxSizing: "border-box",
    fontFamily: thermalFont,
    maxHeight: "90vh",
    overflowY: "auto",
    overflowX: "hidden",
    fontSize: 12,
    lineHeight: 1.2,
    letterSpacing: "0.1px",
  };

  const overlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "grid",
    placeItems: "start center",
    zIndex: 1000,
    overflowY: "auto",
    padding: "20px 0",
  };

  if (data?.tipo === "corte") {
    return (
      <div className="ticket-overlay" style={overlayStyle}>
        {printStyles}

        <div id="ticket" style={ticketBoxStyle}>
          <div id="ticket-contenido">
            <pre
              style={{
                fontFamily: thermalFont,
                fontSize: 12,
                whiteSpace: "pre-wrap",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {data.texto}
            </pre>
          </div>

          <div
            className="no-print"
            style={{ display: "flex", gap: 8, marginTop: 10 }}
          >
            <button style={{ flex: 1 }} onClick={imprimirSoloTicket}>
              Imprimir
            </button>
            <button style={{ flex: 1 }} onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (esCotizacionPedido) {
    return (
      <div className="ticket-overlay" style={overlayStyle}>
        {printStyles}

        <div id="ticket" style={ticketBoxStyle}>
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
                fontSize: 40,
                fontWeight: 700,
                letterSpacing: 1,
                zIndex: 0,
              }}
            >
              PEDIDO
            </div>

            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{ textAlign: "center", fontWeight: "bold", fontSize: 17 }}
              >
                VIVERO ABIDAN
              </div>
              <div style={{ textAlign: "center", fontSize: 12, marginTop: 2 }}>
                PEDIDO
              </div>

              <hr />

              <div style={{ fontSize: 12 }}>
                <div>
                  <b>FECHA Y HORA:</b>{" "}
                  {venta.created_at
                    ? new Date(venta.created_at).toLocaleString()
                    : "—"}
                </div>
                <div>
                  <b>CLIENTE:</b> {String(clienteNombre).toUpperCase()}
                </div>
                <div>
                  <b>CATEGORIA:</b> {categoriaLabel(categoriaVenta)}
                </div>
              </div>

              <hr />

              <div style={{ fontSize: 12 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "26px 1fr",
                    gap: 6,
                  }}
                >
                  <b>CANT</b>
                  <b>PRODUCTO / PRECIO</b>
                </div>

                {items.length === 0 ? (
                  <div style={{ marginTop: 8 }}>(SIN PRODUCTOS EN EL PEDIDO)</div>
                ) : (
                  items.map((it, idx) => {
                    const cant = Number(it.cantidad || 0);
                    const pu = Number(it.precio_unitario || 0);
                    const nombre = String(
                      it.producto_nombre || it.nombre || it.codigo || "SIN NOMBRE"
                    ).toUpperCase();

                    return (
                      <div key={idx} style={{ marginTop: 6 }}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "26px 1fr",
                            gap: 6,
                            alignItems: "start",
                          }}
                        >
                          <div>
                            <b>{cant}</b>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 8,
                              width: "100%",
                            }}
                          >
                            <span style={{ flex: 1 }}>{nombre}</span>
                            <span
                              style={{
                                fontWeight: "bold",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {moneyCompact(pu)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <hr />

              <div style={{ fontSize: 12 }}>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>ARTICULOS:</span>
                  <b>{numeroArticulos}</b>
                </div>

                <div style={{ marginTop: 10 }}>
                  <b>CAJERO:</b> {cajeroNombre}
                </div>

                <div style={{ marginTop: 18 }}>
                  <b>FIRMA:</b> ________________________
                </div>
              </div>
            </div>
          </div>

          <div
            className="no-print"
            style={{ display: "flex", gap: 8, marginTop: 12 }}
          >
            <button style={{ flex: 1 }} onClick={imprimirSoloTicket}>
              Imprimir
            </button>
            <button style={{ flex: 1 }} onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ticket-overlay" style={overlayStyle}>
      {printStyles}

      <div id="ticket" style={ticketBoxStyle}>
        <div id="ticket-contenido">
          {esCotizacionNormal && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                pointerEvents: "none",
                opacity: 0.08,
                transform: "rotate(-25deg)",
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: 1,
                zIndex: 0,
              }}
            >
              COTIZACION
            </div>
          )}

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{ textAlign: "center", fontWeight: "bold", fontSize: 17 }}
            >
              VIVERO ABIDAN
            </div>

            <div
              style={{
                textAlign: "center",
                fontSize: 11,
                marginTop: 4,
                marginBottom: 4,
                lineHeight: 1.18,
              }}
            >
              CARRETERA NACIONAL KM 253
              <br />
              COL. LOS RODRIGUEZ, SANTIAGO, N.L.
              <br />
              TEL. 81 82 66 10 15
              <br />
              WHATSAPP: 81 81 16 75 87
              <br />
              VIVEROABIDAN@GMAIL.COM
            </div>

            <hr />

            <div style={{ fontSize: 12, lineHeight: 1.18 }}>
              <div>
                <b>NO. TICKET:</b> {venta.id ?? "—"}
              </div>
              <div>
                <b>FECHA:</b>{" "}
                {venta.created_at
                  ? new Date(venta.created_at).toLocaleString()
                  : "—"}
              </div>
              <div>
                <b>CLIENTE:</b> {String(clienteNombre).toUpperCase()}
              </div>
              <div>
                <b>CATEGORIA:</b> {categoriaLabel(categoriaVenta)}
              </div>
              <div>
                <b>FORMA DE PAGO:</b> {formaPago}
              </div>
            </div>

            <hr />

            <div style={{ fontSize: 12 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "26px 1fr 62px 62px",
                  gap: 6,
                  alignItems: "start",
                }}
              >
                <b>CANT</b>
                <b>| PRODUCTO</b>
                <b style={{ textAlign: "right" }}>| PRECIO</b>
                <b style={{ textAlign: "right" }}>IMPORTE</b>
              </div>

              {items.length === 0 ? (
                <div style={{ marginTop: 8 }}>(SIN PRODUCTOS EN EL TICKET)</div>
              ) : (
                items.map((it, idx) => {
                  const cant = Number(it.cantidad || 0);
                  const pu = Number(it.precio_unitario || 0);
                  const imp =
                    it.importe != null ? Number(it.importe) : Number(cant * pu);

                  const nombre = String(
                    it.nombre || it.producto_nombre || it.codigo || "SIN NOMBRE"
                  ).toUpperCase();

                  return (
                    <div key={idx} style={{ marginTop: 7 }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "26px 1fr 62px 62px",
                          gap: 6,
                          alignItems: "start",
                        }}
                      >
                        <div>
                          <b>{cant}</b>
                        </div>

                        <div>{nombre}</div>

                        <div style={{ textAlign: "right", fontWeight: "bold" }}>
                          {moneyCompact(pu)}
                        </div>

                        <div style={{ textAlign: "right", fontWeight: "bold" }}>
                          {moneyCompact(imp)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <hr />

            <div style={{ fontSize: 12, lineHeight: 1.2 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>SUBTOTAL:</span>
                <b>{moneyCompact(items.length ? totalItems : venta.total ?? 0)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>DESCUENTO:</span>
                <b>{moneyCompact(descuento)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>IVA:</span>
                <b>{moneyCompact(0)}</b>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 2,
                }}
              >
                <span>
                  <b>TOTAL:</b>
                </span>
                <b>{moneyCompact(totalFinal)}</b>
              </div>
            </div>

            <div style={{ marginTop: 6 }}>
              {tipoPagoRaw === "mixto" && (
                <div style={{ fontSize: 12, marginBottom: 4 }}>
                  {pagosMixtos.length > 0 ? (
                    pagosMixtos.map((pago) => (
                      <div
                        key={pago.label}
                        style={{ display: "flex", justifyContent: "space-between" }}
                      >
                        <span>{pago.label}:</span>
                        <b>{moneyCompact(pago.value)}</b>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <span>MIXTO:</span>
                      <b>{moneyCompact(totalFinal)}</b>
                    </div>
                  )}
                </div>
              )}

              {(tipoPagoRaw === "efectivo" || tipoPagoRaw === "mixto") && (
                <div style={{ fontSize: 12 }}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>RECIBIDO:</span>
                    <b>{moneyCompact(venta.recibido ?? recibido)}</b>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>CAMBIO:</span>
                    <b>{moneyCompact(venta.cambio ?? cambio)}</b>
                  </div>
                </div>
              )}

              {esPagoACuenta && (
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>DEJA:</span>
                    <b>{moneyCompact(dejaACuenta)}</b>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>RESTA:</span>
                    <b>{moneyCompact(restaACuenta)}</b>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <b>FIRMA:</b> ________________________
                  </div>
                </div>
              )}

              <div
                style={{
                  textAlign: "center",
                  marginTop: 10,
                  marginBottom: 6,
                }}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                    "https://wa.me/528181167587?text=Hola,%20quiero%20solicitar%20mi%20factura.%20Adjunto%20mis%20datos."
                  )}`}
                  alt="QR WhatsApp Facturacion"
                  crossOrigin="anonymous"
                  style={{
                    width: 82,
                    height: 82,
                    objectFit: "contain",
                    imageRendering: "pixelated",
                    display: "block",
                    margin: "0 auto",
                  }}
                />

                <div style={{ marginTop: 6, fontWeight: "bold", fontSize: 10 }}>
                  ESCANEAR PARA FACTURAR
                </div>
                <div style={{ fontSize: 10, fontWeight: "bold" }}>
                  EN WHATSAPP
                </div>
                <div style={{ marginTop: 4, fontSize: 9 }}>
                  ENVIA TU INFORMACION
                </div>
                <div style={{ marginTop: 4, fontSize: 9, fontWeight: "bold" }}>
                  ATENCION A CLIENTES
                </div>
                <div style={{ fontSize: 9 }}>TEL. 81 82 66 10 15</div>
              </div>
            </div>

            <hr />

            <div style={{ fontSize: 10, textAlign: "center", lineHeight: 1.1 }}>
              ESTIMADO CLIENTE
              <br />
              POR LA SEGURIDAD DE AMBAS PARTES
              <br />
              SALIDA LA MERCANCIA
              <br />
              NO HAY CAMBIOS NI DEVOLUCIONES
              <br />
              SIN EXCEPCION ALGUNA
            </div>
          </div>
        </div>

        <div
          className="no-print"
          style={{ display: "flex", gap: 8, marginTop: 10 }}
        >
          <button style={{ flex: 1 }} onClick={imprimirSoloTicket}>
            Imprimir
          </button>
          <button style={{ flex: 1 }} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}