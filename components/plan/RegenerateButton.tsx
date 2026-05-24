import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RegenerateButtonProps {
    onRegenerate: (instruction?: string) => void;
}

const PRESETS: { label: string; instruction: string }[] = [
    {
        label: 'Make more detailed',
        instruction:
            'Make this section more specific and concrete. Add detail, examples, and numbers where appropriate.',
    },
    {
        label: 'Rewrite for an angel investor',
        instruction:
            'Rewrite this section as if pitching to an angel investor. Lead with the most defensible claims and be specific about how this part fits the broader thesis.',
    },
    {
        label: 'Use concrete numbers',
        instruction:
            'Add concrete numbers, percentages, dollar amounts, and named examples wherever possible. Replace vague claims with specifics.',
    },
    {
        label: 'Tighten — fewer words',
        instruction:
            'Tighten this section. Keep only the essential points; cut filler and hedging. Aim for half the original length.',
    },
];

export function RegenerateButton({ onRegenerate }: RegenerateButtonProps) {
    const [open, setOpen] = useState(false);
    const [custom, setCustom] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const escHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('keydown', escHandler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('keydown', escHandler);
        };
    }, [open]);

    const send = (instruction?: string) => {
        onRegenerate(instruction);
        setOpen(false);
        setCustom('');
    };

    return (
        <div ref={wrapperRef} className="regen-popover-wrapper">
            <button
                className="regen-btn"
                onClick={() => setOpen((v) => !v)}
                title="Regenerate this section"
                type="button"
                aria-expanded={open}
                aria-haspopup="true"
                data-testid="regen-btn"
            >
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M1 4v6h6" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="regen-popover"
                        initial={{ opacity: 0, scale: 0.95, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -4 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        onAnimationComplete={() => {
                            if (open) inputRef.current?.focus();
                        }}
                        role="menu"
                        data-testid="regen-popover"
                    >
                        <div className="regen-popover-title">Regenerate section</div>
                        <ul className="regen-preset-list" role="none">
                            {PRESETS.map((p) => (
                                <li key={p.label} role="none">
                                    <button
                                        className="regen-preset"
                                        onClick={() => send(p.instruction)}
                                        type="button"
                                        role="menuitem"
                                    >
                                        {p.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="regen-popover-divider">Or</div>
                        <div className="regen-custom">
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Describe how to rewrite it&hellip;"
                                value={custom}
                                onChange={(e) => setCustom(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && custom.trim()) {
                                        e.preventDefault();
                                        send(custom.trim());
                                    }
                                }}
                                data-testid="regen-custom-input"
                            />
                            <button
                                className="regen-custom-send"
                                onClick={() => custom.trim() && send(custom.trim())}
                                disabled={!custom.trim()}
                                type="button"
                                aria-label="Regenerate with this instruction"
                                data-testid="regen-custom-send"
                            >
                                <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                    <polyline points="12 5 19 12 12 19" />
                                </svg>
                            </button>
                        </div>
                        <button
                            className="regen-default"
                            onClick={() => send()}
                            type="button"
                            role="menuitem"
                        >
                            Regenerate as-is
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
