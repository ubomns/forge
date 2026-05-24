import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CritiqueWithId, Severity } from '@/lib/schema/business-plan';

const SEVERITY_STYLES: Record<Severity, { bg: string; border: string; label: string }> = {
    high: {
        bg: 'var(--accent-bg)',
        border: 'var(--accent-border)',
        label: 'High',
    },
    medium: {
        bg: 'rgba(234, 179, 8, 0.08)',
        border: 'rgba(234, 179, 8, 0.25)',
        label: 'Medium',
    },
    low: {
        bg: 'rgba(120, 113, 108, 0.06)',
        border: 'rgba(120, 113, 108, 0.15)',
        label: 'Low',
    },
};

function CritiqueCard({
    critique,
    onAccept,
    onDismiss,
}: {
    critique: CritiqueWithId;
    onAccept: (id: string, editedSuggestion?: string) => void;
    onDismiss: (id: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [editedSuggestion, setEditedSuggestion] = useState(critique.suggestion);
    const style = SEVERITY_STYLES[critique.severity];

    return (
        <motion.div
            className="critique-card"
            style={{
                background: style.bg,
                borderLeft: `3px solid ${style.border}`,
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className="critique-header">
                <span className={`critique-severity critique-severity-${critique.severity}`}>
                    {style.label}
                </span>
            </div>
            <div className="critique-claim">{critique.claim}</div>
            {editing ? (
                <textarea
                    className="critique-edit-textarea"
                    value={editedSuggestion}
                    onChange={(e) => setEditedSuggestion(e.target.value)}
                    autoFocus
                />
            ) : (
                <div className="critique-suggestion">{critique.suggestion}</div>
            )}
            <div className="critique-actions">
                <button
                    className="critique-action critique-action-accept"
                    onClick={() => {
                        if (editing) {
                            onAccept(critique.id, editedSuggestion);
                        } else {
                            onAccept(critique.id);
                        }
                    }}
                >
                    {editing ? 'Accept edited' : 'Accept'}
                </button>
                {!editing ? (
                    <button
                        className="critique-action critique-action-edit"
                        onClick={() => setEditing(true)}
                    >
                        Edit
                    </button>
                ) : (
                    <button
                        className="critique-action critique-action-cancel"
                        onClick={() => {
                            setEditedSuggestion(critique.suggestion);
                            setEditing(false);
                        }}
                    >
                        Cancel
                    </button>
                )}
                <button
                    className="critique-action critique-action-dismiss"
                    onClick={() => onDismiss(critique.id)}
                >
                    Dismiss
                </button>
            </div>
        </motion.div>
    );
}

export function CritiqueOverlay({
    critiques,
    acceptedIds,
    dismissedIds,
    onAccept,
    onDismiss,
}: {
    critiques: CritiqueWithId[];
    acceptedIds: Set<string>;
    dismissedIds: Set<string>;
    onAccept: (id: string, editedSuggestion?: string) => void;
    onDismiss: (id: string) => void;
}) {
    const [showNits, setShowNits] = useState(false);

    const visible = critiques.filter(
        (c) => !acceptedIds.has(c.id) && !dismissedIds.has(c.id)
    );

    const highMedium = visible.filter((c) => c.severity === 'high' || c.severity === 'medium');
    const low = visible.filter((c) => c.severity === 'low');

    if (visible.length === 0) return null;

    return (
        <div className="critique-overlay">
            {highMedium.map((c) => (
                <CritiqueCard
                    key={c.id}
                    critique={c}
                    onAccept={onAccept}
                    onDismiss={onDismiss}
                />
            ))}

            {low.length > 0 && (
                <>
                    {showNits ? (
                        <AnimatePresence>
                            {low.map((c) => (
                                <CritiqueCard
                                    key={c.id}
                                    critique={c}
                                    onAccept={onAccept}
                                    onDismiss={onDismiss}
                                />
                            ))}
                        </AnimatePresence>
                    ) : (
                        highMedium.length > 0 && (
                            <button
                                className="nits-toggle"
                                onClick={() => setShowNits(true)}
                            >
                                +{low.length} nit{low.length > 1 ? 's' : ''}
                            </button>
                        )
                    )}
                    {showNits && (
                        <button
                            className="nits-toggle"
                            onClick={() => setShowNits(false)}
                        >
                            Hide nits
                        </button>
                    )}
                </>
            )}

            {!showNits && highMedium.length === 0 && low.length > 0 && (
                <button
                    className="nits-toggle"
                    onClick={() => setShowNits(true)}
                >
                    +{low.length} nit{low.length > 1 ? 's' : ''}
                </button>
            )}
        </div>
    );
}