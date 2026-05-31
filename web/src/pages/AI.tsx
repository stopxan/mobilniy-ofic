import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Send, Bot, Sparkles, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const QUICK_QUESTIONS = [
  'Bugun qaysi filial eng yaxshi ishladi?',
  'Qayerda eng katta kamomad bor?',
  'O\'rtacha yetkazib berish vaqti qancha?',
  'Bugungi umumiy foyda qancha?',
  'Qaysi kuryer eng tez yetkazadi?',
  'Muddati o\'tgan vazifalar haqida ayt',
];

interface Message {
  role: 'user' | 'ai';
  text: string;
  time: Date;
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const askMutation = useMutation({
    mutationFn: (question: string) => api.post('/ai/ask', { question }).then(r => r.data),
    onSuccess: (data) => {
      setMessages(m => [...m, { role: 'ai', text: data.answer, time: new Date() }]);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'AI xatolik'),
  });

  const summaryMutation = useMutation({
    mutationFn: () => api.post('/ai/daily-summary').then(r => r.data),
    onSuccess: (data) => {
      setMessages(m => [...m, { role: 'ai', text: data.summary, time: new Date() }]);
    },
    onError: () => toast.error('Hisobot generatsiyasida xatolik'),
  });

  function sendMessage(question: string) {
    if (!question.trim()) return;
    setMessages(m => [...m, { role: 'user', text: question, time: new Date() }]);
    setInput('');
    askMutation.mutate(question);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full space-y-4" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Bot size={18} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">AI Yordamchi</h1>
            <p className="text-xs text-slate-400">Biznes ma'lumotlari asosida javob beradi</p>
          </div>
        </div>
        <button
          onClick={() => summaryMutation.mutate()}
          disabled={summaryMutation.isPending}
          className="btn-ghost flex items-center gap-2 text-sm"
        >
          <Sparkles size={14} className={summaryMutation.isPending ? 'animate-spin' : ''} />
          Kunlik hisobot
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 card overflow-y-auto space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Bot size={48} className="text-purple-400/40 mb-4" />
            <p className="text-slate-400 mb-6">Savol bering yoki tezkor savollardan birini tanlang</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {QUICK_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg p-2 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'ai' ? 'bg-purple-500/20' : 'bg-red-500'
            }`}>
              {msg.role === 'ai' ? <Bot size={14} className="text-purple-400" /> : '👤'}
            </div>
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div className={`rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === 'ai' ? 'bg-slate-700 text-slate-100' : 'bg-red-500 text-white'
              }`}>
                {msg.text}
              </div>
              <span className="text-xs text-slate-600">
                {msg.time.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {askMutation.isPending && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Bot size={14} className="text-purple-400" />
            </div>
            <div className="bg-slate-700 rounded-xl px-3 py-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Savol yozing..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
          disabled={askMutation.isPending}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || askMutation.isPending}
          className="btn-primary px-3"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
