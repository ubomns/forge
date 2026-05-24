import { motion } from 'framer-motion';
import type {
    CritiqueWithId,
    SectionId,
    SectionState,
    SectionsState,
} from '@/lib/schema/business-plan';
import { SECTION_DISPLAY_NAMES, SECTION_ORDER } from '@/lib/schema/business-plan';
import { CritiqueOverlay } from './CritiqueOverlay';
import { RegenerateButton } from './RegenerateButton';

type SectionRenderer = (data: Record<string, unknown>) => React.ReactNode;

function SectionField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="plan-field">
            <span className="plan-field-label">{label}</span>
            <div className="plan-field-value">{children}</div>
        </div>
    );
}

function BulletList({ items }: { items: string[] }) {
    return (
        <ul className="plan-bullets">
            {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
    );
}

const sectionRenderers: Record<SectionId, SectionRenderer> = {
    executive_summary: (data) => (
        <>
            <SectionField label="Tagline">
                <strong>{(data as { tagline: string }).tagline}</strong>
            </SectionField>
            <SectionField label="Elevator Pitch">
                {(data as { elevator_pitch: string }).elevator_pitch}
            </SectionField>
        </>
    ),
    problem: (data) => {
        const d = data as { description: string; pain_points: string[] };
        return (
            <>
                <SectionField label="Core Problem">{d.description}</SectionField>
                {d.pain_points?.length > 0 && (
                    <SectionField label="Pain Points"><BulletList items={d.pain_points} /></SectionField>
                )}
            </>
        );
    },
    solution: (data) => {
        const d = data as { description: string; key_features: string[] };
        return (
            <>
                <SectionField label="Solution">{d.description}</SectionField>
                {d.key_features?.length > 0 && (
                    <SectionField label="Key Features"><BulletList items={d.key_features} /></SectionField>
                )}
            </>
        );
    },
    market: (data) => {
        const d = data as { tam: string; sam: string; som: string; segments: string[] };
        return (
            <>
                <div className="plan-tam-row">
                    <div className="plan-tam-card">
                        <span className="plan-tam-label">TAM</span>
                        <span className="plan-tam-value">{d.tam}</span>
                    </div>
                    <div className="plan-tam-card">
                        <span className="plan-tam-label">SAM</span>
                        <span className="plan-tam-value">{d.sam}</span>
                    </div>
                    <div className="plan-tam-card">
                        <span className="plan-tam-label">SOM</span>
                        <span className="plan-tam-value">{d.som}</span>
                    </div>
                </div>
                {d.segments?.length > 0 && (
                    <SectionField label="Target Segments"><BulletList items={d.segments} /></SectionField>
                )}
            </>
        );
    },
    competition: (data) => {
        const d = data as { overview: string; advantages: string[]; competitors: string[] };
        return (
            <>
                <SectionField label="Landscape">{d.overview}</SectionField>
                {d.advantages?.length > 0 && (
                    <SectionField label="Advantages"><BulletList items={d.advantages} /></SectionField>
                )}
                {d.competitors?.length > 0 && (
                    <SectionField label="Known Competitors"><BulletList items={d.competitors} /></SectionField>
                )}
            </>
        );
    },
    go_to_market: (data) => {
        const d = data as { strategy: string; channels: string[]; milestones: string[] };
        return (
            <>
                <SectionField label="Strategy">{d.strategy}</SectionField>
                {d.channels?.length > 0 && (
                    <SectionField label="Channels"><BulletList items={d.channels} /></SectionField>
                )}
                {d.milestones?.length > 0 && (
                    <SectionField label="Milestones"><BulletList items={d.milestones} /></SectionField>
                )}
            </>
        );
    },
    business_model: (data) => {
        const d = data as { revenue_streams: string[]; pricing: string; unit_economics: string };
        return (
            <>
                {d.revenue_streams?.length > 0 && (
                    <SectionField label="Revenue Streams"><BulletList items={d.revenue_streams} /></SectionField>
                )}
                <SectionField label="Pricing">{d.pricing}</SectionField>
                <SectionField label="Unit Economics">{d.unit_economics}</SectionField>
            </>
        );
    },
    team: (data) => {
        const d = data as { needed_roles: string[]; current_gaps: string[] };
        return (
            <>
                {d.needed_roles?.length > 0 && (
                    <SectionField label="Key Roles"><BulletList items={d.needed_roles} /></SectionField>
                )}
                {d.current_gaps?.length > 0 && (
                    <SectionField label="Current Gaps"><BulletList items={d.current_gaps} /></SectionField>
                )}
            </>
        );
    },
    financials: (data) => {
        const d = data as { revenue_projection: string; key_costs: string[]; break_even: string };
        return (
            <>
                <SectionField label="Revenue Projection">{d.revenue_projection}</SectionField>
                {d.key_costs?.length > 0 && (
                    <SectionField label="Key Costs"><BulletList items={d.key_costs} /></SectionField>
                )}
                <SectionField label="Break-even">{d.break_even}</SectionField>
            </>
        );
    },
    ask: (data) => {
        const d = data as { amount: string; use_of_funds: string[]; vision: string };
        return (
            <>
                <SectionField label="Amount Sought">{d.amount}</SectionField>
                {d.use_of_funds?.length > 0 && (
                    <SectionField label="Use of Funds"><BulletList items={d.use_of_funds} /></SectionField>
                )}
                <SectionField label="Vision">{d.vision}</SectionField>
            </>
        );
    },
};

const sectionVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
};

export function PlanSection({
    sectionId,
    state,
    critiques,
    acceptedCritiqueIds,
    dismissedCritiqueIds,
    onAcceptCritique,
    onDismissCritique,
    onRegenerate,
}: {
    sectionId: SectionId;
    state: SectionState;
    critiques?: CritiqueWithId[];
    acceptedCritiqueIds?: Set<string>;
    dismissedCritiqueIds?: Set<string>;
    onAcceptCritique?: (id: string, editedSuggestion?: string) => void;
    onDismissCritique?: (id: string) => void;
    onRegenerate?: (sectionId: SectionId, instruction?: string) => void;
}) {
    if (state.status === 'pending') return null;

    const sectionCritiques = critiques?.filter((c) => c.section_id === sectionId) ?? [];

    return (
        <motion.section
            className="plan-section"
            data-section-id={sectionId}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
            <div className="plan-section-header">
                <h2 className="plan-section-title">{SECTION_DISPLAY_NAMES[sectionId]}</h2>
                {state.status === 'done' && onRegenerate && (
                    <RegenerateButton
                        onRegenerate={(instruction) => onRegenerate(sectionId, instruction)}
                    />
                )}
            </div>
            {(state.status === 'streaming' || state.status === 'done') && state.data && Object.keys(state.data).length > 0 && sectionRenderers[sectionId](state.data as Record<string, unknown>)}
            {state.status === 'streaming' && (
                <div className="plan-section-cursor" />
            )}
            {sectionCritiques.length > 0 && onAcceptCritique && onDismissCritique && (
                <CritiqueOverlay
                    critiques={sectionCritiques}
                    acceptedIds={acceptedCritiqueIds ?? new Set()}
                    dismissedIds={dismissedCritiqueIds ?? new Set()}
                    onAccept={onAcceptCritique}
                    onDismiss={onDismissCritique}
                />
            )}
        </motion.section>
    );
}

interface PlanRendererProps {
    sections: SectionsState;
    critiques?: CritiqueWithId[];
    acceptedCritiqueIds?: Set<string>;
    dismissedCritiqueIds?: Set<string>;
    onAcceptCritique?: (id: string, editedSuggestion?: string) => void;
    onDismissCritique?: (id: string) => void;
    onRegenerate?: (sectionId: SectionId, instruction?: string) => void;
}

export function PlanRenderer({ sections, critiques, acceptedCritiqueIds, dismissedCritiqueIds, onAcceptCritique, onDismissCritique, onRegenerate }: PlanRendererProps) {
    return (
        <div className="idea-content">
            {SECTION_ORDER.map((id) => (
                <PlanSection
                    key={id}
                    sectionId={id}
                    state={sections[id]}
                    critiques={critiques}
                    acceptedCritiqueIds={acceptedCritiqueIds}
                    dismissedCritiqueIds={dismissedCritiqueIds}
                    onAcceptCritique={onAcceptCritique}
                    onDismissCritique={onDismissCritique}
                    onRegenerate={onRegenerate}
                />
            ))}
        </div>
    );
}

export function PlanSkeleton() {
    return (
        <div className="idea-content streaming">
            {SECTION_ORDER.map((id) => (
                <div key={id} className="plan-section plan-section-skeleton">
                    <div className="plan-skeleton-bar plan-skeleton-title" />
                    <div className="plan-skeleton-bar" style={{ width: '80%' }} />
                    <div className="plan-skeleton-bar" style={{ width: '60%' }} />
                </div>
            ))}
        </div>
    );
}