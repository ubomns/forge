import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function Nav() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <motion.nav
            className={`nav${scrolled ? ' nav-scrolled' : ''}`}
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            aria-label="Forge"
        >
            <div className="nav-logo">
                <svg
                    className="nav-logo-mark"
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        d="M16 2 L28 9.5 L28 22.5 L16 30 L4 22.5 L4 9.5 Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinejoin="miter"
                        strokeMiterlimit="10"
                    />
                    <rect x="10" y="8" width="12" height="2.75" fill="#FFC000" />
                    <rect x="10" y="8" width="2.75" height="16" fill="#FFC000" />
                    <rect x="10" y="14" width="8" height="2.75" fill="#FFC000" />
                </svg>
                <span className="nav-brand">Forge</span>
            </div>
            <div className="nav-links">
                <Link href="/pricing" className="nav-link">
                    Pricing
                </Link>
            </div>
        </motion.nav>
    );
}
