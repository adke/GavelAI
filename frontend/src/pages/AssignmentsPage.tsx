import { useState, useEffect } from 'react';
import { getQueues, getQueueQuestions, getJudges, assignJudges, runEvaluations } from '../api';
import type { Queue, QuestionTemplate, Judge } from '../types';
import Toast from '../components/Toast';

export default function AssignmentsPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  const [questions, setQuestions] = useState<QuestionTemplate[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedQueue) {
      loadQuestions();
    }
  }, [selectedQueue]);

  const loadData = async () => {
    try {
      const [queuesData, judgesData] = await Promise.all([
        getQueues(),
        getJudges(),
      ]);
      setQueues(queuesData);
      setJudges(judgesData.filter(j => j.active));

      if (queuesData.length > 0 && !selectedQueue) {
        setSelectedQueue(queuesData[0].queue_id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setToast({
        type: 'error',
        message: 'Failed to load data: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    if (!selectedQueue) return;

    try {
      const data = await getQueueQuestions(selectedQueue);
      setQuestions(data);
    } catch (error) {
      console.error('Failed to load questions:', error);
      setToast({
        type: 'error',
        message: 'Failed to load questions: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  };

  const handleToggleJudge = async (questionId: string, judgeId: number) => {
    const question = questions.find(q => q.question_template_id === questionId);
    if (!question) return;

    const newJudgeIds = question.assigned_judge_ids.includes(judgeId)
      ? question.assigned_judge_ids.filter(id => id !== judgeId)
      : [...question.assigned_judge_ids, judgeId];

    setQuestions(prev =>
      prev.map(q =>
        q.question_template_id === questionId
          ? { ...q, assigned_judge_ids: newJudgeIds }
          : q
      )
    );

    setSaving(true);
    setMessage(null);
    try {
      await assignJudges({
        queue_id: selectedQueue,
        question_template_id: questionId,
        judge_ids: newJudgeIds,
      });
      setMessage({ type: 'success', text: 'Assignment saved' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to save: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
      await loadQuestions();
    } finally {
      setSaving(false);
    }
  };

  const handleRunEvaluations = async () => {
    if (!selectedQueue) return;

    // Check if every question has at least one judge assigned
    const questionsWithoutJudges = questions.filter(q => q.assigned_judge_ids.length === 0);
    if (questionsWithoutJudges.length > 0) {
      setToast({
        type: 'error',
        message: `Cannot run evaluations: ${questionsWithoutJudges.length} question(s) do not have any judges assigned. Please assign at least one judge to every question.`
      });
      return;
    }

    if (!confirm('This will run AI evaluations on all submissions in this queue. Continue?')) {
      return;
    }

    setRunning(true);
    setMessage(null);

    try {
      const result = await runEvaluations(selectedQueue);

      if (result.failed > 0) {
        setMessage({
          type: 'info',
          text: `Completed ${result.completed} of ${result.planned}. ${result.failed} failed.`
        });
      } else {
        setMessage({
          type: 'success',
          text: `Successfully completed ${result.completed} evaluations!`
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to run evaluations: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    } finally {
      setRunning(false);
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-gray-600">Loading assignments...</p>
        </div>
      </div>
    );
  }

  if (queues.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
          <h1 className="text-4xl font-bold mb-3">Judge Assignments</h1>
          <p className="text-purple-100 text-lg">Assign AI judges to evaluate questions</p>
        </div>
        <div className="card">
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl mx-auto mb-6 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No queues available</h3>
            <p className="text-gray-600">Upload submissions first to create queues</p>
          </div>
        </div>
      </div>
    );
  }

  if (judges.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
          <h1 className="text-4xl font-bold mb-3">Judge Assignments</h1>
          <p className="text-purple-100 text-lg">Assign AI judges to evaluate questions</p>
        </div>
        <div className="card">
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl mx-auto mb-6 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No active judges</h3>
            <p className="text-gray-600">Create and activate judges before assigning them</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-6">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl flex-1">
          <h1 className="text-4xl font-bold mb-3">Judge Assignments</h1>
          <p className="text-purple-100 text-lg">Configure which judges evaluate each question</p>
        </div>
        <button
          onClick={handleRunEvaluations}
          disabled={running || saving}
          className="btn btn-success px-6 py-4 text-lg flex items-center gap-3 h-fit"
        >
          {running ? (
            <>
              <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Running...</span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Run AI Judges</span>
            </>
          )}
        </button>
      </div>

      {/* Alert Message */}
      {message && (
        <div className={`p-4 rounded-xl border-l-4 animate-slide-up ${message.type === 'success'
          ? 'bg-green-50 border-green-500 text-green-800'
          : message.type === 'error'
            ? 'bg-red-50 border-red-500 text-red-800'
            : 'bg-blue-50 border-blue-500 text-blue-800'
          }`}>
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      {/* Queue Selector */}
      <div className="card">
        <label className="block text-sm font-semibold text-gray-700 mb-3">Select Queue</label>
        <select
          className="input"
          value={selectedQueue}
          onChange={(e) => setSelectedQueue(e.target.value)}
        >
          {queues.map((queue) => (
            <option key={queue.queue_id} value={queue.queue_id}>
              {queue.queue_id} ({queue.submission_count} submissions)
            </option>
          ))}
        </select>
      </div>

      {/* Questions & Assignments */}
      {questions.length === 0 ? (
        <div className="card">
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No questions in this queue</h3>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Questions & Judge Assignments</h2>
            <span className="text-sm text-gray-500">{questions.length} questions</span>
          </div>

          <div className="space-y-6">
            {questions.map((question) => {
              return (
                <div
                  key={question.question_template_id}
                  className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl p-6 border border-gray-200"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {question.question_text}
                    </h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="px-3 py-1 bg-white rounded-lg border border-gray-200 text-gray-600">
                        ID: {question.question_template_id}
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-medium">
                        {question.question_type}
                      </span>
                    </div>
                  </div>

                  {/* Content Section */}
                  {question.content && (
                    <details className="mb-4 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors select-none">
                        <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Question Content</span>
                        <svg className="w-3 h-3 text-gray-400 ml-auto transition-transform details-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="px-4 pb-4 border-t border-gray-100">
                        <pre className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
                          {question.content}
                        </pre>
                      </div>
                    </details>
                  )}

                  {/* Answer Section */}
                  {question.answer && (
                    <div className="mb-4 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Answer</p>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm">
                        {question.answer.choice}
                      </span>
                      {question.answer.reasoning && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Reasoning</p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {question.answer.reasoning}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {judges.map((judge) => {
                      const isAssigned = question.assigned_judge_ids.includes(judge.id);
                      return (
                        <label
                          key={judge.id}
                          className={`relative flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${isAssigned
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 border-blue-600 text-white shadow-lg scale-105'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:shadow-md'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => handleToggleJudge(question.question_template_id, judge.id)}
                            disabled={saving}
                            className="w-5 h-5 rounded"
                          />
                          <span className="font-medium text-sm">{judge.name}</span>
                        </label>
                      );
                    })}
                  </div>

                  {question.assigned_judge_ids.length === 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-sm text-yellow-800 font-medium">No judges assigned to this question</span>
                    </div>
                  )}
                </div>
              );
            })}
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
