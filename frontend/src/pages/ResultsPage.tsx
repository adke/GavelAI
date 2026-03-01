import { useState, useEffect } from 'react';
import { getEvaluations, getEvaluationStats, getJudges, getQueues, getQueueQuestions, getQueueStats } from '../api';
import type { Evaluation, EvaluationStats, Judge, QuestionTemplate, QueueStatsResponse } from '../types';
import Toast from '../components/Toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function ResultsPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [allQuestions, setAllQuestions] = useState<QuestionTemplate[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStatsResponse>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const [selectedJudges, setSelectedJudges] = useState<number[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [selectedVerdict, setSelectedVerdict] = useState<string>('');
  const [sortByConfidence, setSortByConfidence] = useState<'asc' | 'desc' | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadEvaluations();
  }, [selectedJudges, selectedQuestions, selectedVerdict]);

  const loadInitialData = async () => {
    try {
      const [judgesData, queuesData] = await Promise.all([
        getJudges(),
        getQueues(),
      ]);

      setJudges(judgesData);

      const questionsPromises = queuesData.map(q => getQueueQuestions(q.queue_id));
      const questionsArrays = await Promise.all(questionsPromises);
      const uniqueQuestions = questionsArrays.flat().reduce((acc, q) => {
        if (!acc.find(item => item.question_template_id === q.question_template_id)) {
          acc.push(q);
        }
        return acc;
      }, [] as QuestionTemplate[]);

      setAllQuestions(uniqueQuestions);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setToast({
        type: 'error',
        message: 'Failed to load initial data: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEvaluations = async () => {
    try {
      const filters = {
        judge_ids: selectedJudges.length > 0 ? selectedJudges : undefined,
        question_ids: selectedQuestions.length > 0 ? selectedQuestions : undefined,
        verdict: selectedVerdict || undefined,
      };

      const [evaluationsData, statsData, queueStatsData] = await Promise.all([
        getEvaluations(filters),
        getEvaluationStats(filters),
        getQueueStats(),
      ]);

      setEvaluations(evaluationsData);
      setStats(statsData);
      setQueueStats(queueStatsData);
    } catch (error) {
      console.error('Failed to load evaluations:', error);
      setToast({
        type: 'error',
        message: 'Failed to load evaluations: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  };

  const handleToggleJudge = (judgeId: number) => {
    setSelectedJudges(prev =>
      prev.includes(judgeId)
        ? prev.filter(id => id !== judgeId)
        : [...prev, judgeId]
    );
  };

  const handleToggleQuestion = (questionId: string) => {
    setSelectedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const clearFilters = () => {
    setSelectedJudges([]);
    setSelectedQuestions([]);
    setSelectedVerdict('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  const hasFilters = selectedJudges.length > 0 || selectedQuestions.length > 0 || selectedVerdict;

  const sortedEvaluations = sortByConfidence
    ? [...evaluations].sort((a, b) =>
      sortByConfidence === 'asc'
        ? a.confidence_score - b.confidence_score
        : b.confidence_score - a.confidence_score
    )
    : evaluations;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-3">Evaluation Results</h1>
        <p className="text-green-100 text-lg">
          Analyze AI judge performance and verdicts
        </p>
      </div>

      {/* Statistics */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          <div className="stat-card from-blue-500 to-blue-600">
            <div className="flex items-center justify-between mb-2">
              <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.total}</div>
            <div className="text-sm opacity-90">Total Evaluations</div>
          </div>

          <div className="stat-card from-emerald-500 to-green-600">
            <div className="flex items-center justify-between mb-2">
              <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.pass_rate.toFixed(1)}%</div>
            <div className="text-sm opacity-90">Pass Rate</div>
          </div>

          <div className="stat-card from-green-500 to-emerald-600">
            <div className="flex items-center justify-between mb-2">
              <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.pass_count}</div>
            <div className="text-sm opacity-90">Passed</div>
          </div>

          <div className="stat-card from-red-500 to-pink-600">
            <div className="flex items-center justify-between mb-2">
              <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.fail_count}</div>
            <div className="text-sm opacity-90">Failed</div>
          </div>

          <div className="stat-card from-yellow-500 to-orange-500">
            <div className="flex items-center justify-between mb-2">
              <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.inconclusive_count}</div>
            <div className="text-sm opacity-90">Inconclusive</div>
          </div>

          <div className="stat-card from-purple-500 to-indigo-600">
            <div className="flex items-center justify-between mb-2">
              <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.avg_confidence.toFixed(1)}</div>
            <div className="text-sm opacity-90">Avg Confidence</div>
          </div>
        </div>
      )}

      {/* Queue Analytics Charts */}
      {Object.keys(queueStats).length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Analytics by Queue</h2>
          {Object.entries(queueStats).map(([queueId, judgeData]) => (
            <div key={queueId} className="card">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Queue: <code className="text-sm bg-gray-100 px-3 py-1 rounded text-blue-600">{queueId}</code>
              </h3>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Pass Rate Chart */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-4">Pass Rate by Judge</h4>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={judgeData} margin={{ top: 5, right: 20, bottom: 60, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="judge_name"
                        angle={-35}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        label={{ value: 'Pass Rate (%)', angle: -90, position: 'insideLeft' }}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        formatter={(value: number) => `${value.toFixed(1)}%`}
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      />
                      <Bar dataKey="pass_rate" radius={[8, 8, 0, 0]} maxBarSize={80} animationDuration={1000}>
                        {judgeData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.pass_rate >= 75 ? '#10b981' : entry.pass_rate >= 50 ? '#f59e0b' : '#ef4444'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Verdict Distribution Chart */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-4">Verdict Distribution by Judge</h4>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={judgeData} margin={{ top: 5, right: 20, bottom: 60, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="judge_name"
                        angle={-35}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="pass" stackId="a" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={80} animationDuration={1000} />
                      <Bar dataKey="fail" stackId="a" fill="#ef4444" maxBarSize={80} animationDuration={1000} />
                      <Bar dataKey="inconclusive" stackId="a" fill="#f59e0b" maxBarSize={80} animationDuration={1000} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Summary Table */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Judge</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Pass</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Fail</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Inconclusive</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Total</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {judgeData.map((judge) => (
                      <tr key={judge.judge_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{judge.judge_name}</td>
                        <td className="px-4 py-3 text-center text-green-600 font-semibold">{judge.pass}</td>
                        <td className="px-4 py-3 text-center text-red-600 font-semibold">{judge.fail}</td>
                        <td className="px-4 py-3 text-center text-yellow-600 font-semibold">{judge.inconclusive}</td>
                        <td className="px-4 py-3 text-center text-gray-900 font-semibold">{judge.total}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${judge.pass_rate >= 75 ? 'bg-green-100 text-green-800' :
                            judge.pass_rate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                            {judge.pass_rate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Filters</h2>
          {hasFilters && (
            <button onClick={clearFilters} className="btn btn-secondary px-4 py-2 text-sm">
              Clear All
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Judges Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Judges</label>
            <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
              {judges.map((judge) => (
                <label key={judge.id} className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedJudges.includes(judge.id)}
                    onChange={() => handleToggleJudge(judge.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{judge.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Questions Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Questions</label>
            <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
              {allQuestions.map((question) => (
                <label key={question.question_template_id} className="flex items-start gap-3 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.includes(question.question_template_id)}
                    onChange={() => handleToggleQuestion(question.question_template_id)}
                    className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 line-clamp-2">{question.question_text}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Verdict Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Verdict</label>
            <select
              className="input"
              value={selectedVerdict}
              onChange={(e) => setSelectedVerdict(e.target.value)}
            >
              <option value="">All Verdicts</option>
              <option value="pass">✓ Pass</option>
              <option value="fail">✗ Fail</option>
              <option value="inconclusive">? Inconclusive</option>
            </select>
          </div>
        </div>
      </div>
      {/* EVALUATION TABLE */}
      {/* Results Table */}
      {evaluations.length === 0 ? (
        <div className="card">
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl mx-auto mb-6 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No evaluations found</h3>
            <p className="text-gray-600">
              {hasFilters
                ? 'Try adjusting your filters'
                : 'Run AI judges on your submissions to see results here'}
            </p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Evaluations ({evaluations.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Submission</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Question</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User Answer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Judge</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Verdict</th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-blue-600 select-none"
                    onClick={() => setSortByConfidence(prev => prev === 'desc' ? 'asc' : prev === 'asc' ? null : 'desc')}
                  >
                    Confidence {sortByConfidence === 'desc' ? '↓' : sortByConfidence === 'asc' ? '↑' : '↕'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reasoning</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedEvaluations.map((evaluation) => (
                  <tr key={evaluation.id} className="hover:bg-gray-50 transition-colors align-top">
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 break-all">
                        {evaluation.submission_id}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {evaluation.question_text || evaluation.question_template_id}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {evaluation.question_template_id}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        {evaluation.answer_choice && (
                          <div className="text-sm text-gray-900">
                            <span className="font-semibold text-blue-600">Choice:</span> {evaluation.answer_choice}
                          </div>
                        )}
                        {evaluation.answer_reasoning && (
                          <div className="text-xs text-gray-600 mt-1">
                            <span className="font-semibold">Reasoning:</span> {evaluation.answer_reasoning}
                          </div>
                        )}
                        {!evaluation.answer_choice && !evaluation.answer_reasoning && (
                          <span className="text-sm text-gray-400 italic">No answer</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">{evaluation.judge_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${evaluation.verdict === 'pass' ? 'badge-pass' :
                        evaluation.verdict === 'fail' ? 'badge-fail' :
                          'badge-inconclusive'
                        }`}>
                        {evaluation.verdict === 'pass' && '✓ '}
                        {evaluation.verdict === 'fail' && '✗ '}
                        {evaluation.verdict === 'inconclusive' && '? '}
                        {evaluation.verdict.charAt(0).toUpperCase() + evaluation.verdict.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${evaluation.confidence_score >= 75 ? 'bg-green-100 text-green-800' :
                        evaluation.confidence_score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${evaluation.confidence_score >= 75 ? 'bg-green-500' :
                          evaluation.confidence_score >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}></span>
                        {evaluation.confidence_score}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700">
                        {evaluation.reasoning}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(evaluation.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
