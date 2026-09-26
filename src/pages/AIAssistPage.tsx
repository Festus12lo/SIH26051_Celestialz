import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, RefreshCw } from 'lucide-react';
import { AppContext } from '../App';
import RadiantPromptInput from '../components/RadiantPromptInput';
import { chatWithArchitect, type ChatMessage } from '../api/llmClient';

export const AIAssistPage: React.FC = () => {
  const { blueprintData } = useContext(AppContext);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const location = blueprintData?.location || blueprintData?.meta?.location;
  const buildingType = blueprintData?.building_type || blueprintData?.meta?.building_type;

  const suggestedQuestions = [
    "Why should main windows face South in freezing cold?",
    "How does thick earth keep the shelter warm overnight?",
    "What are the best wall and roof materials for heavy snow?",
    "How does natural airflow keep the room cool without AC?"
  ];

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: text }
    ];
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setIsLoading(true);

    try {
      await chatWithArchitect(newMessages, undefined, (fullText) => {
        setIsLoading(false);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullText };
          return updated;
        });
      });
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { 
          role: 'assistant', 
          content: 'I apologize, an error occurred while connecting to the thermal physics reasoning engine. Please ensure backend services or API keys are configured.' 
        };
        return updated;
      });
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setIsLoading(false);
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-center animate-in fade-in duration-500 overflow-y-auto scrollbar-hide">
      
      {/* Optional Context Ribbon if Blueprint Exists in memory */}
      {blueprintData && (
        <div className="w-full glass-card-subtle px-5 py-3 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[#FF5722] font-bold">PROJECT CONTEXT ACTIVE:</span>
            <span className="text-white font-medium">{location || 'Custom Shelter'}</span>
            <span className="text-white/30">•</span>
            <span className="text-white/60 capitalize">{buildingType || 'Bioclimatic'}</span>
          </div>
          <Link to="/app/floorplan" className="text-[#FF5722] hover:text-[#ff784e] flex items-center gap-1 font-semibold transition-colors">
            <span>View Full CAD Blueprint</span>
            <span>&rarr;</span>
          </Link>
        </div>
      )}

      {messages.length === 0 ? (
        /* ── INITIAL HERO VIEW IN TRANSLUCENT GLASS BOX ── */
        <div className="w-full glass-card-premium p-8 sm:p-12 md:p-16 text-center space-y-8 shadow-2xl relative overflow-hidden">
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#FF5722] font-mono tracking-wider">
              <Sparkles size={14} className="text-[#FF5722]" />
              <span>AI SHELTER ASSISTANT</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.1]">
              Design Your Shelter.
            </h1>

            <p className="text-white/70 text-base sm:text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed text-balance">
              Ask any question in plain English. Learn how to keep rooms naturally warm in winter, stop summer overheating, or pick affordable building materials.
            </p>
          </div>

          {/* Quick Suggestion Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-3xl mx-auto">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FF5722]/50 text-xs text-white/80 hover:text-white font-mono transition-all text-left cursor-pointer hover:-translate-y-0.5"
              >
                &ldquo;{q}&rdquo;
              </button>
            ))}
          </div>

          {/* Prompt Input Container */}
          <div className="w-full max-w-3xl mx-auto pt-2">
            <RadiantPromptInput 
              onSubmit={handleSendMessage} 
              placeholder="Ask anything, e.g. How to keep warm in Leh, or best low-cost roof for rain..."
              disabled={isLoading}
              showHistory={true}
              historyKey="thermoshelter_preferences_history"
            />
          </div>
        </div>
      ) : (
        /* ── ACTIVE CHAT VIEW IN TRANSLUCENT GLASS BOX ── */
        <div className="w-full glass-card-premium flex flex-col h-[calc(100vh-10rem)] shadow-2xl overflow-hidden relative">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 border border-white/10 rounded-xl text-[#FF5722]">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Shelter Assistant</h2>
                <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Assistant Ready</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleClearChat}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-mono text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw size={13} />
              <span>New Conversation</span>
            </button>
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-5 ${
                    msg.role === 'user'
                      ? 'bg-[#FF5722]/20 border border-[#FF5722]/40 text-white shadow-lg font-medium'
                      : 'glass-card-subtle text-white/90 prose prose-invert max-w-none text-sm leading-relaxed border-white/10'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="m-0 leading-relaxed">{msg.content}</p>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex w-full justify-start">
                <div className="glass-card-subtle px-5 py-3 rounded-2xl flex items-center gap-3 text-xs font-mono text-white/60">
                  <span className="w-2 h-2 rounded-full bg-[#FF5722] animate-ping" />
                  <span>Finding the best shelter advice...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input */}
          <div className="p-4 border-t border-white/10 bg-white/[0.02]">
            <RadiantPromptInput 
              onSubmit={handleSendMessage} 
              placeholder="Ask a follow-up question in plain English..."
              disabled={isLoading}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default AIAssistPage;
