import { useState, useRef, useCallback, useEffect } from 'react';
import {
    motion,
    AnimatePresence,
    useMotionValue,
    useTransform,
    useSpring,
} from 'framer-motion';
import { AnimatedHero } from '@/components/ui/animated-hero';
import { PlanRenderer } from '@/components/plan/PlanRenderer';
import {
    PlanTOCRail,
    PlanTOCDropdown,
    useScrollSpy,
    scrollToSection,
} from '@/components/plan/PlanTOC';
import { CritiqueSummary } from '@/components/plan/CritiqueSummary';
import { ActionStack } from '@/components/plan/ActionStack';
import { InvestorQuestionsList } from '@/components/plan/InvestorQuestionCard';
import { Nav } from '@/components/layout/Nav';
import { FreePromptBanner } from '@/components/auth/FreePromptBanner';
import { slugifyIdea } from '@/lib/utils';
import type {
    BusinessPlan,
    CritiqueWithId,
    InvestorQuestion,
    SectionId,
    SectionState,
    SectionsState,
    Stage,
} from '@/lib/schema/business-plan';
import { SECTION_ORDER } from '@/lib/schema/business-plan';

type Status = 'idle' | 'generating' | 'done' | 'error';

const EXAMPLES = [
    'AI scheduling assistant for freelancers',
    'Peer-to-peer tool rental marketplace',
    'Carbon footprint tracker for online shoppers',
    'Voice journaling app with mood insights',
];

function initialSections(): SectionsState {
    const s: Partial<Record<SectionId, SectionState>> = {};
    for (const id of SECTION_ORDER) {
        s[id] = { status: 'pending' };
    }
    return s as SectionsState;
}

/**
 * Session persistence via sessionStorage.
 *
 * Honors the "no persistence" locked decision in spirit: data lives in the
 * browser tab only, is never sent to a server, and is cleared automatically
 * when the user closes the tab or hits "Start over". The point is to survive
 * accidental refreshes / Fast Refresh / tab discard — NOT to persist across
 * sessions.
 */
const STORAGE_KEY = 'forge:session:v1';
type AsyncStatus = 'idle' | 'loading' | 'done' | 'error';

interface PersistedSession {
    description: string;
    industry: string;
    stage: Stage | '';
    marketContext: string;
    sections: SectionsState;
    planData: BusinessPlan | null;
    status: Status;
    errorMessage: string;
    critiques: CritiqueWithId[];
    critiqueStatus: AsyncStatus;
    acceptedCritiqueIds: string[];
    dismissedCritiqueIds: string[];
    investorQuestions: InvestorQuestion[];
    investorQuestionsStatus: AsyncStatus;
}

function loadSession(): PersistedSession | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as PersistedSession;
    } catch {
        return null;
    }
}

function saveSession(s: PersistedSession) {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
        // Quota exceeded or storage disabled — ignore.
    }
}

function clearSession() {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), { stiffness: 200, damping: 28 });
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), { stiffness: 200, damping: 28 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
        mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    return (
        <div style={{ perspective: '900px', width: '100%' }}>
            <motion.div
                ref={ref}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ rotateX, rotateY, transformStyle: 'preserve-3d', width: '100%' }}
            >
                <div className={className}>
                    {children}
                </div>
            </motion.div>
        </div>
    );
}

export function ForgeApp() {
    const [description, setDescription] = useState('');
    const [industry, setIndustry] = useState('');
    const [stage, setStage] = useState<Stage | ''>('');
    const [marketContext, setMarketContext] = useState('');
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [sections, setSections] = useState<SectionsState>(initialSections);
    const [planData, setPlanData] = useState<BusinessPlan | null>(null);
    const [status, setStatus] = useState<Status>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [critiques, setCritiques] = useState<CritiqueWithId[]>([]);
    const [critiqueStatus, setCritiqueStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const [acceptedCritiqueIds, setAcceptedCritiqueIds] = useState<Set<string>>(new Set());
    const [dismissedCritiqueIds, setDismissedCritiqueIds] = useState<Set<string>>(new Set());
    const [investorQuestions, setInvestorQuestions] = useState<InvestorQuestion[]>([]);
    const [investorQuestionsStatus, setInvestorQuestionsStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // ── Session persistence ───────────────────────────────────────────────
    // Hydrate from sessionStorage on mount; demote in-flight states (a
    // 'generating' or 'loading' status implies a dropped stream that can't
    // resume). The state-setters inside this effect are unavoidable — SSR
    // cannot read sessionStorage, so hydration must happen post-mount.
    const [hydrated, setHydrated] = useState(false);
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        const saved = loadSession();
        if (saved) {
            setDescription(saved.description ?? '');
            setIndustry(saved.industry ?? '');
            setStage((saved.stage ?? '') as Stage | '');
            setMarketContext(saved.marketContext ?? '');
            setSections(saved.sections ?? initialSections());
            setPlanData(saved.planData ?? null);
            const hadAnyContent = Object.values(saved.sections ?? {}).some(
                (s) => (s as SectionState).status === 'done'
            );
            const restoredStatus: Status =
                saved.status === 'generating'
                    ? hadAnyContent
                        ? 'done'
                        : 'idle'
                    : saved.status ?? 'idle';
            setStatus(restoredStatus);
            setErrorMessage(saved.errorMessage ?? '');
            setCritiques(saved.critiques ?? []);
            setCritiqueStatus(
                saved.critiqueStatus === 'loading' ? 'idle' : saved.critiqueStatus ?? 'idle'
            );
            setAcceptedCritiqueIds(new Set(saved.acceptedCritiqueIds ?? []));
            setDismissedCritiqueIds(new Set(saved.dismissedCritiqueIds ?? []));
            setInvestorQuestions(saved.investorQuestions ?? []);
            setInvestorQuestionsStatus(
                saved.investorQuestionsStatus === 'loading'
                    ? 'idle'
                    : saved.investorQuestionsStatus ?? 'idle'
            );
        }
        setHydrated(true);
    }, []);
    /* eslint-enable react-hooks/set-state-in-effect */

    // ── Load saved plan from URL param (?plan_id=xxx) ───────────────────
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const planId = params.get('plan_id');
        if (!planId) return;

        fetch(`/api/plans/${planId}`, { credentials: 'include' })
            .then((res) => {
                if (!res.ok) throw new Error('Plan not found or access denied');
                return res.json();
            })
            .then((data) => {
                setPlanData(data.plan_data);
                setDescription(data.idea_description);
                setStatus('done');
                // Mark all sections as done
                const doneSections: SectionsState = {} as SectionsState;
                for (const id of SECTION_ORDER) {
                    doneSections[id] = { status: 'done' };
                }
                setSections(doneSections);
                setHydrated(true);
            })
            .catch((err) => {
                setErrorMessage(err.message || 'Failed to load plan');
                setStatus('error');
                setHydrated(true);
            });
    }, []);

    // Persist on every relevant state change once hydration is complete.
    useEffect(() => {
        if (!hydrated) return;
        saveSession({
            description,
            industry,
            stage,
            marketContext,
            sections,
            planData,
            status,
            errorMessage,
            critiques,
            critiqueStatus,
            acceptedCritiqueIds: Array.from(acceptedCritiqueIds),
            dismissedCritiqueIds: Array.from(dismissedCritiqueIds),
            investorQuestions,
            investorQuestionsStatus,
        });
    }, [
        hydrated,
        description,
        industry,
        stage,
        marketContext,
        sections,
        planData,
        status,
        errorMessage,
        critiques,
        critiqueStatus,
        acceptedCritiqueIds,
        dismissedCritiqueIds,
        investorQuestions,
        investorQuestionsStatus,
    ]);

    const sectionStatusKey = SECTION_ORDER.map(
        (id) => sections[id]?.status ?? 'pending'
    ).join('|');
    const activeSectionId = useScrollSpy(SECTION_ORDER, sectionStatusKey);

    const generate = useCallback(async () => {
        const trimmed = description.trim();
        if (!trimmed || status === 'generating') return;

        setStatus('generating');
        setSections(initialSections());
        setPlanData(null);
        setErrorMessage('');

        try {
            const body: Record<string, string> = { description: trimmed };
            if (industry.trim()) body.industry = industry.trim();
            if (stage) body.stage = stage;
            if (marketContext.trim()) body.market_context = marketContext.trim();

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                let message = 'Something went wrong. Please try again.';
                try {
                    const errBody = await response.json();
                    if (errBody?.error?.code === 'MISSING_API_KEY') {
                        message = 'API key is not configured. Please set OPENAI_API_KEY.';
                    } else if (errBody?.error?.message) {
                        message = errBody.error.message;
                    }
                } catch { /* use default */ }
                throw new Error(message);
            }

            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let lineBuffer = '';
            const currentSections = initialSections();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                lineBuffer += decoder.decode(value, { stream: true });
                const lines = lineBuffer.split('\n');
                lineBuffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = line.slice(6).trim();
                    if (payload === '[DONE]') {
                        setStatus('done');
                        return;
                    }
                    try {
                        const event = JSON.parse(payload);
                        if (event.type === 'section_start') {
                            currentSections[event.section as SectionId] = {
                                status: 'streaming',
                                data: {},
                            };
                            setSections({ ...currentSections });
                        } else if (event.type === 'section_data') {
                            const sid = event.section as SectionId;
                            currentSections[sid] = {
                                status: 'streaming',
                                data: event.data as BusinessPlan[SectionId],
                            };
                            setSections({ ...currentSections });
                        } else if (event.type === 'section_complete') {
                            const sid = event.section as SectionId;
                            // section_complete may not carry data — fall back to whatever
                            // section_data deposited (or the event.data if FastAPI does send it).
                            const prev = currentSections[sid];
                            const finalData = (event.data ??
                                (prev && (prev as { data?: unknown }).data)) as BusinessPlan[SectionId];
                            currentSections[sid] = { status: 'done', data: finalData };
                            setSections({ ...currentSections });
                            setPlanData(prevPlan => ({
                                ...prevPlan,
                                [sid]: finalData,
                            } as BusinessPlan));
                        } else if (event.type === 'error') {
                            throw new Error(event.message || 'Generation failed');
                        }
                    } catch (e) {
                        if (e instanceof SyntaxError) {
                            console.warn('Malformed JSON in stream:', e.message);
                        } else if (e instanceof Error) {
                            throw e;
                        }
                    }
                }
            }

            setStatus('done');
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
            setStatus('error');
        }
    }, [description, status, industry, stage, marketContext]);

    const reset = () => {
        setStatus('idle');
        setSections(initialSections());
        setPlanData(null);
        setErrorMessage('');
        setCritiques([]);
        setCritiqueStatus('idle');
        setAcceptedCritiqueIds(new Set());
        setDismissedCritiqueIds(new Set());
        setInvestorQuestions([]);
        setInvestorQuestionsStatus('idle');
        clearSession();
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleCritique = useCallback(async () => {
        if (!planData || critiqueStatus === 'loading') return;
        setCritiqueStatus('loading');
        try {
            const response = await fetch('/api/critique', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: planData }),
            });
            if (!response.ok) {
                let message = 'Critique failed. Please try again.';
                try {
                    const errBody = await response.json();
                    if (errBody?.error?.message) message = errBody.error.message;
                } catch { /* use default */ }
                throw new Error(message);
            }
            const data = await response.json();
            const withIds: CritiqueWithId[] = (data.critiques ?? []).map(
                (c: Omit<CritiqueWithId, 'id'>, i: number) => ({ ...c, id: `c-${i}-${Date.now()}` })
            );
            setCritiques(withIds);
            setCritiqueStatus('done');
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Critique failed. Please try again.');
            setCritiqueStatus('error');
        }
    }, [planData, critiqueStatus]);

    const handleRegenerate = useCallback(async (sectionId: SectionId, instruction?: string) => {
        if (!planData) return;
        setErrorMessage('');
        setSections(prev => ({
            ...prev,
            [sectionId]: { status: 'streaming', data: prev[sectionId]?.status === 'done' ? (prev[sectionId] as { data: BusinessPlan[SectionId] }).data : {} },
        }));
        try {
            const response = await fetch('/api/regenerate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: planData, section_id: sectionId, instruction }),
            });
            if (!response.ok) {
                let message = 'Regeneration failed.';
                try { const b = await response.json(); if (b?.error?.message) message = b.error.message; } catch { /* use default */ }
                throw new Error(message);
            }
            const data = await response.json();
            const newSectionData = data.data as BusinessPlan[SectionId];
            setSections(prev => ({
                ...prev,
                [sectionId]: { status: 'done', data: newSectionData },
            }));
            setPlanData(prev => prev ? { ...prev, [sectionId]: newSectionData } as BusinessPlan : null);
            setCritiques(prev => prev.filter(c => c.section_id !== sectionId));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Regeneration failed.';
            // Surface the error: previously the catch set errorMessage but it was
            // gated behind `status === 'error'`, so regen failures looked silent.
            console.error('[forge] regenerate failed:', err);
            setErrorMessage(message);
            setSections(prev => ({
                ...prev,
                [sectionId]: prev[sectionId]?.status === 'streaming'
                    ? { status: 'done', data: prev[sectionId]?.data ?? {} as BusinessPlan[SectionId] }
                    : prev[sectionId],
            }));
        }
    }, [planData]);

    const acceptCritique = useCallback((id: string, editedSuggestion?: string) => {
        const critique = critiques.find(c => c.id === id);
        if (!critique) return;

        // Mark accepted and capture any edits the user made before clicking Accept.
        const suggestion = editedSuggestion ?? critique.suggestion;
        setAcceptedCritiqueIds(prev => new Set(prev).add(id));
        if (editedSuggestion !== undefined) {
            setCritiques(prev => prev.map(c => c.id === id ? { ...c, suggestion: editedSuggestion } : c));
        }

        // Apply the critique by regenerating the affected section with the suggestion
        // as the instruction. Live LLM call; the section transitions to streaming.
        void handleRegenerate(
            critique.section_id,
            `Apply this critique to improve the section: ${suggestion}`
        );
    }, [critiques, handleRegenerate]);

    const dismissCritique = useCallback((id: string) => {
        setDismissedCritiqueIds(prev => new Set(prev).add(id));
    }, []);

    const handleInvestorQuestions = useCallback(async () => {
        if (!planData || investorQuestionsStatus === 'loading') return;
        setInvestorQuestionsStatus('loading');
        try {
            const response = await fetch('/api/investor-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: planData }),
            });
            if (!response.ok) {
                let message = 'Failed to generate questions. Please try again.';
                try { const b = await response.json(); if (b?.error?.message) message = b.error.message; } catch { /* use default */ }
                throw new Error(message);
            }
            const data = await response.json();
            setInvestorQuestions(data.questions ?? []);
            setInvestorQuestionsStatus('done');
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Failed to generate questions.');
            setInvestorQuestionsStatus('error');
        }
    }, [planData, investorQuestionsStatus]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') generate();
    };

    const handleDownload = async () => {
        if (!planData) return;
        const filename = `${slugifyIdea(description)}.docx`;
        try {
            const response = await fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(planData),
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
            setErrorMessage('Could not download the document. Please try again.');
        }
    };

    const hasContent = Object.values(sections).some(
        s => s.status === 'streaming' || s.status === 'done'
    );

    return (
        <div className="shell">
            <Nav />

            <AnimatePresence mode="wait">
                {status === 'idle' && (
                    <motion.main
                        key="input"
                        className="input-view"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <AnimatedHero />

                        <TiltCard className="input-card">
                            <label className="input-label" htmlFor="concept">
                                Your idea
                            </label>
                            <textarea
                                id="concept"
                                ref={inputRef}
                                className="idea-textarea"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="e.g. An app that helps remote teams track their energy and focus levels throughout the day&hellip;"
                                rows={5}
                                autoFocus
                            />

                            <button
                                type="button"
                                className="details-toggle"
                                aria-expanded={detailsOpen}
                                onClick={() => setDetailsOpen(!detailsOpen)}
                            >
                                <span className="details-toggle-icon">&#9654;</span>
                                Add details
                            </button>

                            {detailsOpen && (
                                <motion.div
                                    className="details-fields"
                                    style={{ padding: '0 2.5rem 0.75rem' }}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <div className="detail-field">
                                        <label htmlFor="industry">Industry</label>
                                        <input
                                            id="industry"
                                            type="text"
                                            placeholder="e.g. HealthTech, FinTech"
                                            value={industry}
                                            onChange={e => setIndustry(e.target.value)}
                                        />
                                    </div>
                                    <div className="detail-field">
                                        <label htmlFor="stage">Stage</label>
                                        <select
                                            id="stage"
                                            value={stage}
                                            onChange={e => setStage(e.target.value as Stage | '')}
                                        >
                                            <option value="">Select stage</option>
                                            <option value="idea">Idea</option>
                                            <option value="validation">Validation</option>
                                            <option value="growth">Growth</option>
                                        </select>
                                    </div>
                                    <div className="detail-field" style={{ gridColumn: '1 / -1' }}>
                                        <label htmlFor="market">Target market context</label>
                                        <input
                                            id="market"
                                            type="text"
                                            placeholder="e.g. Remote-first companies, 50-500 employees"
                                            value={marketContext}
                                            onChange={e => setMarketContext(e.target.value)}
                                        />
                                    </div>
                                </motion.div>
                            )}

                            <div className="input-footer">
                                <span className="input-hint">&#8984; Return to generate</span>
                                <button
                                    className="gen-btn"
                                    onClick={generate}
                                    disabled={!description.trim()}
                                >
                                    Generate &rarr;
                                </button>
                            </div>
                        </TiltCard>

                        <motion.div
                            className="examples"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <span className="examples-label">Try an example</span>
                            <div className="chips">
                                {EXAMPLES.map((ex, i) => (
                                    <motion.button
                                        key={ex}
                                        className="chip"
                                        onClick={() => setDescription(ex)}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.52 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                        whileHover={{ y: -2, scale: 1.02 }}
                                        whileTap={{ scale: 0.97 }}
                                    >
                                        {ex}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.main>
                )}

                {status !== 'idle' && (
                    <motion.main
                        key="output"
                        className="output-view"
                        initial={{ opacity: 0, rotateX: 8, y: 32 }}
                        animate={{ opacity: 1, rotateX: 0, y: 0 }}
                        exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}
                        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                        style={{ perspective: '1200px', transformOrigin: 'top center' }}
                    >
                        <div className="output-layout">
                            <aside className="plan-rail">

                            <motion.div
                                className="concept-banner"
                                initial={{ opacity: 0, x: -22 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <span className="concept-eyebrow">Your Concept</span>
                                <p className="concept-text">&ldquo;{description}&rdquo;</p>
                            </motion.div>

                            <PlanTOCRail
                                sections={sections}
                                activeSectionId={activeSectionId}
                                onJumpTo={scrollToSection}
                            />
                            <PlanTOCDropdown
                                sections={sections}
                                activeSectionId={activeSectionId}
                                onJumpTo={scrollToSection}
                            />

                            {(status === 'done' || critiques.length > 0) && (
                                <CritiqueSummary
                                    critiques={critiques}
                                    critiqueStatus={critiqueStatus}
                                    acceptedIds={acceptedCritiqueIds}
                                    dismissedIds={dismissedCritiqueIds}
                                    onRunCritique={handleCritique}
                                />
                            )}

                            <ActionStack
                                status={status}
                                hasPlan={!!planData}
                                critiqueStatus={critiqueStatus}
                                investorQuestionsStatus={investorQuestionsStatus}
                                onDownload={handleDownload}
                                onCritique={handleCritique}
                                onInvestorQuestions={handleInvestorQuestions}
                                onReset={reset}
                            />

                            {status === 'done' && (
                                <FreePromptBanner planCount={1} />
                            )}
                            </aside>

                            <div className="plan-main">

                            {status === 'generating' && !hasContent && (
                                <motion.div
                                    className="dots"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <span /><span /><span />
                                </motion.div>
                            )}

                            {hasContent && (
                                <motion.article
                                    initial={{ opacity: 0, rotateX: 6, y: 18 }}
                                    animate={{ opacity: 1, rotateX: 0, y: 0 }}
                                    transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                                    style={{ transformOrigin: 'top center', transformStyle: 'preserve-3d' }}
                                >
                                    <PlanRenderer
                                        sections={sections}
                                        critiques={critiques}
                                        acceptedCritiqueIds={acceptedCritiqueIds}
                                        dismissedCritiqueIds={dismissedCritiqueIds}
                                        onAcceptCritique={acceptCritique}
                                        onDismissCritique={dismissCritique}
                                        onRegenerate={handleRegenerate}
                                    />
                                </motion.article>
                            )}

                            {errorMessage && (
                                <motion.div
                                    className="plan-error"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    role="alert"
                                >
                                    <span>{errorMessage}</span>
                                    <button
                                        type="button"
                                        className="plan-error-dismiss"
                                        onClick={() => setErrorMessage('')}
                                        aria-label="Dismiss error"
                                    >
                                        &times;
                                    </button>
                                </motion.div>
                            )}

                            </div>
                        </div>
                    </motion.main>
                )}
            </AnimatePresence>
            <InvestorQuestionsList questions={investorQuestions} />
        </div>
    );
}
