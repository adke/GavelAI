import { useState, useEffect } from 'react';
import { uploadSubmissions, getQueues, deleteQueue, getQueueSubmissions } from '../api';
import type { Queue, QueueSubmission } from '../types';
import Toast from '../components/Toast';

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loadingQueues, setLoadingQueues] = useState(true);
  const [deletingQueue, setDeletingQueue] = useState<string | null>(null);
  const [expandedQueue, setExpandedQueue] = useState<string | null>(null);
  const [queueSubmissions, setQueueSubmissions] = useState<Record<string, QueueSubmission[]>>({});
  const [loadingSubmissions, setLoadingSubmissions] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Load queues on component mount
  useEffect(() => {
    loadQueues();
  }, []);

  const loadQueues = async () => {
    try {
      setLoadingQueues(true);
      const data = await getQueues();
      setQueues(data);
    } catch (error) {
      console.error('Error loading queues:', error);
      setToast({ 
        type: 'error', 
        message: 'Failed to load queues: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    } finally {
      setLoadingQueues(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setMessage(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setMessage(null);

    try {
      const result = await uploadSubmissions(selectedFile);
      setMessage({ type: 'success', text: result.message });
      setSelectedFile(null);
      // Reload queues after upload
      await loadQueues();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to upload file' 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteQueue = async (queueId: string) => {
    if (!confirm(`Are you sure you want to delete queue "${queueId}" and all its data? This action cannot be undone.`)) {
      return;
    }

    setDeletingQueue(queueId);
    try {
      await deleteQueue(queueId);
      setToast({ type: 'success', message: `Queue "${queueId}" deleted successfully` });
      await loadQueues();
    } catch (error) {
      setToast({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to delete queue' 
      });
    } finally {
      setDeletingQueue(null);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  const toggleQueueExpansion = async (queueId: string) => {
    if (expandedQueue === queueId) {
      // Collapse
      setExpandedQueue(null);
    } else {
      // Expand and load submissions if not already loaded
      setExpandedQueue(queueId);
      if (!queueSubmissions[queueId]) {
        setLoadingSubmissions(queueId);
        try {
          const submissions = await getQueueSubmissions(queueId);
          setQueueSubmissions(prev => ({ ...prev, [queueId]: submissions }));
        } catch (error) {
          console.error('Error loading submissions:', error);
          setToast({ 
            type: 'error', 
            message: 'Failed to load submissions: ' + (error instanceof Error ? error.message : 'Unknown error')
          });
        } finally {
          setLoadingSubmissions(null);
        }
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-3">Upload Submissions</h1>
        <p className="text-blue-100 text-lg">
          Import your JSON data to begin AI-powered evaluation
        </p>
      </div>

      {/* Alert Message */}
      {message && (
        <div className={`p-4 rounded-xl border-l-4 animate-slide-up ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-500 text-green-800' 
            : 'bg-red-50 border-red-500 text-red-800'
        }`}>
          <div className="flex items-center gap-3">
            {message.type === 'success' ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* Upload Card */}
      <div className="card">
        <label 
          className={`relative block cursor-pointer transition-all duration-300 ${
            dragActive ? 'scale-105' : ''
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          
          <div className={`border-3 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}>
            <div className="flex flex-col items-center gap-4">
              {/* Icon */}
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              {/* Text */}
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="text-xl font-semibold text-gray-900">{selectedFile.name}</div>
                  <div className="text-sm text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xl font-semibold text-gray-900">
                    Drop your JSON file here
                  </div>
                  <div className="text-sm text-gray-500">
                    or click to browse from your computer
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-400 mt-2">
                Supports: .json files only
              </div>
            </div>
          </div>
        </label>

        {selectedFile && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn btn-primary px-8 py-3 text-lg flex items-center gap-3"
            >
              {uploading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Upload File</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Expected Format */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Expected Format</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Upload a JSON file containing an array of submission objects with questions and answers.
              </p>
            </div>
          </div>
        </div>

        {/* Sample Data */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Sample Available</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Check <code className="px-2 py-1 bg-gray-100 rounded text-xs">sample_input.json</code> in the project root for a reference.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Code Example */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg text-gray-900">JSON Structure Example</h3>
          <span className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-600">Example</span>
        </div>
        <pre className="bg-gray-900 text-gray-100 p-6 rounded-xl overflow-x-auto text-sm leading-relaxed">
{`[
  {
    "id": "sub_1",
    "queueId": "queue_1",
    "labelingTaskId": "task_1",
    "createdAt": 1690000000000,
    "questions": [
      {
        "rev": 1,
        "data": {
          "id": "q_template_1",
          "questionType": "single_choice_with_reasoning",
          "questionText": "Is the sky blue?"
        }
      }
    ],
    "answers": {
      "q_template_1": {
        "choice": "yes",
        "reasoning": "Observed on a clear day."
      }
    }
  }
]`}
        </pre>
      </div>

      {/* Uploaded Data Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-xl text-gray-900">Uploaded Data</h3>
            <p className="text-sm text-gray-500 mt-1">Manage your uploaded submission queues</p>
          </div>
          <button
            onClick={loadQueues}
            disabled={loadingQueues}
            className="btn btn-secondary text-sm"
          >
            <svg className={`w-4 h-4 ${loadingQueues ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {loadingQueues ? (
          <div className="flex justify-center items-center py-12">
            <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : queues.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No data uploaded yet</p>
            <p className="text-gray-400 text-sm mt-1">Upload a JSON file to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Queue ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded At
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {queues.map((queue) => (
                  <>
                    <tr 
                      key={queue.queue_id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleQueueExpansion(queue.queue_id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <svg 
                            className={`w-4 h-4 text-gray-400 transition-transform ${expandedQueue === queue.queue_id ? 'rotate-90' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-900">{queue.queue_id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {queue.submission_count} submission{queue.submission_count !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{formatDate(queue.uploaded_at)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteQueue(queue.queue_id);
                          }}
                          disabled={deletingQueue === queue.queue_id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                        >
                          {deletingQueue === queue.queue_id ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Deleting...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Delete</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedQueue === queue.queue_id && (
                      <tr key={`${queue.queue_id}-expanded`}>
                        <td colSpan={4} className="px-6 py-4 bg-gray-50">
                          {loadingSubmissions === queue.queue_id ? (
                            <div className="flex justify-center items-center py-8">
                              <svg className="w-6 h-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </div>
                          ) : !queueSubmissions[queue.queue_id] || queueSubmissions[queue.queue_id].length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No submissions found</div>
                          ) : (
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm text-gray-700 mb-3">Submissions in {queue.queue_id}</h4>
                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                                        Submission ID
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                                        Task ID
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                                        Questions
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                                        Evaluations
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                                        Created At
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {queueSubmissions[queue.queue_id].map((submission) => (
                                      <tr key={submission.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">{submission.id}</code>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{submission.labeling_task_id}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                          <span className="inline-flex items-center gap-1">
                                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {submission.question_count}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                          <span className="inline-flex items-center gap-1">
                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {submission.evaluation_count}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(submission.created_at)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
