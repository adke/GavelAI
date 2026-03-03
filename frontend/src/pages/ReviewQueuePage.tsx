import { useState, useEffect } from 'react';
import { getReviewQueue, getReviewQueueStats, submitHumanVerdict } from '../api';
import type { ReviewItem, ReviewQueueStats, VerdictType, EscalationReason } from '../types';
import Toast from '../components/Toast';

const REASON_LABELS: Record<EscalationReason, string> = {
  low_confidence: 'Low Confidence',
  judge_disagreement: 'Judge Disagreement',
  inconclusive: 'Inconclusive',
};

const REASON_COLORS: Record<EscalationReason, string> = {
  low_confidence: 'bg-amber-100 text-amber-800',
  judge_disagreement: 'bg-red-100 text-red-800',
  inconclusive: 'bg-gray-100 text-gray-700',
};

function VerdictBadge({ verdict }: { verdict: string }) {
  const classes: Record<string, string> = {
    pass: 'badge-pass',
    fail: 'badge-fail',
    inconclusive: 'badge-inconclusive',
  };
  return <span className={`badge ${classes[verdict] || 'badge-inconclusive'}`}>{verdict}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    overridden: 'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

export default function ReviewQueuePage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewQueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [reasonFilter, setReasonFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Per-item review form state
  const [reviewForms, setReviewForms] = useState<Record<number, {
    verdict: VerdictType;
    comment: string;
    reviewedBy: string;
  }>>({});

  useEffect(() => {
    loadData();
  }, [statusFilter, reasonFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsData, statsData] = await Promise.all([
        getReviewQueue({
          status: statusFilter || undefined,
          reason: reasonFilter || undefined,
        }),
        getReviewQueueStats(),
      ]);
      setItems(itemsData);
      setStats(statsData);
    } catch (error) {
      setToast({
        type: 'error',
        message: 'Failed to load review queue: ' + (error instanceof Error ? error.message : 'Unknown error'),
      });
    } finally {
      setLoading(false);
    }
  };

  const getFormState = (itemId: number) =>
    reviewForms[itemId] || { verdict: 'pass' as VerdictType, comment: '', reviewedBy: '' };

  const updateForm = (itemId: number, patch: Partial<{ verdict: VerdictType; comment: string; reviewedBy: string }>) => {
    setReviewForms(prev => ({
      ...prev,
      [itemId]: { ...getFormState(itemId), ...patch },
    }));
  };

  const handleSubmitVerdict = async (itemId: number) => {
    const form = getFormState(itemId);
    if (!form.reviewedBy.trim()) {
      setToast({ type: 'error', message: 'Reviewer name is required' });
      return;
    }
    try {
      await submitHumanVerdict(itemId, {
        verdict: form.verdict,
        comment: form.comment || undefined,
        reviewed_by: form.reviewedBy,
      });
      setToast({ type: 'success', message: 'Verdict submitted successfully' });
      setReviewForms(prev => {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      });
      await loadData();
    } catch (error) {
      setToast({
        type: 'error',
        message: 'Failed to submit verdict: ' + (error instanceof Error ? error.message : 'Unknown error'),
      });
    }
  };

  const handleQuickApprove = async (item: ReviewItem) => {
    const majorityVerdict = getMajorityVerdict(item);
    try {
      await submitHumanVerdict(item.id, {
        verdict: majorityVerdict,
        reviewed_by: 'quick-review',
      });
      setToast({ type: 'success', message: `Approved as "${majorityVerdict}"` });
      await loadData();
    } catch (error) {
      setToast({
        type: 'error',
        message: 'Failed to approve: ' + (error instanceof Error ? error.message : 'Unknown error'),
      });
    }
  };

  const getMajorityVerdict = (item: ReviewItem): VerdictType => {
    if (item.evaluations.length === 0) return 'inconclusive';
    const counts: Record<string, number> = {};
    for (const e of item.evaluations) {
      counts[e.verdict] = (counts[e.verdict] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as VerdictType;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Review Queue</h1>
        <p className="text-gray-500 mt-1">Evaluate escalated items that need human judgment</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="stat-card">
            <div className="text-sm font-medium text-gray-500">Pending Review</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.total_pending}</div>
          </div>
          <div className="stat-card">
            <div className="text-sm font-medium text-gray-500">Total Reviewed</div>
            <div className="text-2xl font-bold text-blue-600">{stats.total_reviewed}</div>
          </div>
          <div className="stat-card">
            <div className="text-sm font-medium text-gray-500">Approved</div>
            <div className="text-2xl font-bold text-green-600">{stats.approved_count}</div>
          </div>
          <div className="stat-card">
            <div className="text-sm font-medium text-gray-500">Overridden</div>
            <div className="text-2xl font-bold text-purple-600">{stats.overridden_count}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              className="input text-sm"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="overridden">Overridden</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Escalation Reason</label>
            <select
              className="input text-sm"
              value={reasonFilter}
              onChange={e => setReasonFilter(e.target.value)}
            >
              <option value="">All Reasons</option>
              <option value="low_confidence">Low Confidence</option>
              <option value="judge_disagreement">Judge Disagreement</option>
              <option value="inconclusive">Inconclusive</option>
            </select>
          </div>
          <div className="ml-auto self-end">
            <span className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading review queue...</div>
      ) : items.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 text-lg">No items in the review queue</p>
          <p className="text-gray-400 text-sm mt-1">Escalated evaluations will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => {
            const isExpanded = expandedId === item.id;
            const form = getFormState(item.id);
            const isPending = item.status === 'pending';

            return (
              <div key={item.id} className="card">
                {/* Header row */}
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={item.status} />
                      {item.escalation_reasons.map(r => (
                        <span key={r} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${REASON_COLORS[r]}`}>
                          {REASON_LABELS[r]}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.question_text || item.question_template_id}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Submission: {item.submission_id.substring(0, 12)}...
                      &nbsp;&middot;&nbsp;
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    {item.human_verdict && <VerdictBadge verdict={item.human_verdict} />}
                    {isPending && (
                      <button
                        className="btn btn-success text-xs px-3 py-1"
                        onClick={e => { e.stopPropagation(); handleQuickApprove(item); }}
                      >
                        Quick Approve
                      </button>
                    )}
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {/* Analyst's Answer */}
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Human Analyst's Answer</h4>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-800">Choice: {item.answer_choice || 'N/A'}</p>
                        {item.answer_reasoning && (
                          <p className="text-sm text-gray-600 mt-1">{item.answer_reasoning}</p>
                        )}
                      </div>
                    </div>

                    {/* AI Evaluations */}
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        GavelAI Evaluations ({item.evaluations.length})
                      </h4>
                      <div className="space-y-2">
                        {item.evaluations.map(ev => (
                          <div key={ev.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-700">{ev.judge_name}</span>
                              <VerdictBadge verdict={ev.verdict} />
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                ev.confidence_score >= 80 ? 'bg-green-100 text-green-700' :
                                ev.confidence_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {ev.confidence_score}% confidence
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{ev.reasoning}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Human verdict display for already-reviewed items */}
                    {!isPending && item.human_verdict && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Human Verdict</h4>
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <VerdictBadge verdict={item.human_verdict} />
                            <span className="text-xs text-gray-500">
                              by {item.reviewed_by} &middot; {item.reviewed_at ? new Date(item.reviewed_at).toLocaleString() : ''}
                            </span>
                          </div>
                          {item.human_comment && (
                            <p className="text-sm text-gray-600 mt-1">{item.human_comment}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Review form for pending items */}
                    {isPending && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Submit Your Verdict</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Verdict</label>
                            <select
                              className="input text-sm w-full"
                              value={form.verdict}
                              onChange={e => updateForm(item.id, { verdict: e.target.value as VerdictType })}
                            >
                              <option value="pass">Pass</option>
                              <option value="fail">Fail</option>
                              <option value="inconclusive">Inconclusive</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Reviewer Name</label>
                            <input
                              type="text"
                              className="input text-sm w-full"
                              placeholder="Your name"
                              value={form.reviewedBy}
                              onChange={e => updateForm(item.id, { reviewedBy: e.target.value })}
                            />
                          </div>
                          <div className="md:col-span-1 flex items-end">
                            <button
                              className="btn btn-primary w-full"
                              onClick={() => handleSubmitVerdict(item.id)}
                            >
                              Submit Verdict
                            </button>
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Comment (optional)</label>
                          <textarea
                            className="input text-sm w-full"
                            rows={2}
                            placeholder="Explain your reasoning..."
                            value={form.comment}
                            onChange={e => updateForm(item.id, { comment: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
