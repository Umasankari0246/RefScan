import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

/**
 * Returns parent route for hierarchical Android back navigation
 */
export function getParentRoute(pathname: string): string | null {
  // Detail & sub-pages
  if (pathname.startsWith("/references/") && pathname !== "/references") return "/references";
  if (pathname.startsWith("/book/")) return "/references";
  if (pathname.startsWith("/analysis/") && pathname !== "/analysis") return "/papers";
  if (pathname === "/upload") return "/papers";
  if (pathname === "/collection") return "/references";
  if (pathname === "/saved-citations") return "/citations";
  if (pathname === "/compare") return "/papers";
  if (pathname === "/saved") return "/papers";
  if (pathname === "/gaps") return "/papers";
  if (pathname === "/sites") return "/papers";
  if (pathname === "/insights") return "/dashboard";
  if (pathname === "/scan") return "/dashboard";
  if (pathname === "/settings") return "/dashboard";
  if (pathname === "/help") return "/dashboard";
  if (pathname === "/citations") return "/dashboard";
  if (pathname === "/references") return "/dashboard";
  if (pathname === "/papers") return "/dashboard";

  // Auth & public pages
  if (pathname === "/login" || pathname === "/register") return "/";

  return null;
}

/**
 * Identifies root routes where double-back-to-exit should trigger
 */
export function isRootRoute(pathname: string): boolean {
  return pathname === "/dashboard" || pathname === "/" || pathname === "/login";
}

interface AndroidBackHandlerProps {
  onInterceptBack?: () => boolean; // returns true if intercepted (e.g. drawer or modal closed)
}

/**
 * Native Android System Back Button Handler for Capacitor
 *
 * Implements:
 * 1. Modal/drawer close on back press
 * 2. Hierarchical & history back navigation for sub-pages & detail views
 * 3. Double-back-to-exit with toast confirmation at root/dashboard
 * 4. Proper cleanup on component unmount
 */
export function AndroidBackHandler({ onInterceptBack }: AndroidBackHandlerProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [exitToast, setExitToast] = useState(false);
  const toastTimeoutRef = useRef<any>(null);
  const lastBackPressTimeRef = useRef<number>(0);
  const historyStackRef = useRef<string[]>([location.pathname]);

  // Keep track of visited paths within this RefScan session
  useEffect(() => {
    const current = location.pathname;
    const stack = historyStackRef.current;
    if (stack.length === 0 || stack[stack.length - 1] !== current) {
      stack.push(current);
    }
  }, [location.pathname]);

  useEffect(() => {
    // Only register on native platforms (or where Capacitor App is supported)
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let isSubscribed = true;

    const setupListener = async () => {
      try {
        const handle = await App.addListener("backButton", async () => {
          if (!isSubscribed) return;

          // 1. Check if caller intercepted back (e.g. mobile drawer open)
          if (onInterceptBack && onInterceptBack()) {
            return;
          }

          // Check if AI Chatbot window is open
          const closeChatBtn = document.querySelector('button[title="Minimize chat"]') as HTMLButtonElement | null;
          if (closeChatBtn) {
            closeChatBtn.click();
            return;
          }

          const currentPath = location.pathname;
          const stack = historyStackRef.current;

          // 2. Check if we are at the root route (/dashboard, /, /login)
          const atRoot = isRootRoute(currentPath);

          if (atRoot) {
            const now = Date.now();
            if (now - lastBackPressTimeRef.current < 2000) {
              // User pressed Back twice within 2 seconds: Exit app cleanly
              await App.exitApp();
            } else {
              // First press on root: show double-back-to-exit indicator
              lastBackPressTimeRef.current = now;
              setExitToast(true);
              if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
              toastTimeoutRef.current = setTimeout(() => {
                if (isSubscribed) setExitToast(false);
              }, 2000);
            }
            return;
          }

          // 3. Nested / detail page hierarchy check
          const parentRoute = getParentRoute(currentPath);

          // If current is a nested page (e.g. /references/:id, /analysis/:id, /book/:id),
          // prioritize navigating back to its designated parent list page
          if (
            currentPath.startsWith("/references/") ||
            currentPath.startsWith("/book/") ||
            currentPath.startsWith("/analysis/") ||
            currentPath === "/upload"
          ) {
            if (parentRoute) {
              stack.pop();
              navigate(parentRoute);
              return;
            }
          }

          // 4. General browser/router history navigation
          if (stack.length > 1) {
            stack.pop(); // remove current
            const prev = stack.pop(); // get previous
            if (prev) {
              navigate(prev);
              return;
            }
          }

          // 5. Fallback to parent or dashboard
          if (parentRoute) {
            navigate(parentRoute);
          } else {
            navigate("/dashboard");
          }
        });

        return () => {
          handle.remove();
        };
      } catch (err) {
        console.warn("[AndroidBackHandler] Could not register listener:", err);
      }
    };

    const cleanupPromise = setupListener();

    return () => {
      isSubscribed = false;
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      cleanupPromise.then((clean) => clean && clean());
    };
  }, [location.pathname, navigate, onInterceptBack]);

  if (!exitToast) return null;

  return (
    <div className="fixed bottom-20 inset-x-0 flex justify-center z-50 pointer-events-none animate-in fade-in duration-150 no-print">
      <div className="bg-[#172554]/95 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-white/20 backdrop-blur-md">
        Press back again to exit
      </div>
    </div>
  );
}

export default AndroidBackHandler;
