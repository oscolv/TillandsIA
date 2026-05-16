/**
 * Marca visual de TillandsIA — carga `public/icons/favicon.svg` para que
 * favicon, header y apple-touch-icon compartan una sola fuente de verdad.
 */
export function BrandLogo({
  className,
  title = "TillandsIA",
}: {
  className?: string;
  title?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/favicon.svg"
      alt={title}
      className={className}
      width={32}
      height={32}
      decoding="async"
    />
  );
}
