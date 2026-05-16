"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/dismissed", label: "Dismissed", icon: "✅" },
  { href: "/config", label: "Config", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex z-20">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors ${
            pathname === l.href ? "text-blue-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="text-lg leading-none">{l.icon}</span>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
