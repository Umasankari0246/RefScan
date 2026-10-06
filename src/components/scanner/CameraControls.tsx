import React from "react";
import { Zap, ZapOff, RefreshCw, Upload, Keyboard, X } from "lucide-react";
import { CameraDevice } from "../../services/cameraService";

interface CameraControlsProps {
  torchOn: boolean;
  hasTorch: boolean;
  cameras: CameraDevice[];
  facingMode?: "environment" | "user";
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
  facingMode = "environment",
  onToggleTorch,
  onSwitchCamera,
  onUploadImage,
  onManualInput,
  onClose,
  disabled
}: CameraControlsProps) {
  // Always allow switching between front and back camera (standard for Android/iOS mobile)
  const canSwitch = true;

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 p-2 bg-[var(--surface)]/95 backdrop-blur-md rounded-2xl border border-[var(--border)] shadow-xl">
      {/* Flash/Torch Toggle */}
      {hasTorch && (
        <button
          type="button"
          onClick={onToggleTorch}
          disabled={disabled}
          className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 ${
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
          className="min-w-[44px] min-h-[44px] px-3 h-11 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border)] flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation text-xs font-medium"
          title={facingMode === "environment" ? "Switch to Front Camera" : "Switch to Rear Camera"}
          aria-label={facingMode === "environment" ? "Switch to Front Camera" : "Switch to Rear Camera"}
        >
          <RefreshCw size={17} className={facingMode === "user" ? "rotate-180 transition-transform" : "transition-transform"} />
          <span className="hidden xs:inline sm:inline">{facingMode === "environment" ? "Rear" : "Front"}</span>
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
