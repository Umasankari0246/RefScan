import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { 
  Bot, X, Send, Sparkles, Trash2, Copy, Check 
} from "lucide-react";
import { useRefScan } from "../../context/RefScanContext";
import { sendChatMessage, ChatMessage, ChatContext } from "../../services/chatbotService";

export function RefScanChatbot() {
  const location = useLocation();
  const { references, activeBook, activePaper } = useRefScan();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome_1",
      sender: "assistant",
      text: "Hello! I'm **RefScan AI**, your academic research and knowledge co-pilot. Ask me anything about **this project (RefScan)**, your uploaded papers, or any **computer science and AI topics like Google**!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestions: [
        "What is RefScan and how does it work?",
        "What is a transformer model in deep learning?",
        "How do I scan a book barcode?",
        "What is the difference between APA and IEEE?"
      ]
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Active context detection for header badge
  const getContextLabel = () => {
    if (activeBook && (location.pathname.startsWith("/book") || location.pathname.startsWith("/references"))) {
      return `Book: ${activeBook.title.substring(0, 24)}...`;
    }
    if (activePaper && location.pathname.startsWith("/analysis")) {
      return `Paper: ${activePaper.title.substring(0, 24)}...`;
    }
    if (location.pathname.startsWith("/scan")) {
      return "Book Scanner";
    }
    if (location.pathname.startsWith("/citations")) {
      return "Citation Generator";
    }
    return "Workspace Library";
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: "user_" + Date.now(),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const context: ChatContext = {
      currentPath: location.pathname,
      activeBook,
      activePaper,
      references
    };

    try {
      const response = await sendChatMessage(text, context, messages);
      setMessages((prev) => [...prev, response]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: "err_" + Date.now(),
          sender: "assistant",
          text: "I encountered an issue processing your request. Please try asking again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        id: "welcome_reset",
        sender: "assistant",
        text: "Chat cleared! Ask me anything about RefScan features, your uploaded documents, or general AI and computer science questions!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestions: [
          "What is RefScan?",
          "What is deep learning?",
          "How does research paper extraction work?",
          "What is a transformer model?"
        ]
      }
    ]);
  };

  return (
    <>
      {/* Floating Action Button — Compact Circular on Mobile, Full Pill on Desktop */}
      {!isOpen && (
        <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-3.5 sm:right-6 z-50 animate-in fade-in duration-200 select-none no-print">
          <button
            onClick={() => setIsOpen(true)}
            aria-label="RefScan AI Assistant"
            title="RefScan AI Assistant"
            className="group flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#5B4BDB] to-[#7928CA] text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/45 active:scale-95 transition-all duration-200 cursor-pointer border border-white/25 md:w-auto md:h-auto md:rounded-xl md:px-3.5 md:py-2.5 md:bg-[var(--surface-raised)] md:hover:bg-[var(--surface-muted)] md:text-[var(--text-primary)] md:border-[var(--border)] md:shadow-md md:gap-2.5"
          >
            {/* Mobile AI Icon Only (44-48px circular button, no text) */}
            <div className="md:hidden flex items-center justify-center">
              <Sparkles size={20} className="text-white drop-shadow-xs" />
            </div>

            {/* Desktop Assistant Pill Elements */}
            <div className="hidden md:flex w-6 h-6 rounded-lg bg-[var(--primary)] text-white items-center justify-center flex-shrink-0 shadow-2xs">
              <Bot size={14} />
            </div>
            <span className="hidden md:inline font-semibold text-xs tracking-tight text-[var(--text-primary)]">
              RefScan Assistant
            </span>
          </button>
        </div>
      )}

      {/* Expandable Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-2.5 sm:right-6 z-50 w-[calc(100vw-20px)] sm:w-[390px] h-[500px] max-h-[calc(100vh-110px)] bg-[var(--surface)] rounded-2xl shadow-2xl border border-[var(--border)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-[var(--text-primary)]">
          {/* Header */}
          <div className="bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center flex-shrink-0">
                <Bot size={15} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-xs tracking-tight text-[var(--text-primary)]">RefScan Assistant</h3>
                  <span className="text-[9px] bg-[var(--surface-muted)] text-[var(--text-muted)] font-semibold px-1.5 py-0.5 rounded border border-[var(--border)] uppercase tracking-wider">
                    AI
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] truncate flex items-center gap-1 font-medium">
                  <Sparkles size={10} className="flex-shrink-0 text-[var(--primary)]" /> {getContextLabel()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                title="Clear conversation"
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize chat"
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] rounded-lg transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--surface-soft)] custom-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-xl p-3 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[var(--primary)] text-white shadow-2xs"
                      : "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] shadow-2xs"
                  }`}
                >
                  {/* HTML Rich Render or Plain Text */}
                  {msg.html ? (
                    <div dangerouslySetInnerHTML={{ __html: msg.html }} />
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  )}

                  {/* Copy Button for Assistant Citations/Outputs */}
                  {msg.sender === "assistant" && (
                    <div className="flex justify-end mt-2 pt-1.5 border-t border-[var(--border)]">
                      <button
                        onClick={() => handleCopy(msg.text, msg.id)}
                        className="text-[11px] text-[var(--text-muted)] hover:text-[var(--primary)] flex items-center gap-1 font-medium cursor-pointer transition-colors"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check size={11} className="text-emerald-500" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={11} /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-[var(--text-muted)] mt-1 px-1">{msg.timestamp}</span>

                {/* Suggested prompt chips */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 max-w-[95%]">
                    {msg.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSend(suggestion)}
                        className="text-[11px] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] px-2.5 py-1 rounded-lg font-medium transition-colors text-left cursor-pointer shadow-2xs"
                      >
                        💬 {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--surface)] p-2.5 rounded-lg w-fit border border-[var(--border)] shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-ping" />
                <span className="font-medium">Processing query...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-[var(--surface)] border-t border-[var(--border)] flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about books, citations, or papers..."
              className="flex-1 bg-[var(--input-bg)] text-[var(--input-text)] placeholder-[var(--input-placeholder)] border border-[var(--input-border)] px-3 py-1.5 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] font-medium"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-8 h-8 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 text-white rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-2xs flex-shrink-0"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
