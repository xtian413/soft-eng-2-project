import React from 'react';
import { useAIChat } from './hooks/useAIChat';
import './AIChat.css';

export const AIChat: React.FC = () => {
  const {
    messages,
    userInput,
    setUserInput,
    isTyping,
    chatContainerRef,
    handleSendMessage,
  } = useAIChat();

  return (
    <div className="lumina-chat-layout">
      <div className="lumina-chat-messages" ref={chatContainerRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`lumina-chat-bubble-wrapper ${msg.sender}`}>
            {msg.sender === 'ai' && (
              <div className="lumina-chat-avatar">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              </div>
            )}
            <div className="lumina-chat-bubble">
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="lumina-chat-bubble-wrapper ai">
            <div className="lumina-chat-avatar">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <div className="lumina-chat-bubble typing">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}
      </div>

      <form className="lumina-chat-input-row" onSubmit={handleSendMessage}>
        <input 
          type="text" 
          className="lumina-chat-input" 
          placeholder="Ask your on-device coach anything..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
        />
        <button type="submit" className="lumina-chat-send-btn" aria-label="Send message">
          <span className="material-symbols-outlined">send</span>
        </button>
      </form>
    </div>
  );
};
