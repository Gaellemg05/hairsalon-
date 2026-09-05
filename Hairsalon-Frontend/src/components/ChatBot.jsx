import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';

const BASE_URL = 'http://localhost:8000';

const WELCOME_MSG = {
  sender: 'bot',
  text: "Hi! I'm LuxeSalon's hair care assistant.\n\nAsk me about hairstyles, hair care routines, or get personalized recommendations.\n\nExamples: curly hair care, wedding hairstyle, dry hair treatment, braid prices.",
};

function formatText(text) {
  return text.split('\n').map((line, i) => <p key={i}>{line}</p>);
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/chatbot/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { sender: 'bot', text: data.response }]);
    } catch {
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Desole, je n arrive pas a me connecter au serveur.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <div className="chatbot-drawer">
          <div className="chatbot-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="chatbot-avatar"><Sparkles size={18} /></div>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px' }}>Conseiller Capillaire</h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>Ask me anything</p>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chatbot-msg ${msg.sender === 'user' ? 'chatbot-msg-user' : 'chatbot-msg-bot'}`}>
                {formatText(msg.text)}
              </div>
            ))}
            {loading && (
              <div className="chatbot-msg chatbot-msg-bot">
                <div className="chatbot-typing"><span /><span /><span /></div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <form className="chatbot-input" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading || !input.trim()}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <button
        className="chatbot-fab"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
}