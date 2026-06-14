import React, { useState } from 'react';
import {
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { fontWeight, radius, spacing, typography } from '@/theme/typography';
import { useDateHistory } from '../hooks/useDateHistory';
import { FoodHistoryView } from './FoodHistoryView';
import { LiftHistoryView } from './LiftHistoryView';
import { LoggedItemDetailsModal } from '@/screens/dashboard/Food/LoggedItemDetailsModal';
import type { FoodLogEntry, MacroTargets } from '@/screens/dashboard/types';

type DetailTab = 'food' | 'lift';

interface DateDetailSheetProps {
  visible: boolean;
  date: string;
  userId: string | null;
  targets: MacroTargets;
  onClose: () => void;
}

const DEFAULT_VISIBLE_MICROS = ['fiber', 'sodium', 'potassium', 'calcium', 'iron', 'vitaminC'];

/** Full-screen modal showing rich food or lift history for a selected date. */
export function DateDetailSheet({
  visible,
  date,
  userId,
  targets,
  onClose,
}: DateDetailSheetProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('food');
  const [viewingItem, setViewingItem] = useState<FoodLogEntry | null>(null);

  const { foodLogs, dailyLog, workouts, loading, error } = useDateHistory(userId, date);

  const formattedDate = (() => {
    try {
      const [y, m, d] = date.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return date;
    }
  })();

  const handleClose = () => {
    setViewingItem(null);
    onClose();
  };

  const noopAsyncSave = async (_entry: FoodLogEntry) => {};
  const noopDelete = (_id: string) => {};

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerDate} numberOfLines={1}>
                {formattedDate}
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={8}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close detail view"
              >
                <X size={20} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Tab toggle */}
            <View style={styles.tabToggle}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'food' && styles.tabButtonActive]}
                onPress={() => setActiveTab('food')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="View food intake history"
                accessibilityState={{ selected: activeTab === 'food' }}
              >
                <Text
                  style={[styles.tabButtonText, activeTab === 'food' && styles.tabButtonTextActive]}
                >
                  Food Intake
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'lift' && styles.tabButtonActive]}
                onPress={() => setActiveTab('lift')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="View lift history"
                accessibilityState={{ selected: activeTab === 'lift' }}
              >
                <Text
                  style={[styles.tabButtonText, activeTab === 'lift' && styles.tabButtonTextActive]}
                >
                  Lift History
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            {activeTab === 'food' ? (
              <FoodHistoryView
                foodLogs={foodLogs}
                targets={targets}
                dailyLog={dailyLog}
                loading={loading}
                error={error}
                onItemPress={(entry) => setViewingItem(entry)}
                visibleMicros={DEFAULT_VISIBLE_MICROS}
              />
            ) : (
              <LiftHistoryView
                workouts={workouts}
                loading={loading}
                error={error}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Read-only logged item detail modal */}
      <LoggedItemDetailsModal
        isOpen={viewingItem !== null}
        onClose={() => setViewingItem(null)}
        viewingLoggedItem={viewingItem}
        targets={targets}
        onSaveChanges={noopAsyncSave}
        onDeleteEntry={noopDelete}
        isSaving={false}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.15)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerDate: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    flex: 1,
    paddingRight: spacing.md,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(190, 200, 210, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(190, 200, 210, 0.1)',
    borderRadius: radius.md,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  tabButtonActive: {
    backgroundColor: Colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
    color: Colors.outline,
  },
  tabButtonTextActive: {
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  contentContainer: {
    flex: 1,
    padding: spacing.base,
  },
});
