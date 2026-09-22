"use client";

import { useState, useEffect, useCallback } from "react";

const PIN_KEY = "lifeOs_pin_auth";
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutos en ms

function isSessionValid(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(PIN_KEY);
  if (!raw) return false;
  try {
    const { ts } = JSON.parse(raw);
    return Date.now() - ts < SESSION_DURATION;
  } catch {
    return false;
  }
}

function saveSession() {
  if (typeof window === "undefined") return;
  localStorage.setItem(PIN_KEY, JSON.stringify({ ts: Date.now() }));
}

export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PIN_KEY);
  window.location.href = "/";
}

interface PinLockProps {
  children: React.ReactNode;
}

export default function PinLock({ children }: PinLockProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  // Chequear sesión al montar
  useEffect(() => {
    setAuthenticated(isSessionValid());
    setChecking(false);
  }, []);

  // Auto-logout cuando vence la sesión
  useEffect(() => {
    if (!authenticated) return;
    const remaining = (() => {
      const raw = localStorage.getItem(PIN_KEY);
      if (!raw) return 0;
      try {
        const { ts } = JSON.parse(raw);
        return SESSION_DURATION - (Date.now() - ts);
      } catch {
        return 0;
      }
    })();

    const timer = setTimeout(() => {
      logout();
    }, remaining > 0 ? remaining : 0);

    return () => clearTimeout(timer);
  }, [authenticated]);

  const handleDigit = useCallback((digit: string) => {
    setError(false);
    setPin((prev) => {
      const next = prev + digit;
      if (next.length === 6) {
        if (next === "134612") {
          saveSession();
          setAuthenticated(true);
        } else {
          setShake(true);
          setError(true);
          setTimeout(() => {
            setShake(false);
            setPin("");
          }, 600);
          return next; // se resetea arriba
        }
        return "";
      }
      return next;
    });
  }, []);

  const handleDelete = useCallback(() => {
    setError(false);
    setPin((prev) => prev.slice(0, -1));
  }, []);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authenticated) {
    return <>{children}</>;
  }

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black px-6">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon.jpg"
          alt="Life OS"
          className="w-24 h-24 rounded-3xl shadow-[0_0_40px_rgba(34,211,238,0.3)] border border-white/10"
        />
        <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
          Life OS
        </h1>
        <p className="text-gray-500 text-sm">Ingresa tu PIN de acceso</p>
      </div>

      {/* Puntos del PIN */}
      <div className={`flex gap-4 mb-8 ${shake ? "animate-shake" : ""}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              i < pin.length
                ? error
                  ? "bg-red-500 border-red-500"
                  : "bg-cyan-400 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                : "border-gray-600 bg-transparent"
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm mb-4 font-semibold">PIN incorrecto. Intenta de nuevo.</p>
      )}

      {/* Teclado numérico */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
        {digits.map((d, i) => {
          if (d === "") {
            return <div key={i} />;
          }
          if (d === "⌫") {
            return (
              <button
                key={i}
                onClick={handleDelete}
                className="h-16 rounded-2xl bg-card border border-white/10 text-white text-2xl font-bold flex items-center justify-center active:scale-95 transition-transform hover:bg-white/10"
              >
                ⌫
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => handleDigit(d)}
              className="h-16 rounded-2xl bg-card border border-white/10 text-white text-2xl font-black flex items-center justify-center active:scale-95 transition-transform hover:bg-white/10 hover:border-cyan-500/40"
            >
              {d}
            </button>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
