import { motion } from 'framer-motion';

export function Nav() {
    return (
        <motion.nav
            className="nav"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className="nav-logo">
                <svg className="nav-logo-mark" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M16 2 L28 9.5 L28 22.5 L16 30 L4 22.5 L4 9.5 Z" stroke="currentColor" strokeWidth="1.5" fill="rgba(224,48,48,0.09)" strokeLinejoin="round"/>
                    <path d="M16 10 L19.5 16 L16 22 L12.5 16 Z" fill="currentColor"/>
                    <circle cx="16" cy="10" r="1.5" fill="currentColor" opacity="0.5"/>
                </svg>
                <span className="nav-brand">Forge</span>
            </div>
        </motion.nav>
    );
}
