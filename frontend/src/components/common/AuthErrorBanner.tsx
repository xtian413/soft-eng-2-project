import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing } from '@/theme/typography';

export type BannerVariant = 'error' | 'success' | 'warning' | 'info';

interface AuthErrorBannerProps {
  message: string | null;
  type?: BannerVariant;
  onDismiss?: () => void;
  /** Optional action link (e.g. "Try logging in instead") */
  action?: { label: string; onPress: () => void };
}

const VARIANT_STYLES: Record<BannerVariant, { bg: string; border: string; iconColor: string; textColor: string }> = {
  error: {
    bg: '#fef2f2',
    border: '#fecaca',
    iconColor: Colors.error,
    textColor: Colors.error,
  },
  warning: {
    bg: '#fffbeb',
    border: '#fde68a',
    iconColor: '#d97706',
    textColor: '#92400e',
  },
  success: {
    bg: '#f0fdf4',
    border: '#bbf7d0',
    iconColor: '#16a34a',
    textColor: '#166534',
  },
  info: {
    bg: '#eff6ff',
    border: '#bfdbfe',
    iconColor: Colors.primaryContainer,
    textColor: '#1e40af',
  },
};

const ICONS: Record<BannerVariant, React.ReactNode> = {
  error: <AlertCircle size={16} color={VARIANT_STYLES.error.iconColor} />,
  warning: <AlertTriangle size={16} color={VARIANT_STYLES.warning.iconColor} />,
  success: <CheckCircle size={16} color={VARIANT_STYLES.success.iconColor} />,
  info: <Info size={16} color={VARIANT_STYLES.info.iconColor} />,
};

/** Inline banner for auth screens — replaces Alert.alert for error/success/warning states. */
export function AuthErrorBanner({ message, type = 'error', onDismiss, action }: AuthErrorBannerProps) {
  if (!message) return null;

  const variant = VARIANT_STYLES[type];

  return (
    <View style={[styles.container, { backgroundColor: variant.bg, borderColor: variant.border }]}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>{ICONS[type]}</View>
        <View style={styles.textWrapper}>
          <Text style={[styles.messageText, { color: variant.textColor }]}>{message}</Text>
          {action && (
            <TouchableOpacity onPress={action.onPress} activeOpacity={0.7}>
              <Text style={[styles.actionLink, { color: variant.textColor }]}>{action.label}</Text>
            </TouchableOpacity>
          )}
        </View>
        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.dismissBtn}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          >
            <X size={14} color={variant.textColor} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWrapper: {
    marginTop: 1,
  },
  textWrapper: {
    flex: 1,
    gap: 2,
  },
  messageText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.medium,
    lineHeight: 18,
  },
  actionLink: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  dismissBtn: {
    padding: 4,
    marginTop: -2,
    marginRight: -4,
  },
});
