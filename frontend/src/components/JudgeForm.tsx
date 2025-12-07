import { useState, useEffect } from 'react';
import type { Judge, JudgeCreate, JudgeUpdate } from '../types';

interface JudgeFormProps {
  judge?: Judge;
  availableModels: string[];
  onSubmit: (judge: JudgeCreate | JudgeUpdate) => void;
  onCancel: () => void;
}

export default function JudgeForm({ judge, availableModels, onSubmit, onCancel }: JudgeFormProps) {
  const [formData, setFormData] = useState({
    name: judge?.name || '',
    system_prompt: judge?.system_prompt || '',
    model_name: judge?.model_name || '',
    active: judge?.active ?? true,
  });

  const defaultPrompt = `You are an expert evaluator. Review the user's answer to the given question and determine if it is correct.

Respond in the following format:
VERDICT: pass|fail|inconclusive
REASONING: Brief explanation of your decision`;

  useEffect(() => {
    if (!judge && !formData.system_prompt) {
      setFormData(prev => ({ ...prev, system_prompt: defaultPrompt }));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Judge Name *
        </label>
        <input
          type="text"
          className="input"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g., Strict Evaluator"
        />
      </div>

      {/* Model */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Model Name *
        </label>
        {availableModels.length > 0 ? (
          <select
            className="input"
            value={formData.model_name}
            onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
            required
          >
            <option value="">Select a model</option>
            {availableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        ) : (
          <>
            <input
              type="text"
              className="input"
              value={formData.model_name}
              onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
              required
              placeholder="e.g., llama2, mistral, gemma3"
            />
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-yellow-800">
                Could not load Ollama models. Make sure Ollama is running.
              </span>
            </div>
          </>
        )}
      </div>

      {/* System Prompt */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          System Prompt / Rubric *
        </label>
        <textarea
          className="input min-h-[200px] font-mono text-sm"
          value={formData.system_prompt}
          onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
          required
          placeholder="Instructions for the AI judge..."
        />
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> Make sure to instruct the AI to respond with "VERDICT: pass|fail|inconclusive" and "REASONING: ..."
          </p>
        </div>
      </div>

      {/* Active Toggle */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
        <input
          type="checkbox"
          id="active"
          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          checked={formData.active}
          onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
        />
        <label htmlFor="active" className="text-sm font-medium text-gray-700 cursor-pointer">
          Active (judge will be used for evaluations)
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="btn btn-secondary px-6 py-2">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary px-6 py-2">
          {judge ? 'Update Judge' : 'Create Judge'}
        </button>
      </div>
    </form>
  );
}
