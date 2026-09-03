import { renderAvatarSvg } from "@/lib/avatar";

export function Avatar({
  seed,
  className = "",
}: {
  seed: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      // Safe: renderAvatarSvg only interpolates a small fixed set of internal
      // hex-colour/path constants selected by a hash of `seed` — never raw input.
      dangerouslySetInnerHTML={{ __html: renderAvatarSvg(seed) }}
    />
  );
}
