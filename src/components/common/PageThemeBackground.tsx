/**
 * RefScan - Dimmed Ambient Library Background
 * Specially designed for the Home / Landing page.
 * Features a soft, dimmed, low-opacity library backdrop that never clashes with foreground typography.
 */
export function PageThemeBackground() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none" 
      aria-hidden="true"
    >
      {/* ── Base Layer: Deep, Dim, Elegant Midnight Navy Canvas ─────────────── */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, #090D1A 0%, #0F172A 40%, #161D36 75%, #0B1120 100%)",
        }}
      />

      {/* ── Layer 1: Very Light, Softly Blurred Library Bookshelf Image ──────── */}
      {/* Faint opacity (0.12) ensures it adds rich academic ambiance without competing with fonts */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 pointer-events-none"
        style={{ 
          backgroundImage: "url('/library-backdrop.jpg')",
          opacity: 0.12,
          filter: "blur(2.5px) brightness(0.75)",
        }}
      />

      {/* ── Layer 2: Deep Midnight Dimming Overlay ───────────────────────────── */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(9, 13, 26, 0.85) 0%, rgba(15, 23, 42, 0.65) 45%, rgba(9, 13, 26, 0.92) 100%)",
        }}
      />

      {/* ── Layer 3: Subtle Luminous Radial Ambient Tints ────────────────────── */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.18) 0%, transparent 60%), radial-gradient(circle at 80% 65%, rgba(147, 51, 234, 0.15) 0%, transparent 60%)",
        }}
      />

      {/* ── Layer 4: Soft Vignette for Enhanced Center Readability ────────────── */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(5, 8, 16, 0.6) 100%)",
        }}
      />
    </div>
  );
}

export default PageThemeBackground;
