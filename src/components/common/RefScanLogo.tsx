import React, { useState } from "react";

interface RefScanLogoProps {
  size?: number;
  className?: string;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
  showGlow?: boolean;
}

/**
 * Reusable, rock-solid RefScan App Brand Logo component.
 * Uses high-res brand asset with an inline SVG vector fallback so it
 * NEVER breaks, clips, or renders an empty placeholder in Capacitor Android or Web.
 */
export function RefScanLogo({
  size = 32,
  className = "",
  rounded = "xl",
  showGlow = false
}: RefScanLogoProps) {
  const [imgError, setImgError] = useState(false);

  const roundedClasses = {
    sm: "rounded-md",
    md: "rounded-lg",
    lg: "rounded-xl",
    xl: "rounded-2xl",
    full: "rounded-full"
  }[rounded];

  // If the PNG loaded cleanly, display the crisp brand asset
  if (!imgError) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`relative flex-shrink-0 flex items-center justify-center overflow-hidden ${roundedClasses} ${showGlow ? "shadow-md shadow-indigo-500/25" : "shadow-xs"} ${className}`}
      >
        <img
          src="/refscan-app-icon.png"
          alt="RefScan"
          width={size}
          height={size}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover object-center select-none pointer-events-none"
          loading="eager"
        />
      </div>
    );
  }

  // High-fidelity Vector Fallback: Deep navy base, electric-blue/violet "R" document, cyan laser
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex-shrink-0 flex items-center justify-center overflow-hidden bg-[#0B0F19] ${roundedClasses} ${showGlow ? "shadow-md shadow-indigo-500/25" : "shadow-xs"} ${className}`}
      aria-label="RefScan Brand Icon"
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full p-1"
      >
        <defs>
          <linearGradient id="refscan-grad" x1="20" y1="20" x2="80" y2="85" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00D2FF" />
            <stop offset="0.5" stopColor="#5B4BDB" />
            <stop offset="1" stopColor="#7928CA" />
          </linearGradient>
          <linearGradient id="refscan-laser" x1="10" y1="50" x2="90" y2="50" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00D2FF" stopOpacity="0.2" />
            <stop offset="0.5" stopColor="#00FFFF" />
            <stop offset="1" stopColor="#00D2FF" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Scan corner brackets */}
        <path d="M 22 28 A 6 6 0 0 1 28 22 H 34" stroke="#00D2FF" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        <path d="M 78 28 A 6 6 0 0 0 72 22 H 66" stroke="#00D2FF" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        <path d="M 22 72 A 6 6 0 0 0 28 78 H 34" stroke="#7928CA" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        <path d="M 78 72 A 6 6 0 0 1 72 78 H 66" stroke="#7928CA" strokeWidth="3" strokeLinecap="round" opacity="0.6" />

        {/* Document Silhouette with Folded Corner */}
        <path
          d="M 36 24 H 60 L 72 36 V 74 A 4 4 0 0 1 68 78 H 36 A 4 4 0 0 1 32 74 V 28 A 4 4 0 0 1 36 24 Z"
          stroke="url(#refscan-grad)"
          strokeWidth="3.5"
          fill="#111827"
          fillOpacity="0.4"
          strokeLinejoin="round"
        />
        <path d="M 60 24 V 36 H 72" stroke="url(#refscan-grad)" strokeWidth="3" strokeLinejoin="round" />

        {/* Abstract "R" Monogram Curve */}
        <path
          d="M 40 40 V 68 M 40 40 H 52 C 57 40 57 48 52 48 H 40 M 49 48 L 59 68"
          stroke="#00FFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Horizontal Laser Scanning Line */}
        <line x1="16" y1="50" x2="84" y2="50" stroke="url(#refscan-laser)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default RefScanLogo;
