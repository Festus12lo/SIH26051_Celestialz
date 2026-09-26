import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Send, Bot, User, Compass, Shield, Flame, Terminal, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import RadiantPromptInput from './RadiantPromptInput';
import { chatWithArchitect, type ChatMessage } from '../api/llmClient';

interface ArchitecturalCoPilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  blueprintData?: any;
  initialMessages?: ChatMessage[];
  onMessagesChange?: (msgs: ChatMessage[]) => void;
}

export const ArchitecturalCoPilotDrawer: React.FC<ArchitecturalCoPilotDrawerProps> = ({
  isOpen,
  onClose,
  blueprintData,
  initialMessages = [],
  onMessagesChange
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Context summaries
  const location = blueprintData?.location || blueprintData?.meta?.location || 'Specified Climate Zone';
  const buildingType = blueprintData?.building_type || blueprintData?.meta?.building_type || 'Bioclimatic Shelter';
  const orientation = blueprintData?.building?.orientation?.primary_facade || 'South';
  const wallMaterial = typeof blueprintData?.walls?.primary_material === 'string'
    ? blueprintData.walls.primary_material
    : blueprintData?.walls?.primary_material?.name || 'Local High-Mass Material';

  const suggestedQuestions = [
    `Why is ${orientation} orientation critical for ${location}?`,
    `Explain the thermal flywheel lag of the wall assembly.`,
    `How does this layout comply with NBC 2016 ventilation guidelines?`,
    `What are the extreme temperature buffers for this geometry?`
  ];

  const handleSend = async (queryText: string) => {
    if (!queryText.trim()) return;

    // Inject active blueprint context into the system prompt behind the scenes
    const systemContext = blueprintData ? `\n[SYSTEM CONTEXT - Active Shelter Dossier:
- Location: ${location}
- Building Typology: ${buildingType}
- Orientation: ${orientation}
- Enclosure: ${wallMaterial}
- R-Value Wall: ${blueprintData?.walls?.r_value_si || 'N/A'}
- Floor Area: ${blueprintData?.building?.floor_area_m2 || 80} m²
Answer the user's architectural and thermodynamic questions with precision, grounded in building physics and bioclimatic engineering.]` : '';

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: queryText }
    ];

    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setIsLoading(true);

    try {
      // Append context behind the scenes for the LLM
      const messagesWithContext = [...newMessages];
      if (systemContext) {
        messagesWithContext[messagesWithContext.length - 1] = {
          role: 'user',
          content: `${queryText}\n\n${systemContext}`
        };
      }

      await chatWithArchitect(messagesWithContext, undefined, (fullText) => {
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
          content: 'An error occurred while communicating with the architectural reasoning engine. Please ensure your API key or server connection is active.' 
        };
        return updated;
      });
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-lg md:max-w-xl bg-[#090d15] border-l border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10 bg-[#070a10] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF5722]/15 border border-[#FF5722]/30 flex items-center justify-center text-[#FF5722]">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Architectural Co-Pilot
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                      PHYSICS LINKED
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono truncate max-w-[280px]">
                    Dossier: {location} • {buildingType}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-colors cursor-pointer"
                title="Close Co-Pilot (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Context Notice */}
            <div className="px-5 py-2.5 bg-black/40 border-b border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Compass size={13} className="text-[#FF5722]" />
                True South Azimuth: 180°
              </span>
              <span className="flex items-center gap-1.5 text-zinc-500">
                <Shield size={13} className="text-emerald-400" />
                NBC 2016 Compliant
              </span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">
              {messages.length === 0 ? (
                <div className="py-8 flex flex-col items-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FF5722]">
                    <Bot size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-white font-bold text-base">
                      Interactive Blueprint Specialist
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                      Ask technical questions regarding solar geometry, thermal mass calculations, local material procurement, or ventilation physics for this shelter design.
                    </p>
                  </div>

                  {/* Suggestion Chips */}
                  <div className="w-full pt-4 space-y-2 text-left">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block px-1">
                      Suggested Architectural Inquiries
                    </span>
                    <div className="flex flex-col gap-2">
                      {suggestedQuestions.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(q)}
                          className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#FF5722]/30 text-xs text-zinc-300 hover:text-white transition-all font-mono cursor-pointer flex items-center justify-between group"
                        >
                          <span className="truncate pr-2">{q}</span>
                          <span className="text-zinc-500 group-hover:text-[#FF5722] transition-colors shrink-0">→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 mb-1 px-1">
                      {msg.role === 'user' ? (
                        <>
                          <span>ARCHITECT</span>
                          <User size={11} className="text-[#FF5722]" />
                        </>
                      ) : (
                        <>
                          <Bot size={11} className="text-emerald-400" />
                          <span>CO-PILOT ENGINE</span>
                        </>
                      )}
                    </div>

                    <div
                      className={`max-w-[92%] rounded-2xl p-4 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#FF5722]/15 text-white border border-[#FF5722]/30 font-medium'
                          : 'bg-[#101622] text-zinc-200 border border-white/10 shadow-lg'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="m-0 whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-code:text-[#FF5722] prose-code:font-mono">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {isLoading && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 w-fit">
                  <span className="w-2 h-2 rounded-full bg-[#FF5722] animate-ping" />
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                    Consulting Thermal & Structural Matrix...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-white/10 bg-[#070a10]">
              <RadiantPromptInput
                onSubmit={handleSend}
                placeholder="Ask about thermal flywheel, U-values, or climate strategy..."
                disabled={isLoading}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ArchitecturalCoPilotDrawer;
