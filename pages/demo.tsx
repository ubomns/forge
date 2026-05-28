import { useState } from 'react';
import type { GetStaticProps } from 'next';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Nav } from '@/components/layout/Nav';
import { PlanRenderer } from '@/components/plan/PlanRenderer';
import { InvestorQuestionsList } from '@/components/plan/InvestorQuestionCard';
import { slugifyIdea } from '@/lib/utils';
import demoPlanJson from '@/lib/fixtures/demo-plan.json';
import type {
    BusinessPlan,
    Critique,
    CritiqueWithId,
    InvestorQuestion,
    SectionsState,
} from '@/lib/schema/business-plan';
import { SECTION_ORDER } from '@/lib/schema/business-plan';

interface DemoData {
    source: { fixture_id?: string; label: string; note?: string };
    input: { description: string; industry?: string; stage?: string; market_context?: string };
    plan: BusinessPlan;
    critiques: Critique[];
    investor_questions: InvestorQuestion[];
    frozen_at: string;
}

interface DemoProps {
    demo: DemoData;
}

export const getStaticProps: GetStaticProps<DemoProps> = async () => {
    return {
        props: { demo: demoPlanJson as unknown as DemoData },
    };
};

function buildSectionsState(plan: BusinessPlan): SectionsState {
    const s = {} as SectionsState;
    for (const id of SECTION_ORDER) {
        const data = plan[id];
        s[id] = data ? { status: 'done', data } : { status: 'pending' };
    }
    return s;
}

export default function Demo({ demo }: DemoProps) {
    const [acceptedCritiqueIds, setAcceptedCritiqueIds] = useState<Set<string>>(new Set());
    const [dismissedCritiqueIds, setDismissedCritiqueIds] = useState<Set<string>>(new Set());
    const [downloadError, setDownloadError] = useState('');

    const sections = buildSectionsState(demo.plan);
    const critiques: CritiqueWithId[] = demo.critiques.map((c, i) => ({
        ...c,
        id: `demo-c-${i}`,
    }));

    const accept = (id: string, editedSuggestion?: string) => {
        setAcceptedCritiqueIds((prev) => new Set(prev).add(id));
        if (editedSuggestion !== undefined) {
            // demo state — note we don't mutate the source fixture
        }
    };

    const dismiss = (id: string) => {
        setDismissedCritiqueIds((prev) => new Set(prev).add(id));
    };

    const download = async () => {
        const filename = `${slugifyIdea(demo.input.description, 'forge-demo-plan')}.docx`;
        setDownloadError('');
        try {
            const response = await fetch('/api/export-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(demo.plan),
            });
            if (!response.ok) throw new Error('Export failed');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            setDownloadError('Download failed. Is FastAPI running?');
        }
    };

    return (
        <div className="shell">
            <Nav />
            <main className="output-view">
                <div className="output-inner">
                    <motion.div
                        className="demo-banner"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        data-testid="demo-banner"
                    >
                        <span className="demo-banner-tag">DEMO PLAN</span>
                        <span className="demo-banner-text">
                            Pre-generated example.{' '}
                            <Link href="/app" className="demo-banner-link">
                                Generate your own &rarr;
                            </Link>
                        </span>
                    </motion.div>

                    <motion.div
                        className="concept-banner"
                        initial={{ opacity: 0, x: -22 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <span className="concept-eyebrow">The Idea</span>
                        <p className="concept-text">&ldquo;{demo.input.description}&rdquo;</p>
                    </motion.div>

                    <motion.article
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <PlanRenderer
                            sections={sections}
                            critiques={critiques}
                            acceptedCritiqueIds={acceptedCritiqueIds}
                            dismissedCritiqueIds={dismissedCritiqueIds}
                            onAcceptCritique={accept}
                            onDismissCritique={dismiss}
                        />
                    </motion.article>

                    {downloadError && (
                        <motion.div
                            className="plan-error"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {downloadError}
                        </motion.div>
                    )}

                    <motion.div
                        className="done-bar"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button className="download-btn" onClick={download} data-testid="demo-download-docx">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <path d="M8 2v8m0 0l-3-3m3 3l3-3M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Download .docx
                            </button>
                            <span className="demo-disabled-hint" title="Re-running the critic or regenerating sections requires a live model call. Generate your own plan to use them.">
                                Critique &amp; regenerate live in <Link href="/app" className="demo-banner-link">/app</Link>
                            </span>
                        </div>
                        <Link className="restart-btn" href="/app">
                            Try your own &rarr;
                        </Link>
                    </motion.div>

                    <InvestorQuestionsList questions={demo.investor_questions} />

                    {demo.source.note && (
                        <div className="demo-source-note">
                            <strong>Note:</strong> {demo.source.note}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
