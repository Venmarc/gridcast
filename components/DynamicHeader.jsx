"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

export default function DynamicHeader() {
    const [showNavLogo, setShowNavLogo] = useState(false);

    useEffect(() => {
        const hero = document.getElementById('hero');
        if (!hero) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setShowNavLogo(!entry.isIntersecting); // true = scrolled past hero
            },
            {
                threshold: 0.1,           // trigger as soon as any part of hero leaves
                rootMargin: '-80px 0px 0px 0px' // offset for your navbar height
            }
        );

        observer.observe(hero);
        return () => observer.disconnect();
    }, []);

    return (
        <header
            className={`flex items-center justify-between z-50 sticky top-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${showNavLogo
                ? "py-3 md:py-4 bg-slate-950/90 backdrop-blur-md border-b border-slate-700/50 shadow-2xl"
                : "py-3 md:py-4 bg-transparent border-b border-transparent"
                }`}
        >
            <div
                className={`flex items-center gap-3 transition-all duration-500 ease-out ${showNavLogo
                    ? "opacity-100 scale-100 translate-x-0"
                    : "opacity-0 scale-95 -translate-x-8 pointer-events-none"
                    }`}
            >
                <Image
                    src="/icon.svg"
                    alt="GridCast Logo"
                    width={40}
                    height={40}
                    priority
                    className="rounded-xl drop-shadow-sm transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] group-hover:-translate-y-1"
                />
                <span
                    className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent transition-all duration-500 group-hover:drop-shadow-[0_0_16px_rgba(52,211,153,0.3)] text-2xl md:text-3xl"
                >
                    GridCast
                </span>
            </div>

            <div className="flex items-center gap-4 md:gap-8 transition-opacity duration-500 opacity-100">
                <nav className="hidden md:flex items-center gap-6 text-sm md:text-base font-medium text-slate-300">
                    <a href="#about" className="hover:text-blue-400 transition-colors">
                        About
                    </a>
                    <a href="#contact" className="hover:text-blue-400 transition-colors">
                        Contact
                    </a>
                </nav>
                <div
                    id="header-bell-portal"
                    className="flex items-center justify-center pl-0 md:pl-4 md:border-l border-slate-700/50"
                ></div>
            </div>
        </header>
    );
}
