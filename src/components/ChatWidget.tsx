import React, { useState } from 'react';
import { MessageSquare, X, Send, Bot, Shield } from 'lucide-react';

interface ChatWidgetProps {
  onNavigateToStep?: (step: any) => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMsg, setInputMsg] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: 'Namaste! I am your MediKiosk AI Assistant. How can I help you today with your OPD registration or consultation?',
      time: 'Just now',
    },
  ]);

  const quickPrompts = [
    'How do I scan my ABHA card?',
    'What do I do in a medical emergency?',
    'Where do I find my OPD queue token?',
    'How does DPDP data protection work?',
  ];

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputMsg.trim();
    if (!text) return;

    const userMsg = {
      sender: 'user' as const,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMsg('');

    // Call AI Chat Assistant API with offline fallback
    fetch('/api/chat/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot' as const,
            text: data.reply || 'Thank you for asking. Our staff and automated kiosk are here to assist you.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      })
      .catch(() => {
        let reply = 'Thank you for asking. Our staff and automated kiosk are here to assist you through every step.';
        const lower = text.toLowerCase();

        if (lower.includes('abha') || lower.includes('id') || lower.includes('card')) {
          reply = 'You can scan your ABHA QR code on Step 2 (Identity Screen), enter your 14-digit ABHA ID, or use voice recognition to identify yourself.';
        } else if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('chest pain') || lower.includes('red')) {
          reply = '🚨 If you are experiencing severe chest pain, extreme breathlessness, or trauma, please alert the triage desk immediately or ask the nurse at Station 1. The system triggers an immediate Level-1 red flag.';
        } else if (lower.includes('token') || lower.includes('queue') || lower.includes('room')) {
          reply = 'Your OPD token number and assigned room (e.g., Room #104, Dr. Priya Sharma) are generated at the end of the intake flow. You can also monitor live tokens in the "OPD Queue" tab.';
        } else if (lower.includes('dpdp') || lower.includes('privacy') || lower.includes('security') || lower.includes('data')) {
          reply = 'Under DPDP Act 2023, your biometric voice and document scans are completely purged from kiosk RAM immediately after transmission to the encrypted doctor console.';
        }

        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot' as const,
            text: reply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      });
  };

  return (
    <>
      {/* Floating Action Button in Bottom Right Corner */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Helper tooltip badge */}
        {!isOpen && (
          <div className="mb-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-md text-slate-700 text-xs font-semibold flex items-center gap-1.5 animate-bounce">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-indigo-600 font-bold">Kiosk Help</span>
          </div>
        )}

        <button
          id="floating-chat-widget-btn"
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
          aria-label="Open Kiosk Chat Assistant"
        >
          {isOpen ? (
            <X className="w-6 h-6 stroke-[2.5]" />
          ) : (
            <MessageSquare className="w-6 h-6 stroke-[2.2]" />
          )}
        </button>
      </div>

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[92vw] sm:w-96 max-h-[560px] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 p-4 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Bot className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                  <span>MediKiosk Assistant</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px]">
                    AI
                  </span>
                </h3>
                <p className="text-[11px] text-indigo-100 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online • Quick Kiosk Support</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl hover:bg-white/10 transition text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[320px] bg-slate-50/50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-xs shadow-sm font-medium'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs font-normal'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1 font-mono">
                  {msg.time}
                </span>
              </div>
            ))}
          </div>

          {/* Quick Prompts */}
          <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-violet-50 hover:bg-violet-100 text-indigo-700 border border-indigo-200 text-[11px] font-semibold transition flex-shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
            />
            <button
              onClick={() => handleSend()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-slate-100/70 px-4 py-1.5 text-center text-[10px] text-slate-400 font-mono border-t border-slate-100 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3 text-indigo-600" />
            <span>DPDP Act 2023 Compliant • Privacy Secured</span>
          </div>
        </div>
      )}
    </>
  );
};
