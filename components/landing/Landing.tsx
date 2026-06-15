import Link from 'next/link';
import { motion } from 'framer-motion';
import { Nav } from '@/components/layout/Nav';

const SPRING_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* --- Buyer-facing differentiation cards (replaces old LockedDecisions) --- */

const DIFF_CARDS = [
    {
        title: 'Two agents, not one',
        body: "A drafter writes your plan. A separate critic — different prompt, zero knowledge of the drafter's reasoning — reviews it. Self-critique is shallow. Two calls catch what one never would.",
    },
    {
        title: 'Schema-first output',
        body: 'Your plan is a typed data structure with 10 investor-standard sections — not parsed markdown, not a wall of text. Every field is validated before you see it.',
    },
    {
        title: 'Structured severity',
        body: 'Every critique is tagged high, medium, or low. You see what matters first. The critic stays sharp without being mean or vague.',
    },
    {
        title: 'Honest framing',
        body: 'This is a pipeline: two sequential LLM calls with different prompts. Not an “autonomous agent.” Not magic. Just well-engineered first drafts.',
    },
];

/* --- Hero (static, server-renderable) ----------------------------------- */

function LandingHero() {
    return (
        <section className="landing-hero">
            <motion.h1
                className="landing-h1"
                initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.7, delay: 0.1, ease: SPRING_EASE }}
            >
                Your business idea, taken seriously.
            </motion.h1>
            <motion.p
                className="landing-sub"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25, ease: SPRING_EASE }}
            >
                Forge turns one sentence into a structured, investor-ready business
                plan&nbsp;&mdash; drafted by one AI agent, critiqued by another. No
                templates. No blank pages. No averaging.
            </motion.p>
            <motion.div
                className="landing-cta-row landing-cta-row-centered"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.4, ease: SPRING_EASE }}
            >
                <Link href="/app" className="landing-cta-primary" data-testid="landing-cta-generate">
                    Generate my plan &mdash; it&rsquo;s free &rarr;
                </Link>
                <Link href="/demo" className="landing-cta-secondary" data-testid="landing-cta-demo">
                    See a sample plan first &rarr;
                </Link>
            </motion.div>
            <motion.p
                className="landing-audience"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.55, ease: SPRING_EASE }}
            >
                Built for early-stage founders who need a credible first draft&nbsp;&mdash;
                not a generic template, and not a $3,000 consultant.
            </motion.p>
        </section>
    );
}

/* --- Problem ------------------------------------------------------------- */

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

/* --- How it works -------------------------------------------------------- */

const HOW_CARDS = [
    {
        tag: '01 · Generation',
        title: 'Schema-first, not prompt-first',
        body: 'Output is a typed BusinessPlan with 10 industry-standard sections — driven by OpenAI structured outputs with strict mode. No prose parsing, no formatting drift, no markdown surgery.',
    },
    {
        tag: '02 · Critique',
        title: 'Two separate LLM calls',
        body: "A drafter generates the plan. A separate critic — different prompt, different context, no knowledge of the drafter's reasoning — reviews it. The model can’t defend what another conversation just wrote.",
    },
    {
        tag: '03 · Severity',
        title: 'Tone via structure, not prompt',
        body: 'Every critique is tagged high / medium / low. The UI shows medium-and-above by default; low collapses under “+N nits”. Critic stays sharp without being mean.',
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
                        transition={{ duration: 0.55, delay: i * 0.08, ease: SPRING_EASE }}
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

/* --- Demo preview strip -------------------------------------------------- */

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

/* --- Buyer differentiation (was LockedDecisions) ------------------------- */

function BuyerDifferentiation() {
    return (
        <section className="landing-section landing-decisions">
            <div className="landing-section-eyebrow">What makes it different</div>
            <h2 className="landing-section-h2">
                Not another template. Not another chatbot.
            </h2>
            <p className="landing-section-body" style={{ maxWidth: 580 }}>
                Four engineering decisions that shape every plan Forge generates.
            </p>
            <div className="landing-decisions-grid">
                {DIFF_CARDS.map((d, i) => (
                    <motion.article
                        key={d.title}
                        className="buyer-diff-card"
                        aria-labelledby={`diff-title-${i}`}
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.5, delay: i * 0.06, ease: SPRING_EASE }}
                    >
                        <h4 id={`diff-title-${i}`} className="buyer-diff-title">{d.title}</h4>
                        <p className="buyer-diff-body">{d.body}</p>
                    </motion.article>
                ))}
            </div>
        </section>
    );
}

/* --- Footer CTA ---------------------------------------------------------- */

function FooterCTA() {
    return (
        <section className="landing-section landing-footer-cta">
            <h2 className="landing-footer-h2">Ready to forge yours?</h2>
            <p
                className="landing-section-body"
                style={{ maxWidth: 480, marginInline: 'auto', textAlign: 'center' }}
            >
                One sentence to start. Your first plan is free.
            </p>
            <div className="landing-cta-row landing-cta-row-centered">
                <Link href="/app" className="landing-cta-primary">
                    Generate my plan &mdash; it&rsquo;s free &rarr;
                </Link>
                <Link href="/demo" className="landing-cta-secondary">
                    See a sample plan first &rarr;
                </Link>
            </div>
        </section>
    );
}

/* --- Landing page shell -------------------------------------------------- */

export function Landing() {
    return (
        <div className="shell">
            <Nav />
            <main className="landing-main">
                <LandingHero />
                <ProblemBlock />
                <HowItWorks />
                <DemoPreviewStrip />
                <BuyerDifferentiation />
                <FooterCTA />
            </main>
        </div>
    );
}
