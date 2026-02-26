export function calcularDescuento(categoria, total) {
  let porcentaje = 0;

  switch (categoria) {
    case 'publico':
      if (total >= 1200) porcentaje = 0.10;
      break;

    case 'revendedor':
      if (total >= 1200) porcentaje = 0.10;
      break;

    case 'jardinero':
      if (total >= 2500) porcentaje = 0.20;
      break;

    case 'paisajista':
      if (total >= 3500) porcentaje = 0.30;
      break;

    case 'arquitecto':
      if (total >= 5000) porcentaje = 0.40;
      break;

    case 'mayoreo':
      porcentaje = 0.45;
      break;

    case 'vivero':
      porcentaje = 0.55;
      break;
  }

  return total * porcentaje;
}
