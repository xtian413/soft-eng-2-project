import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/theme/colors';
import { useAuthStore } from '@/store/authStore';
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
  heightCm: number;
  weightKg: number;
  targets: MacroTargets;
  onSignOut: () => void;
}

export function ProfileTab({ fullName, email, goal, heightCm, weightKg, targets, onSignOut }: ProfileTabProps) {
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const { updatePhysicalStats } = useAuthStore();
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editHeight, setEditHeight] = useState(String(heightCm));
  const [editWeight, setEditWeight] = useState(String(weightKg));
  const [editGoal, setEditGoal] = useState<GoalKey>(goal);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenEdit = () => {
    setEditHeight(String(heightCm));
    setEditWeight(String(weightKg));
    setEditGoal(goal);
    setEditModalVisible(true);
  };

  const handleSaveStats = async () => {
    const h = parseFloat(editHeight);
    const w = parseFloat(editWeight);
    if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0) {
      Alert.alert('Invalid Input', 'Please enter valid numbers for height and weight.');
      return;
    }
    setIsSaving(true);
    const res = await updatePhysicalStats(h, w, editGoal);
    setIsSaving(false);
    if (res?.message) {
      Alert.alert('Error', res.message);
    } else {
      setEditModalVisible(false);
    }
  };

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

      {/* Physical Stats Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Physical Stats</Text>
          <TouchableOpacity onPress={handleOpenEdit}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Height</Text>
            <Text style={styles.statValue}>{heightCm} cm</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Weight</Text>
            <Text style={styles.statValue}>{weightKg} kg</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Goal</Text>
            <Text style={styles.statValue}>{GOAL_LABELS[goal]}</Text>
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

      {/* Edit Stats Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Physical Stats</Text>
            
            <Text style={styles.inputLabel}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={editHeight}
              onChangeText={setEditHeight}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={editWeight}
              onChangeText={setEditWeight}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Goal</Text>
            <View style={styles.goalRow}>
              {(['lose_weight', 'build_muscle', 'maintain'] as GoalKey[]).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.goalChoice, editGoal === g && styles.goalChoiceActive]}
                  onPress={() => setEditGoal(g)}
                >
                  <Text style={[styles.goalChoiceText, editGoal === g && styles.goalChoiceTextActive]}>
                    {GOAL_LABELS[g]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveStats}
                disabled={isSaving}
              >
                <Text style={styles.modalSaveText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  editBtnText: {
    color: Colors.primary,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(190, 200, 210, 0.05)',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: Colors.outline,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
    color: Colors.onSurface,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.3)',
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.base,
    color: Colors.onSurface,
    backgroundColor: Colors.background,
  },
  goalRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  goalChoice: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.3)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  goalChoiceActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  goalChoiceText: {
    fontSize: typography.xs,
    color: Colors.outline,
    fontWeight: fontWeight.medium,
  },
  goalChoiceTextActive: {
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.3)',
    alignItems: 'center',
  },
  modalCancelText: {
    color: Colors.outline,
    fontWeight: fontWeight.bold,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
  },
  modalSaveText: {
    color: Colors.onPrimary,
    fontWeight: fontWeight.bold,
  },
});
