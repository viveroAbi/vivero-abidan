import re
from decimal import Decimal, InvalidOperation

INPUT_TXT = "productos_raw.txt"
OUTPUT_SQL = "productos_insert.sql"

def clean_price(s: str) -> str:
    # Quita $ y comas, deja solo número con punto
    s = s.strip()
    s = s.replace("$", "").replace(",", "")
    # algunos vienen como "$1,600.00"
    s = re.sub(r"[^\d.]", "", s)
    if s == "":
        return "0.00"
    try:
        val = Decimal(s)
        # normaliza a 2 decimales
        return f"{val:.2f}"
    except InvalidOperation:
        return "0.00"

def sql_escape(s: str) -> str:
    # Escapa comillas simples para SQL
    return s.replace("\\", "\\\\").replace("'", "''").strip()

def looks_like_row(line: str) -> bool:
    # Busca algo como: CODIGO   NOMBRE   $PRECIO
    return bool(re.search(r"\$\s*[\d,]+(?:\.\d{1,2})?", line))

rows = []
with open(INPUT_TXT, "r", encoding="utf-8", errors="ignore") as f:
    for raw in f:
        line = raw.strip()
        if not line:
            continue
        # ignora encabezados comunes
        if "Listado de productos" in line:
            continue
        if line in ["/", "\\"]:
            continue

        if not looks_like_row(line):
            continue

        # Divide por muchos espacios o tabs
        parts = re.split(r"\s{2,}|\t+", line)
        parts = [p.strip() for p in parts if p.strip()]

        # buscamos el precio en el último segmento que contenga $
        price_part = None
        for p in reversed(parts):
            if "$" in p:
                price_part = p
                break
        if not price_part:
            continue

        precio = clean_price(price_part)

        # Quitamos el precio de la lista de partes
        parts_wo_price = []
        for p in parts:
            if p == price_part:
                continue
            parts_wo_price.append(p)

        # Esperamos: [codigo, nombre...]
        if len(parts_wo_price) < 2:
            continue

        codigo = parts_wo_price[0]
        nombre = " ".join(parts_wo_price[1:])

        # Limpieza adicional de codigo (quita comillas raras)
        codigo = codigo.replace('"', "").replace("“", "").replace("”", "").strip()

        codigo_sql = sql_escape(codigo)
        nombre_sql = sql_escape(nombre)

        if codigo_sql and nombre_sql:
            rows.append((codigo_sql, nombre_sql, precio))

# Deduplicar por codigo (si se repite, nos quedamos con el último)
dedup = {}
for c, n, p in rows:
    dedup[c] = (n, p)

final_rows = [(c, dedup[c][0], dedup[c][1]) for c in dedup.keys()]

# Generar SQL
with open(OUTPUT_SQL, "w", encoding="utf-8") as out:
    out.write("START TRANSACTION;\n\n")
    out.write("-- Inserta/actualiza productos por codigo\n")
    out.write("INSERT INTO productos (codigo, nombre, precio)\nVALUES\n")

    values_lines = []
    for c, n, p in final_rows:
        values_lines.append(f"  ('{c}', '{n}', {p})")

    out.write(",\n".join(values_lines))
    out.write("\nON DUPLICATE KEY UPDATE\n")
    out.write("  nombre = VALUES(nombre),\n")
    out.write("  precio = VALUES(precio);\n\n")
    out.write("COMMIT;\n")

print(f"Listo ✅ Generado: {OUTPUT_SQL}")
print(f"Productos detectados: {len(final_rows)} (deduplicados por codigo)")
