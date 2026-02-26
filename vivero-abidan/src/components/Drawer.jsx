export default function Drawer({ open, onClose, cardStyle, btn, setView, isAdmin }) {
  if (!open) return null;

  const go = (vista) => {
    setView(vista);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 280,
          height: "100%",
          background: "#fff",
          padding: 14,
          boxSizing: "border-box",
          ...cardStyle,
          borderRadius: 0,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <b>Menú</b>
          <button type="button" style={btn("ghost")} onClick={onClose}>
            ✖
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {/* ✅ TODOS (admin y vendedor) */}
          <button type="button" style={btn("ghost")} onClick={() => go("ventas")}>
            Ventas
          </button>

          {/* ✅ SOLO ADMIN */}
          {isAdmin && (
            <>
              <button type="button" style={btn("ghost")} onClick={() => go("usuarios")}>
                👤 Crear usuario
              </button>

              <button type="button" style={btn("ghost")} onClick={() => go("reporte")}>
                Reporte
              </button>

              <button type="button" style={btn("ghost")} onClick={() => go("reporte_productos")}>
                Reporte de productos
              </button>

              <button type="button" style={btn("ghost")} onClick={() => go("productos")}>
                Productos
              </button>

              <button type="button" style={btn("ghost")} onClick={() => go("codigos_barras")}>
                Códigos de barras
              </button>

              <button type="button" style={btn("ghost")} onClick={() => go("clientes")}>
                Clientes
              </button>

              <button type="button" style={btn("ghost")} onClick={() => go("movimientos")}>
                Movimientos
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}