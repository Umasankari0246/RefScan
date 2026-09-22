import React from "react";
import { Zap, ZapOff, RefreshCw, Upload, Keyboard, X } from "lucide-react";
import { CameraDevice } from "../../services/cameraService";

interface CameraControlsProps {
  torchOn: boolean;
  hasTorch: boolean;
  cameras: CameraDevice[];
  onToggleTorch: () => void;
  onSwitchCamera: () => void;
  onUploadImage?: () => void;
  onManualInput?: () => void;
  onClose?: () => void;
  disabled?: boolean;
}

export function CameraControls({
  torchOn,
  hasTorch,
  cameras,
  onToggleTorch,
  onSwitchCamera,
  onUploadImage,
  onManualInput,
  onClose,
  disabled
}: CameraControlsProps) {
  const canSwitch = cameras.length > 1;

  return (
    <div className="flex items-center justify-center gap-2.5 sm:gap-3 p-2.5 bg-[var(--surface)]/95 backdrop-blur-md rounded-2xl border border-[var(--border)] shadow-xl">
      {/* Flash/Torch Toggle */}
      {hasTorch && (
        <button
          type="button"
          onClick={onToggleTorch}
          disabled={disabled}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 ${
            torchOn
              ? "bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.8)]"
              : "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border)]"
          }`}
          title={torchOn ? "Turn off flash" : "Turn on flash"}
        >
          {torchOn ? <Zap size={19} /> : <ZapOff size={19} />}
        </button>
      )}

      {/* Switch Camera (Front <-> Rear) */}
      {canSwitch && (
        <button
          type="button"
          onClick={onSwitchCamera}
          disabled={disabled}
          className="w-11 h-11 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border)] flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
          title="Switch Camera (Front ↔ Rear)"
        >
          <RefreshCw size={18} />
        </button>
      )}

      {/* Upload Barcode Photo */}
      {onUploadImage && (
        <button
          type="button"
          onClick={onUploadImage}
          disabled={disabled}
          className="w-11 h-11 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border)] flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
          title="Upload Barcode Photo"
        >
          <Upload size={18} />
        </button>
      )}

      {/* Enter ISBN Manually */}
      {onManualInput && (
        <button
          type="button"
          onClick={onManualInput}
          disabled={disabled}
          className="w-11 h-11 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border)] flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
          title="Enter ISBN Manually"
        >
          <Keyboard size={18} />
        </button>
      )}

      {/* Close Scanner */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="w-11 h-11 rounded-xl bg-[var(--bg-secondary)] hover:bg-rose-100 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 text-[var(--text-primary)] border border-[var(--border)] flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
          title="Exit Scanner"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
