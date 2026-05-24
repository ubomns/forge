import { motion } from 'framer-motion';
import type { CritiqueWithId, Severity } from '@/lib/schema/business-plan';
import { scrollToSection } from '@/components/plan/PlanTOC';

type CritiqueStatus = 'idle' | 'loading' | 'done' | 'error';

interface CritiqueSummaryProps {
    critiques: CritiqueWithId[];
    critiqueStatus: CritiqueStatus;
    acceptedIds: Set<string>;
    dismissedIds: Set<string>;
    onRunCritique: () => void;
}

const SEVERITY_LABEL: Record<Severity, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
};

const SEVERITY_COLOR: Record<Severity, string> = {
    high: 'var(--accent)',
    medium: 'rgba(234, 179, 8, 0.85)',
    low: 'rgba(120, 113, 108, 0.5)',
};

export function CritiqueSummary({
    critiques,
    critiqueStatus,
    acceptedIds,
    dismissedIds,
    onRunCritique,
}: CritiqueSummaryProps) {
    const visible = critiques.filter(
        (c) => !acceptedIds.has(c.id) && !dismissedIds.has(c.id)
    );

    const counts: Record<Severity, number> = {
        high: visible.filter((c) => c.severity === 'high').length,
        medium: visible.filter((c) => c.severity === 'medium').length,
        low: visible.filter((c) => c.severity === 'low').length,
    };

    const total = counts.high + counts.medium + counts.low;

    const jumpToFirst = (severity: Severity) => {
        const first = visible.find((c) => c.severity === severity);
        if (first) scrollToSection(first.section_id);
    };

    if (critiqueStatus === 'idle') {
        return (
            <div className="critique-summary critique-summary-idle">
                <div className="critique-summary-header">Critique</div>
                <p className="critique-summary-hint">
                    Run a second LLM call to flag what an investor would.
                </p>
                <button
                    className="critique-summary-cta"
                    onClick={onRunCritique}
                    type="button"
                    data-testid="critique-summary-run"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    Run critique
                </button>
            </div>
        );
    }

    if (critiqueStatus === 'loading') {
        return (
            <div className="critique-summary critique-summary-loading">
                <div className="critique-summary-header">Critique</div>
                <div className="critique-summary-skeleton">
                    <span /><span /><span />
                </div>
                <p className="critique-summary-hint">Analyzing&hellip;</p>
            </div>
        );
    }

    if (critiqueStatus === 'error') {
        return (
            <div className="critique-summary critique-summary-error">
                <div className="critique-summary-header">Critique</div>
                <p className="critique-summary-hint">Critique failed.</p>
                <button className="critique-summary-cta" onClick={onRunCritique} type="button">
                    Retry
                </button>
            </div>
        );
    }

    // critiqueStatus === 'done'
    if (total === 0 && critiques.length === 0) {
        return (
            <div className="critique-summary critique-summary-clean">
                <div className="critique-summary-header">Critique</div>
                <p className="critique-summary-hint">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 6 }} aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    No critiques flagged.
                </p>
            </div>
        );
    }

    if (total === 0) {
        return (
            <div className="critique-summary critique-summary-clean">
                <div className="critique-summary-header">Critique</div>
                <p className="critique-summary-hint">
                    All {critiques.length} critique{critiques.length === 1 ? '' : 's'} resolved.
                </p>
            </div>
        );
    }

    return (
        <div className="critique-summary" data-testid="critique-summary">
            <div className="critique-summary-header">Critique</div>

            <div className="critique-summary-bar" role="img" aria-label={`${counts.high} high, ${counts.medium} medium, ${counts.low} low`}>
                {(['high', 'medium', 'low'] as Severity[]).map((sev) => {
                    if (counts[sev] === 0) return null;
                    const pct = (counts[sev] / total) * 100;
                    return (
                        <motion.span
                            key={sev}
                            className={`critique-summary-bar-seg critique-summary-bar-seg-${sev}`}
                            style={{ background: SEVERITY_COLOR[sev] }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            title={`${counts[sev]} ${sev}`}
                        />
                    );
                })}
            </div>

            <ul className="critique-summary-counts">
                {(['high', 'medium', 'low'] as Severity[]).map((sev) => (
                    <li key={sev}>
                        <button
                            type="button"
                            className={`critique-summary-count critique-summary-count-${sev}`}
                            onClick={() => jumpToFirst(sev)}
                            disabled={counts[sev] === 0}
                            data-testid={`critique-summary-count-${sev}`}
                        >
                            <span
                                className="critique-summary-count-swatch"
                                style={{ background: SEVERITY_COLOR[sev] }}
                                aria-hidden="true"
                            />
                            <span className="critique-summary-count-label">{SEVERITY_LABEL[sev]}</span>
                            <span className="critique-summary-count-value">{counts[sev]}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
