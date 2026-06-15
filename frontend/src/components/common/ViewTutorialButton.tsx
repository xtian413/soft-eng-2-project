import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { HelpCircle } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing } from '@/theme/typography';

interface ViewTutorialButtonProps {
  onPress?: () => void;
  style?: any;
}

/**
 * Reusable button component to show the onboarding tutorial again.
 * Can be placed in settings or profile screen.
 * Usage: <ViewTutorialButton onPress={handleViewTutorial} />
 */
export function ViewTutorialButton({ onPress, style }: ViewTutorialButtonProps) {
  const handlePress = () => {
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <HelpCircle size={20} color={Colors.primary} />
      <Text style={styles.text}>View Tutorial</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  text: {
    fontSize: typography.base,
    fontWeight: fontWeight.medium,
    color: Colors.onSurface,
  },
});
