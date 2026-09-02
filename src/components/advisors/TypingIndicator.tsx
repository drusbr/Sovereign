export function TypingIndicator({ color = "#64748b" }: { color?: string }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Typing">
      <span
        className="dot-pulse h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color, animationDelay: "0ms" }}
      />
      <span
        className="dot-pulse h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color, animationDelay: "160ms" }}
      />
      <span
        className="dot-pulse h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color, animationDelay: "320ms" }}
      />
    </span>
  );
}
