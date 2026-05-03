/**
 * Marca visual de henomotita.mx — un cúmulo de hojas estilizado.
 * Reutilizamos exactamente el mismo SVG del sitio principal para que
 * el ecosistema (sitio + app) lea como una sola pieza.
 */
export function BrandLogo({
  className,
  title = "Heno Motita",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <circle
        cx="20"
        cy="20"
        r="18"
        fill="rgba(196,134,42,0.2)"
        stroke="#C4862A"
        strokeWidth="1.5"
      />
      <ellipse cx="20" cy="20" rx="5" ry="8" fill="#7AAD4A" opacity="0.9" />
      <ellipse
        cx="14"
        cy="17"
        rx="4"
        ry="6"
        fill="#7AAD4A"
        opacity="0.7"
        transform="rotate(-25 14 17)"
      />
      <ellipse
        cx="26"
        cy="17"
        rx="4"
        ry="6"
        fill="#7AAD4A"
        opacity="0.7"
        transform="rotate(25 26 17)"
      />
      <ellipse
        cx="12"
        cy="23"
        rx="3.5"
        ry="5.5"
        fill="#4A7C2F"
        opacity="0.6"
        transform="rotate(-40 12 23)"
      />
      <ellipse
        cx="28"
        cy="23"
        rx="3.5"
        ry="5.5"
        fill="#4A7C2F"
        opacity="0.6"
        transform="rotate(40 28 23)"
      />
    </svg>
  );
}
