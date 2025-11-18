import { useState } from "react";
import type { FormEvent } from "react";


type Role = "system" | "user" | "assistant";

interface Message {
  role: Role;
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey, I’m your local ChatGPT-style clone. What do you want to ask?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];

    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const reply: string = data.reply;

      setMessages([
        ...newMessages,
        { role: "assistant", content: reply },
      ]);
    } catch (err: any) {
      console.error(err);
      setError("Something broke talking to the backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-root">
      <aside className="sidebar">
        <button
          className="new-chat-btn"
          onClick={() => {
            setMessages([
              {
                role: "assistant",
                content:
                  "New chat started. Ask me anything.",
              },
            ]);
            setError(null);
          }}
        >
          + New chat
        </button>

        <div className="sidebar-section">
          <div className="sidebar-title">Recent</div>
          {/* Static dummy conversations for now */}
          <button className="sidebar-item">CDAC doubts</button>
          <button className="sidebar-item">React + Bun stuff</button>
          <button className="sidebar-item">Random life rant</button>
        </div>

        <div className="sidebar-footer">
          <span className="sidebar-user">You · Local Dev</span>
        </div>
      </aside>

      <main className="chat-panel">
        <header className="chat-header">
          <div className="chat-header-title">MyGPT</div>
          <div className="chat-header-sub">local client · black theme</div>
        </header>

        <section className="chat-messages">
          <div className="chat-column">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  "message-row " +
                  (m.role === "user"
                    ? "message-row-user"
                    : "message-row-assistant")
                }
              >
                <div
                  className={
                    "message-bubble " +
                    (m.role === "user"
                      ? "message-bubble-user"
                      : "message-bubble-assistant")
                  }
                >
                  <div className="message-role">
                    {m.role === "assistant" ? "Assistant" : "You"}
                  </div>
                  <div className="message-content">
                    {m.content}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="message-row message-row-assistant">
                <div className="message-bubble message-bubble-assistant">
                  <div className="message-role">Assistant</div>
                  <div className="message-content">
                    Thinking…
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="error-banner">
                {error}
              </div>
            )}
          </div>
        </section>

        <footer className="chat-input-area">
          <form className="chat-form" onSubmit={handleSubmit}>
            <textarea
              className="chat-textarea"
              placeholder="Send a message..."
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              className="chat-send-btn"
              type="submit"
              disabled={loading || !input.trim()}
            >
              {loading ? "..." : "Send"}
            </button>
          </form>
          <div className="chat-footer-note">
            Powered by OpenAI · running on your Python backend
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
