import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";

async function main() {
  const nombre = "Administrador";
  const usuario = "admin";
  const passwordPlano = "1234";
  const rol = "admin";

  const hash = await bcrypt.hash(passwordPlano, 10);

  const [existe] = await pool.query(
    "SELECT id FROM usuarios WHERE usuario=? LIMIT 1",
    [usuario]
  );

  if (existe.length) {
    await pool.query(
      "UPDATE usuarios SET nombre=?, password_hash=?, rol=? WHERE usuario=?",
      [nombre, hash, rol, usuario]
    );
    console.log("✅ Admin actualizado");
  } else {
    await pool.query(
      "INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)",
      [nombre, usuario, hash, rol]
    );
    console.log("✅ Admin creado");
  }

  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Error seedAdmin:", e);
  process.exit(1);
});



