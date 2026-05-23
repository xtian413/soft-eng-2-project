import React, { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing } from '@/theme/typography';
import type { ChatMessage, MacroTargets, FoodLogEntry } from '@/screens/dashboard/types';
import { ArrowUp, Bot, Lock } from 'lucide-react-native';

// Keyword-based simulated AI responses
const AI_RESPONSES: { keywords: string[]; response: string }[] = [
  {
    keywords: ['hello', 'hi', 'hey'],
    response: "Hey! I'm Gemi, your on-device AI coach. How can I help you today? Ask me about your workout, nutrition, or recovery! 💪",
  },
  {
    keywords: ['protein', 'macro', 'nutrition'],
    response: 'For muscle building, aim for 1.6–2.2g of protein per kg of body weight daily. Spread it across 4-5 meals for optimal synthesis. Your current intake looks great!',
  },
  {
    keywords: ['workout', 'training', 'exercise', 'lift'],
    response: 'Progressive overload is key — try adding 2.5kg or 1 rep each week on your compound lifts. Make sure you\'re hitting all major muscle groups 2-3x per week.',
  },
  {
    keywords: ['sleep', 'rest', 'recovery'],
    response: 'Sleep is when your muscles grow! Aim for 7-9 hours. Growth hormone peaks during deep sleep cycles, so consistent sleep timing matters as much as duration.',
  },
  {
    keywords: ['calorie', 'weight', 'loss', 'cut'],
    response: 'For fat loss, a 300-500 kcal daily deficit is sustainable. Keep protein high (2g/kg) to preserve muscle while cutting. Track weekly averages, not daily numbers.',
  },
  {
    keywords: ['motivation', 'tired', 'energy'],
    response: 'Feeling low on energy? Check your carb intake before training — 30-60g of carbs 1-2 hours before can boost performance significantly. Also ensure you\'re hydrated!',
  },
  {
    keywords: ['squat', 'deadlift', 'bench'],
    response: 'Great compound movements! Focus on progressive overload — add weight gradually. Log your sets and aim for 3-5 sets of 5-8 reps for strength development.',
  },
];

function getAIResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  for (const { keywords, response } of AI_RESPONSES) {
    if (keywords.some((k) => lower.includes(k))) {
      return response;
    }
  }
  return "That's a great question! As your on-device AI coach, I'm here to help with workouts, nutrition, and recovery. Could you be more specific? I'm running locally for your privacy. 🔒";
}

interface AIChatTabProps {
  foodLogs: FoodLogEntry[];
  targets: MacroTargets;
}

export function AIChatTab({ foodLogs, targets }: AIChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hi! I'm Gemi, your on-device AI fitness coach. I run entirely on your device — no internet needed. Ask me anything about your workouts, nutrition, or recovery! 💪🔒",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate on-device inference delay
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getAIResponse(text),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200);

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Bot size={16} color={Colors.onPrimary} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {item.content}
          </Text>
          <Text style={[styles.timestamp, isUser && styles.timestampUser]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Bot size={18} color={Colors.onPrimary} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Gemi AI Coach</Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.headerSub}>On-device</Text>
            <Text style={styles.headerSubBullet}>·</Text>
            <Lock size={10} color={Colors.outline} />
            <Text style={styles.headerSub}>Private</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          isTyping ? (
            <View style={styles.typingIndicator}>
              <View style={styles.avatar}>
                <Bot size={16} color={Colors.onPrimary} />
              </View>
              <View style={styles.typingBubble}>
                <Text style={styles.typingText}>Thinking...</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask your AI coach..."
          placeholderTextColor={Colors.outline}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
          activeOpacity={0.8}
        >
          <ArrowUp size={20} color={inputText.trim() ? Colors.onPrimary : Colors.outline} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.15)',
  },
  headerTitle: {
    fontSize: typography.base,
    fontWeight: fontWeight.semiBold,
    color: Colors.onSurface,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: '#10b981',
  },
  headerSub: {
    fontSize: typography.xs,
    color: Colors.outline,
  },
  headerSubBullet: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginHorizontal: 2,
  },
  messageList: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl * 2,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  messageRowUser: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: Colors.onPrimary,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  bubbleAssistant: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomLeftRadius: radius.xs ?? 2,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.1)',
  },
  bubbleUser: {
    backgroundColor: Colors.primaryContainer,
    borderBottomRightRadius: radius.xs ?? 2,
  },
  bubbleText: {
    fontSize: typography.base,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: Colors.onPrimary,
  },
  timestamp: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginTop: spacing.xs,
  },
  timestampUser: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typingBubble: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.1)',
  },
  typingText: {
    fontSize: typography.base,
    color: Colors.outline,
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: 'rgba(190, 200, 210, 0.15)',
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.25)',
    borderRadius: radius.xl,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontSize: typography.base,
    color: Colors.onSurface,
    backgroundColor: Colors.background,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(190, 200, 210, 0.2)',
  },
  sendBtnText: {
    color: Colors.onPrimary,
    fontSize: typography.xl,
    fontWeight: fontWeight.bold,
  },
});
