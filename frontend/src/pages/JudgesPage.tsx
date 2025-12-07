import { useState, useEffect } from 'react';
import { getJudges, createJudge, updateJudge, deleteJudge, getOllamaModels } from '../api';
import type { Judge, JudgeCreate, JudgeUpdate } from '../types';
import JudgeForm from '../components/JudgeForm';
import Toast from '../components/Toast';

export default function JudgesPage() {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    loadJudges();
    loadModels();
  }, []);

  const loadJudges = async () => {
    try {
      const data = await getJudges();
      setJudges(data);
    } catch (error) {
      console.error('Failed to load judges:', error);
      setToast({ 
        type: 'error', 
        message: 'Failed to load judges: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const models = await getOllamaModels();
      setAvailableModels(models);
    } catch (error) {
      console.error('Failed to load Ollama models:', error);
    }
  };

  const handleCreate = async (judge: JudgeCreate) => {
    try {
      await createJudge(judge);
      await loadJudges();
      setShowForm(false);
      setToast({ type: 'success', message: 'Judge created successfully' });
    } catch (error) {
      setToast({ 
        type: 'error', 
        message: 'Failed to create judge: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  };

  const handleUpdate = async (id: number, judge: JudgeUpdate) => {
    try {
      await updateJudge(id, judge);
      await loadJudges();
      setEditingJudge(null);
      setToast({ type: 'success', message: 'Judge updated successfully' });
    } catch (error) {
      setToast({ 
        type: 'error', 
        message: 'Failed to update judge: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this judge?')) return;

    try {
      await deleteJudge(id);
      await loadJudges();
      setToast({ type: 'success', message: 'Judge deleted successfully' });
    } catch (error) {
      setToast({ 
        type: 'error', 
        message: 'Failed to delete judge: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  };

  const handleToggleActive = async (judge: Judge) => {
    try {
      await updateJudge(judge.id, { active: !judge.active });
      await loadJudges();
      setToast({ 
        type: 'success', 
        message: `Judge ${!judge.active ? 'activated' : 'deactivated'} successfully` 
      });
    } catch (error) {
      setToast({ 
        type: 'error', 
        message: 'Failed to update judge: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-gray-600">Loading judges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl flex-1 mr-6">
          <h1 className="text-4xl font-bold mb-3">AI Judges</h1>
          <p className="text-indigo-100 text-lg">
            Create and manage AI evaluators with custom prompts
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary px-6 py-4 text-lg flex items-center gap-3 h-fit"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>New Judge</span>
        </button>
      </div>

      {judges.length === 0 ? (
        <div className="card">
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl mx-auto mb-6 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No judges yet</h3>
            <p className="text-gray-600 mb-6">Create your first AI judge to start evaluating submissions</p>
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary px-6 py-3 inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Create Judge</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {judges.map((judge) => (
            <div key={judge.id} className="card hover:shadow-2xl transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      judge.active 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                        : 'bg-gray-300'
                    }`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{judge.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-mono">
                          {judge.model_name}
                        </code>
                        <span className={`badge ${judge.active ? 'badge-pass' : 'bg-gray-200 text-gray-600'}`}>
                          {judge.active ? '● Active' : '○ Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {judge.system_prompt}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Created {new Date(judge.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => setEditingJudge(judge)}
                    className="btn btn-secondary px-4 py-2 text-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(judge)}
                    className={`btn px-4 py-2 text-sm flex items-center gap-2 ${
                      judge.active ? 'btn-secondary' : 'btn-success'
                    }`}
                  >
                    {judge.active ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Deactivate
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Activate
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(judge.id)}
                    className="btn btn-danger px-4 py-2 text-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {(showForm || editingJudge) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingJudge ? 'Edit Judge' : 'Create New Judge'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditingJudge(null); }}
                className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <JudgeForm
                judge={editingJudge || undefined}
                availableModels={availableModels}
                onSubmit={(data) => {
                  if (editingJudge) {
                    handleUpdate(editingJudge.id, data);
                  } else {
                    handleCreate(data as JudgeCreate);
                  }
                }}
                onCancel={() => { setShowForm(false); setEditingJudge(null); }}
              />
            </div>
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
