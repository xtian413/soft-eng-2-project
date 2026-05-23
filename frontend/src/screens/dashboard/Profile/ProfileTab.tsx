import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing } from '@/theme/typography';
import type { GoalKey, MacroTargets } from '@/screens/dashboard/types';
import { Dumbbell, TrendingDown, Activity, ShieldCheck, LogOut, Lock } from 'lucide-react-native';

const GOAL_LABELS: Record<GoalKey, string> = {
  build_muscle: 'Build Muscle',
  lose_weight: 'Lose Weight',
  maintain: 'Maintain',
};

interface ProfileTabProps {
  fullName: string;
  email: string;
  goal: GoalKey;
  targets: MacroTargets;
  onSignOut: () => void;
}

export function ProfileTab({ fullName, email, goal, targets, onSignOut }: ProfileTabProps) {
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: onSignOut },
    ]);
  };

  const renderGoalIcon = (goalKey: GoalKey) => {
    switch (goalKey) {
      case 'build_muscle':
        return <Dumbbell size={14} color={Colors.primaryContainer} style={styles.badgeIcon} />;
      case 'lose_weight':
        return <TrendingDown size={14} color={Colors.primaryContainer} style={styles.badgeIcon} />;
      default:
        return <Activity size={14} color={Colors.primaryContainer} style={styles.badgeIcon} />;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar & Name */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{fullName}</Text>
        <Text style={styles.userEmail}>{email}</Text>
        <View style={styles.goalBadge}>
          <View style={styles.goalBadgeContent}>
            {renderGoalIcon(goal)}
            <Text style={styles.goalBadgeText}>{GOAL_LABELS[goal]}</Text>
          </View>
        </View>
      </View>

      {/* Daily Targets Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Targets</Text>
        <View style={styles.targetsGrid}>
          <TargetItem label="Calories" value={String(targets.calories)} unit="kcal" color={Colors.primary} />
          <TargetItem label="Protein" value={String(targets.protein)} unit="g" color={Colors.proteinAccent} />
          <TargetItem label="Carbs" value={String(targets.carbs)} unit="g" color={Colors.tertiaryFixedDim} />
          <TargetItem label="Fats" value={String(targets.fats)} unit="g" color={Colors.secondaryContainer} />
        </View>
      </View>

      {/* App Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>About Gemi</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>AI Model</Text>
          <Text style={styles.infoValue}>On-device (local)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Privacy</Text>
          <View style={styles.infoValueRow}>
            <Lock size={12} color={Colors.outline} style={{ marginRight: 4 }} />
            <Text style={styles.infoValue}>Data stays on device</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
      </View>

      {/* Privacy & AI Notice */}
      <View style={styles.aiNotice}>
        <ShieldCheck size={20} color={Colors.primary} style={styles.aiNoticeIcon} />
        <Text style={styles.aiNoticeText}>
          Gemi uses an on-device AI model. Your workout data, diet logs, and chat messages never leave your phone.
        </Text>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
        <View style={styles.signOutBtnContent}>
          <LogOut size={16} color={Colors.error} style={{ marginRight: 6 }} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

function TargetItem({ label, value, unit, color }: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <View style={styles.targetItem}>
      <Text style={[styles.targetValue, { color }]}>{value}</Text>
      <Text style={styles.targetUnit}>{unit}</Text>
      <Text style={styles.targetLabel}>{label}</Text>
    </View>
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
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: Colors.onPrimary,
    fontSize: typography.xxl,
    fontWeight: fontWeight.bold,
  },
  userName: {
    fontSize: typography.xl,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: typography.sm,
    color: Colors.outline,
    marginBottom: spacing.md,
  },
  goalBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
  },
  goalBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIcon: {
    marginRight: 6,
  },
  goalBadgeText: {
    color: Colors.primaryContainer,
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
  cardTitle: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  targetsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  targetItem: {
    alignItems: 'center',
    flex: 1,
  },
  targetValue: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
  },
  targetUnit: {
    fontSize: 10,
    color: Colors.outline,
    marginTop: 1,
  },
  targetLabel: {
    fontSize: 10,
    color: Colors.outline,
    marginTop: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.08)',
  },
  infoLabel: {
    fontSize: typography.sm,
    color: Colors.outline,
  },
  infoValue: {
    fontSize: typography.sm,
    color: Colors.onSurface,
    fontWeight: fontWeight.medium,
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiNotice: {
    flexDirection: 'row',
    backgroundColor: '#eff4ff',
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.12)',
  },
  aiNoticeIcon: {
    marginTop: 2,
  },
  aiNoticeText: {
    flex: 1,
    fontSize: typography.sm,
    color: Colors.primary,
    lineHeight: 20,
  },
  signOutBtn: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.error,
    marginBottom: spacing.md,
  },
  signOutBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: Colors.error,
    fontSize: typography.base,
    fontWeight: fontWeight.semiBold,
  },
});
