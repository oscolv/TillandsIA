/**
 * SVG sparkline minimalista. Sin librerías. Pensado para mostrar
 * tendencias temporales en el dashboard interno.
 *
 * - Eje Y autoescalado al rango de los valores.
 * - Si todos los valores son cero, dibuja una línea base plana.
 * - Marca el último punto con un círculo para llamar la atención al "hoy".
 */
export function Sparkline({
  values,
  width = 240,
  height = 40,
  stroke = "currentColor",
  fill = "none",
  strokeWidth = 1.5,
  ariaLabel,
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  ariaLabel?: string;
}) {
  if (values.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel ?? "Sin datos"}
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="var(--caliza)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // evita dividir por cero

  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = i * stepX;
    // Y invertido: 0 arriba, height abajo. Mapeo del valor al rango [pad, height-pad].
    const pad = strokeWidth + 1;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const pathD = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel ?? `Tendencia: ${values.length} puntos, min ${min}, max ${max}`}
    >
      <path d={pathD} stroke={stroke} fill={fill} strokeWidth={strokeWidth} />
      {last && (
        <circle
          cx={last[0]}
          cy={last[1]}
          r={Math.max(2, strokeWidth + 1)}
          fill={stroke}
        />
      )}
    </svg>
  );
}
