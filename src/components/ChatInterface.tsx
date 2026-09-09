import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import RadiantPromptInput from './RadiantPromptInput';
import { chatWithArchitect, type ChatMessage } from '../api/llmClient';

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (value: string) => {
    if (!value.trim()) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: value }
    ];
    
    // Add blank assistant message
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setIsLoading(true);

    try {
      await chatWithArchitect(newMessages, undefined, (fullText) => {
        setIsLoading(false); // Hide spinner on first chunk
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullText };
          return updated;
        });
      });
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'An error occurred while communicating with the architect.' };
        return updated;
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto transition-all duration-500">
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8 scrollbar-hide">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                msg.role === 'user' 
                  ? 'bg-zinc-800 text-white shadow-lg' 
                  : 'bg-transparent text-zinc-300 prose prose-invert max-w-none'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="text-base font-light tracking-wide m-0">{msg.content}</p>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex w-full justify-start">
            <div className="max-w-[85%] rounded-2xl px-5 py-4 bg-transparent text-zinc-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></span>
              <span className="ml-2 text-sm font-mono tracking-widest uppercase">Calculating Physics...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="w-full pb-8 px-4 mt-auto">
        <RadiantPromptInput 
          onSubmit={handleSubmit} 
          placeholder="Ask about passive cooling, R-values, or extreme climate shelter design..."
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
