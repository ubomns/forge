import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SectionId, SectionsState } from '@/lib/schema/business-plan';
import { SECTION_DISPLAY_NAMES, SECTION_ORDER } from '@/lib/schema/business-plan';

interface PlanTOCProps {
    sections: SectionsState;
    activeSectionId: SectionId | null;
    onJumpTo: (id: SectionId) => void;
    variant?: 'rail' | 'dropdown';
}

function StatusIcon({ status }: { status: 'pending' | 'streaming' | 'done' }) {
    if (status === 'done') {
        return (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
            </svg>
        );
    }
    if (status === 'streaming') {
        return (
            <span className="plan-toc-streaming">
                <span /><span /><span />
            </span>
        );
    }
    return <span className="plan-toc-pending-dot" aria-hidden="true" />;
}

function PlanTOCList({ sections, activeSectionId, onJumpTo }: PlanTOCProps) {
    return (
        <ul className="plan-toc-list" role="list">
            {SECTION_ORDER.map((id) => {
                const state = sections[id];
                const status = state?.status ?? 'pending';
                const isActive = activeSectionId === id;
                const isClickable = status !== 'pending';
                return (
                    <li key={id}>
                        <button
                            type="button"
                            className={`plan-toc-item plan-toc-item-${status}${isActive ? ' plan-toc-item-active' : ''}`}
                            onClick={() => isClickable && onJumpTo(id)}
                            disabled={!isClickable}
                            data-section-target={id}
                        >
                            <span className="plan-toc-status">
                                <StatusIcon status={status} />
                            </span>
                            <span className="plan-toc-label">{SECTION_DISPLAY_NAMES[id]}</span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

export function PlanTOCRail(props: PlanTOCProps) {
    return (
        <nav className="plan-toc-rail" aria-label="Plan sections">
            <div className="plan-toc-header">Plan sections</div>
            <PlanTOCList {...props} />
        </nav>
    );
}

export function PlanTOCDropdown(props: PlanTOCProps) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const completedCount = SECTION_ORDER.filter((id) => props.sections[id]?.status === 'done').length;
    const streamingCount = SECTION_ORDER.filter((id) => props.sections[id]?.status === 'streaming').length;

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div className="plan-toc-dropdown" ref={wrapperRef}>
            <button
                type="button"
                className="plan-toc-dropdown-trigger"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                <span className="plan-toc-dropdown-label">
                    Plan sections
                </span>
                <span className="plan-toc-dropdown-count">
                    {completedCount}/{SECTION_ORDER.length}
                    {streamingCount > 0 && <span className="plan-toc-dropdown-streaming"> · {streamingCount} streaming</span>}
                </span>
                <span className="plan-toc-dropdown-chevron" aria-hidden="true">
                    {open ? '▴' : '▾'}
                </span>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="plan-toc-dropdown-panel"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <PlanTOCList
                            {...props}
                            onJumpTo={(id) => {
                                props.onJumpTo(id);
                                setOpen(false);
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function useScrollSpy(sectionIds: SectionId[], triggerKey: string): SectionId | null {
    const [activeId, setActiveId] = useState<SectionId | null>(null);

    useEffect(() => {
        const visible = new Set<SectionId>();
        const observers: IntersectionObserver[] = [];

        // Tiny delay to give the DOM time to mount any newly-rendered section elements.
        const setupTimer = window.setTimeout(() => {
            sectionIds.forEach((id) => {
                const el = document.querySelector(`[data-section-id="${id}"]`);
                if (!el) return;
                const obs = new IntersectionObserver(
                    ([entry]) => {
                        if (entry.isIntersecting) {
                            visible.add(id);
                        } else {
                            visible.delete(id);
                        }
                        const first = sectionIds.find((sid) => visible.has(sid));
                        setActiveId(first ?? null);
                    },
                    { rootMargin: '-15% 0px -65% 0px' }
                );
                obs.observe(el);
                observers.push(obs);
            });
        }, 80);

        return () => {
            window.clearTimeout(setupTimer);
            observers.forEach((o) => o.disconnect());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sectionIds.join(','), triggerKey]);

    return activeId;
}

export function scrollToSection(id: SectionId) {
    const el = document.querySelector(`[data-section-id="${id}"]`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const targetY = window.scrollY + rect.top - 80; // offset for sticky nav
    window.scrollTo({ top: targetY, behavior: 'smooth' });
}
