import React from "react";
import { Camera, ChevronDown } from "lucide-react";
import { CameraDevice } from "../../services/cameraService";

interface CameraSwitcherProps {
  cameras: CameraDevice[];
  selectedDeviceId?: string;
  onSelectCamera: (deviceId: string) => void;
  disabled?: boolean;
}

export function CameraSwitcher({
  cameras,
  selectedDeviceId,
  onSelectCamera,
  disabled
}: CameraSwitcherProps) {
  if (cameras.length <= 1) return null;

  return (
    <div className="relative inline-flex items-center">
      <div className="flex items-center gap-2 bg-[var(--surface)]/90 border border-[var(--border)] backdrop-blur-md rounded-xl px-3 py-1.5 text-xs text-[var(--text-primary)] shadow-sm">
        <Camera size={14} className="text-[var(--primary)]" />
        <select
          value={selectedDeviceId || (cameras[0]?.deviceId ?? "")}
          onChange={(e) => onSelectCamera(e.target.value)}
          disabled={disabled}
          className="appearance-none bg-transparent pr-6 text-xs text-[var(--text-primary)] font-medium focus:outline-none cursor-pointer"
        >
          {cameras.map((c, idx) => (
            <option key={c.deviceId || idx} value={c.deviceId} className="bg-[var(--surface)] text-[var(--text-primary)]">
              {c.facing === "environment" ? "📷 Rear Camera" : c.facing === "user" ? "🤳 Front Camera" : c.label || `Camera ${idx + 1}`}
            </option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-3 pointer-events-none text-[var(--text-muted)]" />
      </div>
    </div>
  );
}
