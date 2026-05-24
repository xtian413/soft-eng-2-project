import React, { useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  NativeModules,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing } from '@/theme/typography';
import type { ChatMessage, MacroTargets, FoodLogEntry } from '@/screens/dashboard/types';
import { ArrowUp, Bot, Lock } from 'lucide-react-native';
import { initializeGemmaOnStartup } from '@/ai/gemmaInit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildFreeChatPrompt, type WorkoutLog, type DietLog, type UserProfile } from '@/ai/prompts';

const { GemmaModule } = NativeModules;

interface AIChatTabProps {
  userName: string;
  foodLogs: FoodLogEntry[];
  targets: MacroTargets;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  profile: any; // Using any for simplicity as it comes from authStore
}

export function AIChatTab({ userName, foodLogs, targets, messages, setMessages, profile }: AIChatTabProps) {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleSend = async () => {
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

    try {
      // 1. Fetch context
      const workoutsStr = await AsyncStorage.getItem('gemi:workouts');
      const dietStr = await AsyncStorage.getItem('gemi:dietLogs');
      
      const workouts: WorkoutLog[] = workoutsStr ? JSON.parse(workoutsStr) : [];
      const diets: DietLog[] = dietStr ? JSON.parse(dietStr) : [];
      
      // Adapt authStore profile to what buildFreeChatPrompt expects
      const userProfile: UserProfile | null = profile ? {
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        goal: profile.goal,
      } : null;

      // 2. Build structured prompt
      const prompt = buildFreeChatPrompt(userName, userProfile, text, workouts, diets);

      // 3. Initialize and extract model from assets if not already done
      await initializeGemmaOnStartup();
      
      // 4. Pass structured prompt to native Gemma module for inference
      const response = await GemmaModule.generateResponse(prompt);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error('Gemma native inference failed:', error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error running the on-device model. Please check the logs.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
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
    <View style={styles.container}>
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
        data={[...messages].reverse()}
        inverted={true}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
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
      <View style={[styles.inputBar, { paddingBottom: isKeyboardVisible ? spacing.md : 90 }]}>
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
    </View>
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
    flexGrow: 1,
    padding: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: 100, // Enough padding so it doesn't cut off behind the top header
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
