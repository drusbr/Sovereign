import { Home, Minus, Plus } from "lucide-react";

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const buttonClass =
  "flex h-9 w-9 items-center justify-center border-b border-border text-text-muted transition-colors last:border-b-0 hover:bg-panel-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function MapControls({ onZoomIn, onZoomOut, onReset }: MapControlsProps) {
  return (
    <div className="absolute right-3 top-3 z-10 overflow-hidden rounded-md border border-border bg-panel/95 shadow-xl">
      <button type="button" className={buttonClass} onClick={onZoomIn} aria-label="Zoom in">
        <Plus size={16} />
      </button>
      <button type="button" className={buttonClass} onClick={onZoomOut} aria-label="Zoom out">
        <Minus size={16} />
      </button>
      <button type="button" className={buttonClass} onClick={onReset} aria-label="Reset map view">
        <Home size={15} />
      </button>
    </div>
  );
}

