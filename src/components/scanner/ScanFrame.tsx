import React from "react";

interface ScanFrameProps {
  isScanning: boolean;
  detected?: boolean;
}

export function ScanFrame({ isScanning, detected }: ScanFrameProps) {
  return (
    <div className="relative w-72 h-44 sm:w-80 sm:h-48 select-none pointer-events-none flex items-center justify-center">
      {/* 4 Corner Markers */}
      <div className={`absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 rounded-tl-lg transition-colors duration-200 ${detected ? "border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" : "border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.8)]"}`} />
      <div className={`absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 rounded-tr-lg transition-colors duration-200 ${detected ? "border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" : "border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.8)]"}`} />
      <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 rounded-bl-lg transition-colors duration-200 ${detected ? "border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" : "border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.8)]"}`} />
      <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 rounded-br-lg transition-colors duration-200 ${detected ? "border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" : "border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.8)]"}`} />

      {/* Subtle Central Crosshair & Guide */}
      <div className="w-12 h-0.5 bg-white/40 rounded" />
      <div className="h-12 w-0.5 bg-white/40 rounded absolute" />

      {/* Animated Scan Line */}
      {isScanning && !detected && (
        <div className="absolute inset-x-3 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent scan-line" />
      )}

      {/* Success Pulse on Detection */}
      {detected && (
        <div className="absolute inset-2 border-2 border-emerald-400/90 rounded-xl bg-emerald-500/20 animate-pulse shadow-[0_0_20px_rgba(52,211,153,0.5)]" />
      )}
    </div>
  );
}
