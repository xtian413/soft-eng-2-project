import { useState, useEffect, useRef } from 'react';
import type { Message } from '../types';

export const useAIChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: "Hey! I'm Gemi, your local AI coach. How can I help you reach your goals today?" }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat window
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const userText = userInput;
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setUserInput('');
    setIsTyping(true);

    // AI simulated response
    setTimeout(() => {
      let aiText = "Analyzing your macro trends to tailor your CNS recovery plan. Let's keep working!";
      const lower = userText.toLowerCase();
      if (lower.includes('water') || lower.includes('hydrate')) {
        aiText = "Hydration supports muscle volumization and protein synthesis. Make sure you hit your daily L target!";
      } else if (lower.includes('protein') || lower.includes('macros')) {
        aiText = "Prioritizing protein keeps you in positive nitrogen balance for tissue repair. High protein breakfast is key!";
      } else if (lower.includes('sleep') || lower.includes('tired')) {
        aiText = "Sleep is crucial for growth hormone release. Aim for at least 7.5h tonight to restore neural fatigue.";
      } else if (lower.includes('workout') || lower.includes('lift')) {
        aiText = "Hypertrophy routine calls for high mechanical tension. Push for RPE 8-9 on your main working sets!";
      }
      setMessages(prev => [...prev, { sender: 'ai', text: aiText }]);
      setIsTyping(false);
    }, 1500);
  };

  return {
    messages,
    userInput,
    setUserInput,
    isTyping,
    chatContainerRef,
    handleSendMessage,
  };
};
