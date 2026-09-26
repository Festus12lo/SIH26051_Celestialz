import React, { useState, useEffect } from 'react';
import { X, Save, Key, Terminal, AlertCircle } from 'lucide-react';
import { getApiKey, setApiKey } from '../utils/keyStore';

interface SettingsPanelProps {
  onClose: () => void;
}

const validateKey = (provider: string, key: string): boolean => {
  if (!key.trim()) return true; // Empty is valid (will use server environment defaults)
  
  const patterns: Record<string, RegExp> = {
    gemini: /^(AIzaSy[A-Za-z0-9_-]{33}|AQ\.[A-Za-z0-9_-]+|[A-Za-z0-9_-]{30,})$/,
    nvidia: /^nvapi-[A-Za-z0-9_-]{30,}$/,
    groq: /^gsk_[A-Za-z0-9_-]{30,}$/,
    openrouter: /^sk-or-v1-[A-Za-z0-9_-]{30,}$/,
  };
  
  const pattern = patterns[provider];
  if (pattern && !pattern.test(key.trim())) {
    return false;
  }
  return true;
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'keys' | 'logs'>('keys');
  const [keys, setKeys] = useState({
    gemini: getApiKey('gemini'),
    nvidia: getApiKey('nvidia'),
    groq: getApiKey('groq'),
    openrouter: getApiKey('openrouter'),
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);

  const fetchLogs = async () => {
    setIsFetchingLogs(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${API_BASE_URL}/api/logs`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      setLogs(['Failed to fetch logs.']);
    } finally {
      setIsFetchingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  const handleSave = () => {
    const errors: Record<string, string> = {};
    Object.entries(keys).forEach(([provider, key]) => {
      if (key && !validateKey(provider, key)) {
        errors[provider] = `Invalid ${provider.toUpperCase()} API key format. Please verify your key.`;
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setIsSaving(true);

    // Save with encoded obfuscation
    setApiKey('gemini', keys.gemini.trim());
    setApiKey('nvidia', keys.nvidia.trim());
    setApiKey('groq', keys.groq.trim());
    setApiKey('openrouter', keys.openrouter.trim());

    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Key size={24} className="text-[#FF5722]" /> 
            Settings & Integrations
          </h2>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 border-b border-white/10 gap-6">
          <button
            onClick={() => setActiveTab('keys')}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 cursor-pointer ${activeTab === 'keys' ? 'border-[#FF5722] text-white' : 'border-transparent text-white/50 hover:text-white'}`}
          >
            API Keys (BYOK)
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 cursor-pointer ${activeTab === 'logs' ? 'border-[#FF5722] text-white' : 'border-transparent text-white/50 hover:text-white'}`}
          >
            System Logs
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh] min-h-[300px]">
          {activeTab === 'keys' && (
            <div className="space-y-6">
              <p className="text-white/60 text-sm">
                Connect your personal API keys. Keys are encoded in browser storage and injected into headers securely. Leave blank to use server environment defaults.
              </p>
              
              <div className="space-y-5">
                {/* Gemini */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-sm font-semibold text-white/80 flex items-center gap-2">
                      Gemini API Key 
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold tracking-wide border border-emerald-500/30">RECOMMENDED (LLM)</span>
                    </label>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-[#FF5722] hover:text-[#ff784e] transition-colors underline decoration-[#FF5722]/30">Get Key &rarr;</a>
                  </div>
                  <input
                    type="password"
                    value={keys.gemini}
                    onChange={(e) => {
                      setKeys({...keys, gemini: e.target.value});
                      if (validationErrors.gemini) setValidationErrors({...validationErrors, gemini: ''});
                    }}
                    placeholder="AIzaSy..."
                    className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-white focus:outline-none font-mono text-sm transition-colors ${
                      validationErrors.gemini ? 'border-red-500/60 focus:border-red-400' : 'border-white/10 focus:border-[#FF5722]'
                    }`}
                  />
                  {validationErrors.gemini && (
                    <div className="flex items-center gap-1.5 text-xs text-red-400 px-1 pt-0.5">
                      <AlertCircle size={13} /> {validationErrors.gemini}
                    </div>
                  )}
                </div>
                
                {/* NVIDIA */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-sm font-semibold text-white/80 flex items-center gap-2">
                      NVIDIA API Key
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold tracking-wide border border-emerald-500/30">RECOMMENDED (IMAGES)</span>
                    </label>
                    <a href="https://build.nvidia.com/explore/discover" target="_blank" rel="noreferrer" className="text-xs text-[#FF5722] hover:text-[#ff784e] transition-colors underline decoration-[#FF5722]/30">Get Key &rarr;</a>
                  </div>
                  <input
                    type="password"
                    value={keys.nvidia}
                    onChange={(e) => {
                      setKeys({...keys, nvidia: e.target.value});
                      if (validationErrors.nvidia) setValidationErrors({...validationErrors, nvidia: ''});
                    }}
                    placeholder="nvapi-..."
                    className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-white focus:outline-none font-mono text-sm transition-colors ${
                      validationErrors.nvidia ? 'border-red-500/60 focus:border-red-400' : 'border-white/10 focus:border-[#FF5722]'
                    }`}
                  />
                  {validationErrors.nvidia && (
                    <div className="flex items-center gap-1.5 text-xs text-red-400 px-1 pt-0.5">
                      <AlertCircle size={13} /> {validationErrors.nvidia}
                    </div>
                  )}
                </div>

                {/* Groq */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-sm font-semibold text-white/80">Groq API Key</label>
                    <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-xs text-[#FF5722] hover:text-[#ff784e] transition-colors underline decoration-[#FF5722]/30">Get Key &rarr;</a>
                  </div>
                  <input
                    type="password"
                    value={keys.groq}
                    onChange={(e) => {
                      setKeys({...keys, groq: e.target.value});
                      if (validationErrors.groq) setValidationErrors({...validationErrors, groq: ''});
                    }}
                    placeholder="gsk_..."
                    className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-white focus:outline-none font-mono text-sm transition-colors ${
                      validationErrors.groq ? 'border-red-500/60 focus:border-red-400' : 'border-white/10 focus:border-[#FF5722]'
                    }`}
                  />
                  {validationErrors.groq && (
                    <div className="flex items-center gap-1.5 text-xs text-red-400 px-1 pt-0.5">
                      <AlertCircle size={13} /> {validationErrors.groq}
                    </div>
                  )}
                </div>

                {/* OpenRouter */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-sm font-semibold text-white/80">OpenRouter API Key</label>
                    <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-xs text-[#FF5722] hover:text-[#ff784e] transition-colors underline decoration-[#FF5722]/30">Get Key &rarr;</a>
                  </div>
                  <input
                    type="password"
                    value={keys.openrouter}
                    onChange={(e) => {
                      setKeys({...keys, openrouter: e.target.value});
                      if (validationErrors.openrouter) setValidationErrors({...validationErrors, openrouter: ''});
                    }}
                    placeholder="sk-or-v1-..."
                    className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-white focus:outline-none font-mono text-sm transition-colors ${
                      validationErrors.openrouter ? 'border-red-500/60 focus:border-red-400' : 'border-white/10 focus:border-[#FF5722]'
                    }`}
                  />
                  {validationErrors.openrouter && (
                    <div className="flex items-center gap-1.5 text-xs text-red-400 px-1 pt-0.5">
                      <AlertCircle size={13} /> {validationErrors.openrouter}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4 flex flex-col h-full">
              <div className="flex items-center justify-between">
                <p className="text-white/60 text-sm flex items-center gap-2">
                  <Terminal size={16} /> Backend LLM Pipeline Logs
                </p>
                <button onClick={fetchLogs} className="text-xs font-semibold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-white transition-colors cursor-pointer">
                  {isFetchingLogs ? 'Refreshing...' : 'Refresh Logs'}
                </button>
              </div>
              
              <div className="flex-1 bg-black/60 border border-white/10 rounded-xl p-4 overflow-y-auto font-mono text-xs text-green-400 space-y-1 min-h-[200px]">
                {logs.length > 0 ? (
                  logs.map((log, idx) => (
                    <div key={idx} className="whitespace-pre-wrap">{log}</div>
                  ))
                ) : (
                  <div className="text-white/30 italic">No logs available.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'keys' && (
          <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-white/5">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-white/70 hover:bg-white/10 transition-colors cursor-pointer">
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl font-bold bg-[#FF5722] text-white hover:bg-[#e64a19] shadow-[0_0_15px_rgba(255,87,34,0.4)] transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
