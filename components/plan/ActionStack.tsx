type CritiqueStatus = 'idle' | 'loading' | 'done' | 'error';
type InvestorQStatus = 'idle' | 'loading' | 'done' | 'error';

interface ActionStackProps {
    status: 'done' | 'error' | 'generating' | 'idle';
    hasPlan: boolean;
    critiqueStatus: CritiqueStatus;
    investorQuestionsStatus: InvestorQStatus;
    onDownload: () => void;
    onCritique: () => void;
    onInvestorQuestions: () => void;
    onReset: () => void;
}

function DownloadIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M8 2v8m0 0l-3-3m3 3l3-3M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function StarIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
    );
}

function QuestionIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

export function ActionStack({
    status,
    hasPlan,
    critiqueStatus,
    investorQuestionsStatus,
    onDownload,
    onCritique,
    onInvestorQuestions,
    onReset,
}: ActionStackProps) {
    const downloadsEnabled = status === 'done' && hasPlan;
    const analysisEnabled = status === 'done' && hasPlan;

    return (
        <div className="action-stack" data-testid="action-stack">
            <div className="action-stack-group">
                <div className="action-stack-label">Export</div>
                <div className="action-stack-row">
                    <button
                        className="action-stack-btn action-stack-btn-primary"
                        onClick={onDownload}
                        disabled={!downloadsEnabled}
                        data-testid="action-download-docx"
                    >
                        <DownloadIcon />
                        Download .docx
                    </button>
                </div>
            </div>

            <div className="action-stack-group">
                <div className="action-stack-label">Analyze</div>
                <div className="action-stack-stack">
                    {critiqueStatus === 'idle' && (
                        <button
                            className="action-stack-btn action-stack-btn-outline"
                            onClick={onCritique}
                            disabled={!analysisEnabled}
                            data-testid="action-critique"
                        >
                            <StarIcon />
                            Critique plan
                        </button>
                    )}
                    {critiqueStatus === 'loading' && (
                        <button className="action-stack-btn action-stack-btn-outline" disabled>
                            Analyzing&hellip;
                        </button>
                    )}
                    {critiqueStatus === 'done' && (
                        <button
                            className="action-stack-btn action-stack-btn-ghost"
                            onClick={onCritique}
                            disabled={!analysisEnabled}
                            title="Re-run the critique against the current plan"
                        >
                            <StarIcon />
                            Re-run critique
                        </button>
                    )}
                    {critiqueStatus === 'error' && (
                        <button
                            className="action-stack-btn action-stack-btn-outline"
                            onClick={onCritique}
                            disabled={!analysisEnabled}
                        >
                            Retry critique
                        </button>
                    )}

                    {investorQuestionsStatus === 'idle' && (
                        <button
                            className="action-stack-btn action-stack-btn-outline"
                            onClick={onInvestorQuestions}
                            disabled={!analysisEnabled}
                            data-testid="action-investor-questions"
                        >
                            <QuestionIcon />
                            Investor questions
                        </button>
                    )}
                    {investorQuestionsStatus === 'loading' && (
                        <button className="action-stack-btn action-stack-btn-outline" disabled>
                            Generating&hellip;
                        </button>
                    )}
                    {investorQuestionsStatus === 'done' && (
                        <button
                            className="action-stack-btn action-stack-btn-ghost"
                            onClick={onInvestorQuestions}
                            disabled={!analysisEnabled}
                            title="Regenerate the investor questions"
                        >
                            <QuestionIcon />
                            Regenerate questions
                        </button>
                    )}
                </div>
            </div>

            <div className="action-stack-group action-stack-group-reset">
                <button
                    className="action-stack-btn action-stack-btn-link"
                    onClick={onReset}
                    data-testid="action-reset"
                >
                    Start over
                </button>
            </div>
        </div>
    );
}
