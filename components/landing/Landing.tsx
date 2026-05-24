import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Nav } from '@/components/layout/Nav';

const ROTATING_WORDS = ['credible', 'specific', 'structured', 'defensible', 'yours'];

function LandingHero() {
    const [index, setIndex] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setIndex((prev) => (prev + 1) % ROTATING_WORDS.length), 2200);
        return () => clearInterval(t);
    }, []);

    return (
        <section className="landing-hero">
            <motion.div
                className="landing-eyebrow"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
                Business plan generator &middot; no account &middot; no persistence
            </motion.div>
            <motion.h1
                className="landing-h1"
                initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
                First drafts that are{' '}
                <span className="landing-h1-flip" aria-live="polite">
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={ROTATING_WORDS[index]}
                            className="landing-h1-accent"
                            initial={{ rotateX: 90, opacity: 0 }}
                            animate={{ rotateX: 0, opacity: 1 }}
                            exit={{ rotateX: -90, opacity: 0 }}
                            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                            style={{ display: 'inline-block', transformOrigin: '50% 50%' }}
                        >
                            {ROTATING_WORDS[index]}
                        </motion.span>
                    </AnimatePresence>
                </span>
                .
            </motion.h1>
            <motion.p
                className="landing-sub"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
                Forge turns a one-line business idea into a typed, sectioned plan &mdash; then runs
                a separate critic agent over it to catch what an investor would catch.
            </motion.p>
            <motion.div
                className="landing-cta-row landing-cta-row-centered"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
                <Link href="/app" className="landing-cta-primary" data-testid="landing-cta-generate">
                    Generate your plan &rarr;
                </Link>
                <Link href="/demo" className="landing-cta-secondary" data-testid="landing-cta-demo">
                    See the demo &rarr;
                </Link>
            </motion.div>
        </section>
    );
}

function ProblemBlock() {
    return (
        <section className="landing-section landing-problem">
            <div className="landing-section-eyebrow">The problem</div>
            <h2 className="landing-section-h2">Blank-page anxiety, not writing time.</h2>
            <p className="landing-section-body">
                Founders waste hours staring at section headings before they start writing.
                Existing templates are too long to use or too thin to be credible. Forge is built
                around a different assumption: the cost being attacked is the blank page, not the
                words.
            </p>
            <blockquote className="landing-quote">
                &ldquo;Generic LLM prompts produce ten sections that read like the model averaging
                across every business plan it has ever seen.&rdquo;
            </blockquote>
        </section>
    );
}

const HOW_CARDS = [
    {
        tag: '01 · Generation',
        title: 'Schema-first, not prompt-first',
        body: 'Output is a typed BusinessPlan with 10 industry-standard sections — driven by OpenAI structured outputs with strict mode. No prose parsing, no formatting drift, no markdown surgery.',
    },
    {
        tag: '02 · Critique',
        title: 'Two separate LLM calls',
        body: "A drafter generates the plan. A separate critic — different prompt, different context, no knowledge of the drafter's reasoning — reviews it. The model can't defend what another conversation just wrote.",
    },
    {
        tag: '03 · Severity',
        title: 'Tone via structure, not prompt',
        body: 'Every critique is tagged high / medium / low. The UI shows medium-and-above by default; low collapses under "+N nits". Critic stays sharp without being mean.',
    },
];

function HowItWorks() {
    return (
        <section className="landing-section landing-how">
            <div className="landing-section-eyebrow">How it works</div>
            <h2 className="landing-section-h2">
                Three engineering decisions, three visible features.
            </h2>
            <div className="landing-how-grid">
                {HOW_CARDS.map((c, i) => (
                    <motion.div
                        key={c.tag}
                        className="landing-how-card"
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="landing-how-tag">{c.tag}</div>
                        <h3 className="landing-how-title">{c.title}</h3>
                        <p className="landing-how-body">{c.body}</p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}

function DemoPreviewStrip() {
    return (
        <section className="landing-section landing-preview">
            <div className="landing-section-eyebrow">What it produces</div>
            <h2 className="landing-section-h2">A typed plan, plus a sharp second opinion.</h2>
            <div className="landing-preview-row">
                <div className="landing-preview-card">
                    <div className="landing-preview-card-eyebrow">EXECUTIVE SUMMARY</div>
                    <div className="landing-preview-tagline">
                        &ldquo;Trusted childcare swaps for parents who already know each
                        other&rdquo;
                    </div>
                    <div className="landing-preview-field">
                        A coordination platform for neighborhood parent groups to formalize ad-hoc
                        childcare swaps into a managed cooperative&hellip;
                    </div>
                </div>
                <div className="landing-preview-card">
                    <div className="landing-preview-card-eyebrow">MARKET</div>
                    <div className="landing-preview-tam-row">
                        <div className="landing-preview-tam-card">
                            <span className="landing-preview-tam-label">Total Addressable Market</span>
                            <span className="landing-preview-tam-value">$48B</span>
                        </div>
                        <div className="landing-preview-tam-card">
                            <span className="landing-preview-tam-label">Serviceable Addressable Market</span>
                            <span className="landing-preview-tam-value">$3.2B</span>
                        </div>
                        <div className="landing-preview-tam-card">
                            <span className="landing-preview-tam-label">Serviceable Obtainable Market</span>
                            <span className="landing-preview-tam-value">$45M</span>
                        </div>
                    </div>
                    <div className="landing-preview-field" style={{ marginTop: '0.875rem' }}>
                        Urban/suburban parents in metro areas of 250k+ already participating in
                        informal swap arrangements.
                    </div>
                </div>
                <div className="landing-preview-card">
                    <div className="landing-preview-card-eyebrow">CRITIC</div>
                    <div className="landing-preview-critique">
                        <span className="critique-severity critique-severity-high">High</span>
                    </div>
                    <div className="landing-preview-field">
                        <strong>TAM of $48B as the &ldquo;informal childcare market.&rdquo;</strong>
                        <span
                            style={{
                                display: 'block',
                                marginTop: '0.5rem',
                                fontStyle: 'italic',
                                fontSize: '0.8125rem',
                                color: 'var(--text-2)',
                            }}
                        >
                            This is the value of unpaid labor, not a monetizable market. A
                            bottoms-up calculation gives roughly $390M.
                        </span>
                    </div>
                </div>
            </div>
            <div className="landing-preview-cta">
                <Link href="/demo" className="landing-cta-secondary">
                    See the full demo plan &rarr;
                </Link>
            </div>
        </section>
    );
}

const DECISIONS = [
    {
        title: 'Two LLM calls, not self-critique',
        body: 'A model defends what it just wrote. Self-critique is shallow. Two calls, two contexts.',
    },
    {
        title: 'No persistence, by design',
        body: 'No accounts, no DB, no saved drafts. Closing the tab loses the plan. Privacy via absence.',
    },
    {
        title: 'Severity field, not tone prompt',
        body: 'Tone-of-voice prompts produce either too-mean or encouraging-but-useless output. Structured severity does the job.',
    },
    {
        title: 'Schema before critic',
        body: 'Critic before structured outputs means rebuilding both. Build order matters.',
    },
    {
        title: 'FastAPI for orchestration',
        body: 'Frontend stays a UI, not an agent host. All LLM calls and schema validation live behind a single backend.',
    },
    {
        title: '"Two agents" is a pipeline',
        body: 'Sequential LLM calls with different prompts and contexts. Not a tool-use agent loop. Honest framing matters.',
    },
];

function LockedDecisions() {
    return (
        <section className="landing-section landing-decisions">
            <div className="landing-section-eyebrow">Locked design decisions</div>
            <h2 className="landing-section-h2">What&apos;s deliberately not here.</h2>
            <p className="landing-section-body" style={{ maxWidth: 580 }}>
                Each of these was decided once and locked. Worth seeing them written down &mdash;
                the gaps are part of the design.
            </p>
            <div className="landing-decisions-grid">
                {DECISIONS.map((d, i) => (
                    <motion.div
                        key={d.title}
                        className="landing-decision-card"
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <h4 className="landing-decision-title">{d.title}</h4>
                        <p className="landing-decision-body">{d.body}</p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}

function FooterCTA() {
    return (
        <section className="landing-section landing-footer-cta">
            <h2 className="landing-footer-h2">Ready to forge yours?</h2>
            <p
                className="landing-section-body"
                style={{ maxWidth: 480, marginInline: 'auto', textAlign: 'center' }}
            >
                One sentence to start. No account. No saved drafts.
            </p>
            <div className="landing-cta-row landing-cta-row-centered">
                <Link href="/app" className="landing-cta-primary">
                    Generate your plan &rarr;
                </Link>
                <Link href="/demo" className="landing-cta-secondary">
                    See the demo &rarr;
                </Link>
            </div>
        </section>
    );
}

export function Landing() {
    return (
        <div className="shell">
            <Nav />
            <main className="landing-main">
                <LandingHero />
                <ProblemBlock />
                <HowItWorks />
                <DemoPreviewStrip />
                <LockedDecisions />
                <FooterCTA />
            </main>
        </div>
    );
}
