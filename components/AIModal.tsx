
import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { TaskStatus } from '../types';
import VoiceRecorder from './VoiceRecorder';

interface AIModalProps {
  onClose: () => void;
  onPlanGenerated: (tasks: any[]) => void;
}

type InputMode = 'text' | 'voice';

const AIModal: React.FC<AIModalProps> = ({ onClose, onPlanGenerated }) => {
  const [input, setInput] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVoiceTranscript = useCallback((transcript: string) => {
    setInput(transcript);
  }, []);

  const generatePlan = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Convert this plan into a structured task list: "${input}"`,
        config: {
          systemInstruction: "You are a productivity expert. Convert the user's messy notes into a structured list of tasks and subtasks for a single day. Return ONLY a JSON array of objects. Each object MUST have: 'title' (string), 'description' (string), 'startTime' (optional, HH:mm), 'duration' (optional, number in minutes), and 'subtasks' (optional, array of objects of the same structure). If you see a sequence, nest them appropriately. If a time is mentioned, include it.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                startTime: { type: Type.STRING },
                duration: { type: Type.NUMBER },
                subtasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      startTime: { type: Type.STRING },
                      duration: { type: Type.NUMBER },
                    },
                    required: ["title", "description"]
                  }
                }
              },
              required: ["title", "description"]
            }
          }
        },
      });

      const generatedTasks = JSON.parse(response.text || '[]');
      onPlanGenerated(generatedTasks);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate plan. Please try being more specific or check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6 md:p-8 space-y-5">
          {/* Header */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Assistant</h2>
              <p className="text-sm text-slate-500">Describe your day and I'll organize it for you.</p>
            </div>
          </div>

          {/* Input Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${inputMode === 'text'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
              </svg>
              <span>Type</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('voice')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${inputMode === 'voice'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              <span>Voice</span>
            </button>
          </div>

          {/* Voice Recorder (shown in voice mode) */}
          {inputMode === 'voice' && (
            <VoiceRecorder
              onTranscriptChange={handleVoiceTranscript}
              disabled={loading}
            />
          )}

          {/* Text Input / Transcript Display */}
          <textarea
            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 focus:ring-0 rounded-2xl px-4 py-4 text-sm md:text-base transition-all outline-none resize-none min-h-[140px]"
            placeholder={inputMode === 'voice'
              ? "Your voice transcript will appear here... You can also edit it before generating."
              : "e.g., I need to prep for the big meeting at 10am for an hour. After that, I'll grab lunch with Sarah. In the afternoon I have to finish the coding task..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onClose}
              className="px-6 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={generatePlan}
              disabled={loading || !input.trim()}
              className={`flex items-center space-x-2 px-8 py-3 rounded-xl font-bold text-white transition-all shadow-xl ${loading ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20 active:scale-95'
                }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Organizing...</span>
                </>
              ) : (
                <span>Generate Plan ✨</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIModal;
