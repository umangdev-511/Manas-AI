import React, { useEffect, useRef, useState } from 'react';
import '../styles/ConversationPanel.css';

export default function ConversationPanel({
  messages = [],
  onSendMessage,
  isLoading = false,
}) {
  const [draftMessage, setDraftMessage] = useState('');
  const messageEndRef = useRef(null);

  // Keep the newest user/Manas exchange visible without moving the fixed input area.
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';

    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedMessage = draftMessage.trim();
    if (!trimmedMessage || isLoading) return;

    onSendMessage?.(trimmedMessage);
    setDraftMessage('');
  };

  return (
    <section className="conversation-panel" aria-label="Manas conversation">
      <header className="conversation-header">
        <div className="conversation-brand">
          <h1>Manas</h1>
          <p>मानस</p>
        </div>

        <div className="session-status" aria-label="Session active">
          <span className="session-status__dot" aria-hidden="true" />
          <span>Session Active</span>
        </div>
      </header>

      <main className="message-area" aria-live="polite">
        {messages.length === 0 && (
          <div className="welcome-message">
            Hi, I am Manas. This is a safe space — share whatever is on your mind.
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === 'user';
          const timestamp = formatTimestamp(message.timestamp);

          return (
            <article
              className={`message-row ${isUser ? 'message-row--user' : 'message-row--manas'}`}
              key={message.id}
            >
              {!isUser && <div className="message-label">Manas</div>}

              <div className={`message-bubble ${isUser ? 'message-bubble--user' : 'message-bubble--manas'}`}>
                {message.content}
              </div>

              {timestamp && <time className="message-timestamp">{timestamp}</time>}
            </article>
          );
        })}

        {isLoading && (
          <article className="message-row message-row--manas" aria-label="Manas is typing">
            <div className="message-label">Manas</div>
            <div className="message-bubble message-bubble--manas typing-bubble">
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </div>
          </article>
        )}

        <div ref={messageEndRef} />
      </main>

      <footer className="conversation-footer">
        <form className="message-composer" onSubmit={handleSubmit}>
          <input
            className="message-input"
            type="text"
            value={draftMessage}
            onChange={(event) => setDraftMessage(event.target.value)}
            placeholder="Share what's on your mind..."
            disabled={isLoading}
            aria-label="Message Manas"
          />

          <button
            className="send-button"
            type="submit"
            disabled={isLoading || draftMessage.trim().length === 0}
            aria-label="Send message"
          >
            →
          </button>
        </form>

        <div className="conversation-status-bar">
          Manas v0.1 &nbsp;·&nbsp; Session active &nbsp;·&nbsp; No data stored &nbsp;·&nbsp; Demo only
        </div>
      </footer>
    </section>
  );
}
