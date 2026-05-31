import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useSettingsStore } from '../store/settings';
import { Send, Bot, Sparkles, Trash2, Edit2, Check, X, Key, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const QUICK_QUESTIONS = [
  'Bugun qaysi filial eng yaxshi ishladi?',
  'Qayerda eng katta kamomad bor?',
  'O\'rtacha yetkazib berish vaqti qancha?',
  'Bugungi umumiy foyda qancha?',
  'Qaysi kuryer eng tez yetkazadi?',
  'Muddati o\'tgan vazifalar haqida ayt',
];

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  time: Date;
  editing?: boolean;
}

export default function AIPage() {
  const { anthropicApiKey } = useSettingsStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [editText, setEditText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const hasKey = !!anthropicApiKey;

  const askMutation = useMutation({
    mutationFn: (question: string) =>
      api.post('/ai/ask', { question, api_key: anthropicApiKey }).then(r => r.data),
    onSuccess: (data) => {
      setMessages(m => [...m, {
        id: Date.now().toString(),
        role: 'ai',
        text: data.answer,
        time: new Date(),
      }]);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'AI xatolik'),
  });

  const summaryMutation = useMutation({
    mutationFn: () => api.post('/ai/daily-summary', { api_key: anthropicApiKey }).then(r => r.data),
    onSuccess: (data) => {
      setMessages(m => [...m, {
        id: Date.now().toString(),
        role: 'ai',
        text: data.summary,
        time: new Date(),
      }]);
    },
    onError: () => toast.error('Hisobot generatsiyasida xatolik'),
  });

  function sendMessage(question: string) {
    if (!question.trim()) return;
    if (!hasKey) {
      toast.error('Avval AI API kalitini Sozlamalarda kiriting');
      return;
    }
    setMessages(m => [...m, {
      id: Date.now().toString(),
      role: 'user',
      text: question,
      time: new Date(),
    }]);
    setInput('');
    askMutation.mutate(question);
  }

  function deleteMessage(id: string) {
    setMessages(m => m.filter(msg => msg.id !== id));
  }

  function startEdit(id: string, text: string) {
    setMessages(m => m.map(msg => msg.id === id ? { ...msg, editing: true } : msg));
    setEditText(text);
  }

  function saveEdit(id: string) {
    setMessages(m => m.map(msg => msg.id === id ? { ...msg, text: editText, editing: false } : msg));
  }

  function clearAll() {
    setMessages([]);
    toast.success('Suhbat tozalandi');
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col gap-3" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Bot size={18} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">AI Yordamchi</h1>
            <p className="text-xs text-slate-400">
              {hasKey ? '✅ API kalit ulangan' : '❌ API kalit yo\'q'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {messages.length > 0 && (
            <button onClick={clearAll} className="btn-ghost text-sm flex items-center gap-1">
              <Trash2 size={14} /> Tozalash
            </button>
          )}
          <button
            onClick={() => summaryMutation.mutate()}
            disabled={summaryMutation.isPending || !hasKey}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <Sparkles size={14} className={summaryMutation.isPending ? 'animate-spin' : ''} />
            Kunlik hisobot
          </button>
        </div>
      </div>

      {/* No API Key warning */}
      {!hasKey && (
        <div className="card border-yellow-500/30 bg-yellow-500/10 flex items-start gap-3">
          <AlertCircle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-yellow-300 text-sm font-medium">API kalit kerak</p>
            <p className="text-yellow-400/70 text-xs mt-0.5">
              AI yordamchidan foydalanish uchun Anthropic API kalitini kiriting.
            </p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="btn-primary text-xs flex items-center gap-1 flex-shrink-0"
          >
            <Key size={12} /> Kalit kiriting
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 card overflow-y-auto space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Bot size={48} className="text-purple-400/40 mb-4" />
            <p className="text-slate-400 mb-6 text-sm">
              {hasKey ? 'Savol bering yoki tezkor savollardan birini tanlang' : 'API kalit kiritgandan so\'ng foydalanish mumkin'}
            </p>
            {hasKey && (
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
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'ai' ? 'bg-purple-500/20' : 'bg-red-500'
            }`}>
              {msg.role === 'ai' ? <Bot size={14} className="text-purple-400" /> : <span className="text-white text-xs">Siz</span>}
            </div>

            <div className={`max-w-[80%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {msg.editing ? (
                <div className="flex gap-1 w-full">
                  <input
                    className="input text-sm flex-1"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveEdit(msg.id)}
                    autoFocus
                  />
                  <button onClick={() => saveEdit(msg.id)} className="text-green-400 p-1"><Check size={14} /></button>
                  <button onClick={() => setMessages(m => m.map(x => x.id === msg.id ? { ...x, editing: false } : x))} className="text-red-400 p-1"><X size={14} /></button>
                </div>
              ) : (
                <div className={`rounded-xl px-3 py-2 text-sm whitespace-pre-wrap relative ${
                  msg.role === 'ai' ? 'bg-slate-700 text-slate-100' : 'bg-red-500 text-white'
                }`}>
                  {msg.text}
                  {/* Edit/Delete buttons */}
                  <div className={`absolute -top-6 ${msg.role === 'user' ? 'right-0' : 'left-0'} hidden group-hover:flex gap-1 bg-slate-800 border border-slate-700 rounded-lg px-1 py-0.5`}>
                    <button onClick={() => startEdit(msg.id, msg.text)} className="text-slate-400 hover:text-blue-400 p-0.5">
                      <Edit2 size={11} />
                    </button>
                    <button onClick={() => deleteMessage(msg.id)} className="text-slate-400 hover:text-red-400 p-0.5">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              )}
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
              <div className="flex gap-1 items-center">
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
          placeholder={hasKey ? 'Savol yozing...' : 'Avval API kalit kiriting (Sozlamalar)'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
          disabled={askMutation.isPending || !hasKey}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || askMutation.isPending || !hasKey}
          className="btn-primary px-3"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
