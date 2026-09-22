"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/components/PinLock";

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Dashboard", icon: "🏠" },
    { href: "/finanzas", label: "Finanzas", icon: "💰" },
    { href: "/habitos", label: "Hábitos", icon: "✅" },
    { href: "/estudio", label: "Estudio", icon: "📚" },
    { href: "/agenda", label: "Agenda", icon: "📅" },
    { href: "/mejora", label: "Mejora", icon: "🌱" },
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-black/90 backdrop-blur-md border-t border-white/10 z-50">
      <div className="max-w-md mx-auto flex justify-between items-center p-2 px-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center p-2 rounded-xl transition-colors ${
                isActive ? "text-white" : "text-gray-500"
              }`}
            >
              <span className="text-lg mb-1">{link.icon}</span>
              <span className="text-[9px]">{link.label}</span>
            </Link>
          );
        })}

        {/* Botón de cerrar sesión */}
        <button
          onClick={() => {
            if (confirm("¿Cerrar sesión?")) logout();
          }}
          className="flex flex-col items-center p-2 rounded-xl transition-colors text-gray-500 hover:text-red-400"
          title="Cerrar sesión"
        >
          <span className="text-lg mb-1">🔒</span>
          <span className="text-[9px]">Salir</span>
        </button>
      </div>
    </nav>
  );
}
