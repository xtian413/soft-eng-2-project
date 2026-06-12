import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
  StyleProp,
  TextStyle,
} from 'react-native';
import {
  ChevronDown,
  ChevronUp,
  Dumbbell,
  FileText,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  Utensils,
  X,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { fontWeight, layout, radius, spacing, typography } from '@/theme/typography';
import type { FitnessInsight, FitnessInsightChatMessage } from '@/ai/insights/fitnessInsight';
import { useAuthStore } from '@/store/authStore';

// Enable LayoutAnimation for Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type InsightsTabProps = {
  insight: FitnessInsight;
  isLoading: boolean;
  lastGeneratedAt: Date | null;
  onRegenerate: () => void;
  onSendChat: (history: FitnessInsightChatMessage[], question: string) => Promise<string>;
};

type ChatMessage = FitnessInsightChatMessage & {
  id: string;
};

function renderFormattedText(
  text: string,
  baseStyle: StyleProp<TextStyle>,
  boldStyle: StyleProp<TextStyle> = { fontWeight: 'bold' }
) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={baseStyle}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={index} style={[baseStyle, boldStyle]}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

type AccordionCardProps = {
  label: string;
  isExpanded: boolean;
  onToggle: () => void;
  icon: React.ComponentType<{ size: number; color: string }>;
  isNextStep?: boolean;
  children: React.ReactNode;
};

function AccordionCard({
  label,
  isExpanded,
  onToggle,
  icon: IconComponent,
  isNextStep = false,
  children,
}: AccordionCardProps) {
  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  const headerBg = isNextStep ? Colors.surfaceContainer : Colors.surfaceContainerLowest;
  const labelColor = isNextStep ? Colors.primary : Colors.onSurface;
  const iconColor = isNextStep ? Colors.primary : Colors.outline;

  return (
    <View style={[
      styles.accordionCard,
      isNextStep && styles.nextAccordionCard
    ]}>
      <TouchableOpacity
        style={[styles.accordionHeader, { backgroundColor: headerBg }]}
        onPress={handleToggle}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} ${label}`}
      >
        <View style={styles.accordionHeaderLeft}>
          <IconComponent size={18} color={iconColor} />
          <Text style={[styles.accordionLabel, { color: labelColor }]}>{label}</Text>
        </View>
        {isExpanded ? (
          <ChevronUp size={18} color={iconColor} />
        ) : (
          <ChevronDown size={18} color={iconColor} />
        )}
      </TouchableOpacity>
      {isExpanded && (
        <View style={[styles.accordionContent, { backgroundColor: headerBg }]}>
          {children}
        </View>
      )}
    </View>
  );
}

type ChatFABProps = {
  onPress: () => void;
};

function ChatFAB({ onPress }: ChatFABProps) {
  return (
    <TouchableOpacity
      style={styles.chatFab}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Ask Gemi"
    >
      <MessageCircle size={20} color={Colors.onPrimary} />
      <Text style={styles.chatFabLabel}>Ask Gemi</Text>
    </TouchableOpacity>
  );
}

export function InsightsTab({
  insight,
  isLoading,
  lastGeneratedAt,
  onRegenerate,
  onSendChat,
}: InsightsTabProps) {
  const { aiMode, lastGenerationSource } = useAuthStore();
  const chatScrollRef = useRef<ScrollView>(null);
  const [isChatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [expandedSections, setExpandedSections] = useState({
    summary: false,
    training: false,
    nutrition: false,
    nextStep: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const cleanInsight = {
    title: insight.title.replace(/^[\s*"'`•#-]+|[\s*"'`•#-]+$/g, '').trim(),
    summary: insight.summary.replace(/^[\s*"'`•#-]+|[\s*"'`•#-]+$/g, '').trim(),
    nutrition: insight.nutrition.replace(/^[\s*"'`•#-]+|[\s*"'`•#-]+$/g, '').trim(),
    training: insight.training.replace(/^[\s*"'`•#-]+|[\s*"'`•#-]+$/g, '').trim(),
    nextStep: insight.nextStep.replace(/^[\s*"'`•#-]+|[\s*"'`•#-]+$/g, '').trim(),
    confidence: insight.confidence.replace(/^[\s*"'`•#-]+|[\s*"'`•#-]+$/g, '').trim(),
  };

  const handleSendChat = async () => {
    const question = chatInput.trim();
    if (!question || isChatSending || isLoading) return;

    const history = chatMessages.map(({ role, content }) => ({ role, content }));
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
    };

    setChatMessages((messages) => [...messages, userMessage]);
    setChatInput('');
    setChatError(null);
    setChatSending(true);

    try {
      const answer = await onSendChat(history, question);
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: answer,
      };
      setChatMessages((messages) => [...messages, assistantMessage]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The on-device model could not finish this chat turn.';
      setChatError(message);
    } finally {
      setChatSending(false);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroBanner}>
          <LinearGradient
            colors={[Colors.primary, '#003f5e']}
            style={styles.headerBand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerText}>
              <Text style={styles.title}>Today's Insight</Text>
              <Text style={styles.metaText}>
                {lastGeneratedAt
                  ? `Generated ${lastGeneratedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : isLoading
                    ? 'Generating once from local data'
                    : 'Waiting for a usable on-device model output'}
              </Text>
            </View>
            <View style={styles.sparkleBadge}>
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Sparkles size={24} color="#ffffff" fill="#ffffff" />
              )}
            </View>
          </LinearGradient>

          {lastGenerationSource === 'local' && (
            <View style={styles.fallbackBanner}>
              <Text style={styles.fallbackBannerText}>
                {aiMode === 'local'
                  ? '⚡ Running on-device Local AI'
                  : '⚡ Running on-device Local AI (Offline fallback)'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.regenerateButton}
            onPress={onRegenerate}
            disabled={isLoading || isChatSending}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Regenerate fitness insight"
          >
            <RefreshCw size={15} color={Colors.onPrimary} />
            <Text style={styles.regenerateText}>{isLoading ? 'Generating' : 'Regenerate Insights'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.accordionContainer}>
          <AccordionCard
            label="Summary"
            icon={FileText}
            isExpanded={expandedSections.summary}
            onToggle={() => toggleSection('summary')}
          >
            {renderFormattedText(cleanInsight.summary, styles.cardText)}
          </AccordionCard>

          <AccordionCard
            label="Training"
            icon={Dumbbell}
            isExpanded={expandedSections.training}
            onToggle={() => toggleSection('training')}
          >
            {renderFormattedText(cleanInsight.training, styles.cardText)}
          </AccordionCard>

          <AccordionCard
            label="Nutrition"
            icon={Utensils}
            isExpanded={expandedSections.nutrition}
            onToggle={() => toggleSection('nutrition')}
          >
            {renderFormattedText(cleanInsight.nutrition, styles.cardText)}
          </AccordionCard>

          <AccordionCard
            label="Next Step"
            icon={Target}
            isExpanded={expandedSections.nextStep}
            onToggle={() => toggleSection('nextStep')}
            isNextStep
          >
            {renderFormattedText(cleanInsight.nextStep, styles.nextText, { fontWeight: fontWeight.bold })}
          </AccordionCard>
        </View>
      </ScrollView>

      <ChatFAB onPress={() => setChatOpen(true)} />

      <Modal
        visible={isChatOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setChatOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.chatOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
        >
          <View style={styles.chatSheet}>
            <View style={styles.chatHandle} />
            <View style={styles.chatHeader}>
              <View style={styles.chatTitleBlock}>
                <Text style={styles.chatEyebrow}>LOCAL MODEL CHAT</Text>
                <Text style={styles.chatTitle}>Ask Gemi</Text>
              </View>
              <TouchableOpacity
                style={styles.chatCloseButton}
                onPress={() => setChatOpen(false)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Close insight chat"
              >
                <X size={18} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <View style={styles.chatContextCard}>
              <Text style={styles.chatContextLabel}>Current insight</Text>
              <Text style={styles.chatContextText}>{cleanInsight.title}</Text>
            </View>

            <ScrollView
              ref={chatScrollRef}
              style={styles.chatMessages}
              contentContainerStyle={styles.chatMessagesContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
            >
              {chatMessages.length === 0 && (
                <View style={styles.chatEmptyState}>
                  <Text style={styles.chatEmptyText}>
                    Ask a follow-up about the insight, today&apos;s macros, or logged training.
                  </Text>
                </View>
              )}

              {chatMessages.map((message) => {
                const isUser = message.role === 'user';
                return (
                  <View
                    key={message.id}
                    style={[styles.chatBubble, isUser ? styles.userBubble : styles.assistantBubble]}
                  >
                    {renderFormattedText(
                      message.content,
                      [styles.chatBubbleText, isUser ? styles.userBubbleText : styles.assistantBubbleText],
                      { fontWeight: 'bold' }
                    )}
                  </View>
                );
              })}

              {isChatSending && (
                <View style={[styles.chatBubble, styles.assistantBubble, styles.thinkingBubble]}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.thinkingText}>Thinking on-device...</Text>
                </View>
              )}

              {chatError && (
                <View style={styles.chatErrorCard}>
                  <Text style={styles.chatErrorText}>{chatError}</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder={isLoading ? 'Wait for insight generation to finish' : 'Ask about this insight'}
                placeholderTextColor={Colors.outline}
                multiline
                maxLength={220}
                editable={!isChatSending && !isLoading}
                accessibilityLabel="Insight chat message"
              />
              <TouchableOpacity
                style={[
                  styles.chatSendButton,
                  (!chatInput.trim() || isChatSending || isLoading) && styles.chatSendButtonDisabled,
                ]}
                onPress={handleSendChat}
                disabled={!chatInput.trim() || isChatSending || isLoading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Send insight chat message"
              >
                {isChatSending ? (
                  <ActivityIndicator size="small" color={Colors.onPrimary} />
                ) : (
                  <Send size={18} color={Colors.onPrimary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl * 2,
    width: '100%',
    maxWidth: layout.modalMaxWidth,
    alignSelf: 'center',
  },
  heroBanner: {
    marginBottom: spacing.base,
  },
  headerBand: {
    minHeight: 168,
    borderRadius: radius.lg,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    marginBottom: spacing.base,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: typography.xxl,
    fontWeight: fontWeight.extraBold,
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  sparkleBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  regenerateButton: {
    width: '100%',
    minHeight: layout.minTouchTarget,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: Colors.primaryContainer,
    marginTop: spacing.xs,
  },
  regenerateText: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.onPrimary,
  },
  accordionContainer: {
    width: '100%',
  },
  accordionCard: {
    borderRadius: radius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  nextAccordionCard: {
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 0,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accordionLabel: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  accordionContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  cardText: {
    fontSize: typography.base,
    lineHeight: 22,
    color: Colors.onSurface,
  },
  nextText: {
    fontSize: typography.base,
    lineHeight: 22,
    color: Colors.onSurface,
    fontWeight: fontWeight.semiBold,
  },
  chatOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11, 28, 48, 0.28)',
  },
  chatSheet: {
    flex: 1,
    marginTop: 64,
    width: '100%',
    maxWidth: layout.modalMaxWidth,
    alignSelf: 'center',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.24)',
    ...Platform.select({
      web: {
        boxShadow: '0px -8px 24px rgba(11, 28, 48, 0.16)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 16,
      },
    }),
  },
  chatHandle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: Colors.outlineVariant,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.base,
    marginBottom: spacing.md,
  },
  chatTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  chatEyebrow: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  chatTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeight.extraBold,
    color: Colors.onSurface,
    letterSpacing: 0,
  },
  chatCloseButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(110, 120, 129, 0.08)',
  },
  chatContextCard: {
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: 'rgba(14, 165, 233, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.12)',
    marginBottom: spacing.md,
  },
  chatContextLabel: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  chatContextText: {
    fontSize: typography.sm,
    lineHeight: 19,
    color: Colors.onSurface,
    fontWeight: fontWeight.semiBold,
  },
  chatMessages: {
    flex: 1,
  },
  chatMessagesContent: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  chatEmptyState: {
    borderRadius: radius.md,
    padding: spacing.base,
    backgroundColor: Colors.surfaceContainerLow,
  },
  chatEmptyText: {
    fontSize: typography.sm,
    lineHeight: 19,
    color: Colors.onSurfaceVariant,
  },
  chatBubble: {
    maxWidth: '86%',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primaryContainer,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.16)',
  },
  chatBubbleText: {
    fontSize: typography.sm,
    lineHeight: 20,
  },
  userBubbleText: {
    color: Colors.onPrimary,
    fontWeight: fontWeight.medium,
  },
  assistantBubbleText: {
    color: Colors.onSurface,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  thinkingText: {
    fontSize: typography.sm,
    color: Colors.onSurfaceVariant,
  },
  chatErrorCard: {
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.16)',
  },
  chatErrorText: {
    fontSize: typography.xs,
    lineHeight: 17,
    color: Colors.error,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  chatInput: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    maxHeight: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.45)',
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: Colors.onSurface,
    fontSize: typography.sm,
    lineHeight: 19,
  },
  chatSendButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryContainer,
  },
  chatSendButtonDisabled: {
    opacity: 0.45,
  },
  fallbackBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.base,
    alignItems: 'center',
  },
  fallbackBannerText: {
    color: '#D97706',
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
  },
  chatFab: {
    position: 'absolute',
    bottom: 88,
    right: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: Colors.primaryContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.base,
    height: 48,
    elevation: 6,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 12px rgba(14, 165, 235, 0.35)',
      },
      default: {
        shadowColor: Colors.primaryContainer,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
    }),
  },
  chatFabLabel: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onPrimary,
  },
  metaText: {
    fontSize: typography.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: spacing.xs,
  },
});
