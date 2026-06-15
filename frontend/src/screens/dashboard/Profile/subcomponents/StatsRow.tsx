import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { Dumbbell, Flame, ChevronDown, ChevronUp, Check } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { useWeightUnitStore } from '@/store/weightUnitStore';
import { typography, fontWeight, radius, spacing } from '@/theme/typography';

interface StatsRowProps {
  setsToday: number;
  setsWeek: number;
  setsMonth: number;
  setsAllTime: number;
  weekStreak: number;
  loading: boolean;
  onToggleDetails?: () => void;
  showDetails?: boolean;
}

const OPTIONS = [
  { value: 'today', label: 'Today', cardLabel: "TODAY'S SETS" },
  { value: 'week', label: 'This Week', cardLabel: 'WEEKLY SETS' },
  { value: 'month', label: 'This Month', cardLabel: 'MONTHLY SETS' },
  { value: 'all', label: 'All Time', cardLabel: 'TOTAL SETS' },
] as const;

type FilterType = typeof OPTIONS[number]['value'];

function formatVolume(value: number): string {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Renders Total Sets (with period selector & unit toggle) and Streak side by side */
export function StatsRow({
  setsToday,
  setsWeek,
  setsMonth,
  setsAllTime,
  weekStreak,
  loading,
  onToggleDetails,
  showDetails,
}: StatsRowProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('week');
  const [showDropdown, setShowDropdown] = useState(false);
  const { isLbs, setIsLbs: changeUnit } = useWeightUnitStore();

  const activeOption = OPTIONS.find((o) => o.value === selectedFilter) || OPTIONS[1];

  const getSetsValue = () => {
    switch (selectedFilter) {
      case 'today':
        return setsToday;
      case 'week':
        return setsWeek;
      case 'month':
        return setsMonth;
      case 'all':
        return setsAllTime;
    }
  };

  const rawSets = getSetsValue();
  const formattedSets = formatVolume(rawSets);
  const suffix = rawSets === 1 ? 'set' : 'sets';

  return (
    <View style={styles.row}>
      {/* Total Sets Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(14,165,233,0.1)' }]}>
            <Dumbbell size={18} color={Colors.primary} />
          </View>
          
          {/* Dropdown Filter Pill */}
          <TouchableOpacity
            style={styles.filterPill}
            onPress={() => setShowDropdown(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.filterText}>{activeOption.label}</Text>
            <ChevronDown size={11} color={Colors.outline} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.valueRow}>
            <Text style={styles.value}>{formattedSets}</Text>
            <Text style={styles.unitSuffix}> {suffix}</Text>
          </View>
        )}
        <View style={styles.cardFooter}>
          <Text style={styles.label}>{activeOption.cardLabel}</Text>
          {onToggleDetails && (
            <TouchableOpacity
              style={styles.detailsToggle}
              onPress={onToggleDetails}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={showDetails ? 'Hide muscle breakdown' : 'Show muscle breakdown'}
              accessibilityState={{ expanded: showDetails }}
            >
              <Text style={styles.detailsToggleText}>
                {showDetails ? 'Hide' : 'Muscles'}
              </Text>
              {showDetails ? (
                <ChevronUp size={12} color={Colors.primary} />
              ) : (
                <ChevronDown size={12} color={Colors.primary} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Streak Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(157,67,0,0.1)' }]}>
            <Flame size={18} color={Colors.secondaryContainer} />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.secondaryContainer} style={styles.loader} />
        ) : (
          <Text style={styles.value}>{weekStreak}</Text>
        )}
        <Text style={styles.label}>STREAK</Text>
      </View>

      {/* Dropdown Modal Selector */}
      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>Select Period</Text>
            {OPTIONS.map((opt) => {
              const isSelected = opt.value === selectedFilter;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.menuItem, isSelected && styles.menuItemActive]}
                  onPress={() => {
                    setSelectedFilter(opt.value);
                    setShowDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.menuItemText, isSelected && styles.menuItemTextActive]}>
                    {opt.label}
                  </Text>
                  {isSelected && <Check size={14} color={Colors.primary} />}
                </TouchableOpacity>
              );
            })}

            <View style={styles.menuDivider} />

            <Text style={styles.menuTitle}>Weight Unit</Text>
            <View style={styles.unitToggleRow}>
              <TouchableOpacity
                style={[styles.unitButton, !isLbs && styles.unitButtonActive]}
                onPress={() => changeUnit(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.unitButtonText, !isLbs && styles.unitButtonTextActive]}>KG</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitButton, isLbs && styles.unitButtonActive]}
                onPress={() => changeUnit(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.unitButtonText, isLbs && styles.unitButtonTextActive]}>LBS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190,200,210,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(190,200,210,0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(190,200,210,0.15)',
    gap: 4,
  },
  filterText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 0.5,
  },
  loader: {
    marginVertical: spacing.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  value: {
    fontSize: typography.xxxl,
    fontWeight: fontWeight.extraBold,
    color: Colors.onSurface,
    lineHeight: typography.xxxl * 1.1,
  },
  unitSuffix: {
    fontSize: typography.sm,
    color: Colors.outline,
    fontWeight: fontWeight.medium,
    marginBottom: 4,
    marginLeft: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  detailsToggleText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.primary,
  },
  label: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: 240,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(190,200,210,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  menuTitle: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  menuItemActive: {
    backgroundColor: 'rgba(14,165,233,0.06)',
  },
  menuItemText: {
    fontSize: typography.sm,
    color: Colors.onSurface,
    fontWeight: fontWeight.medium,
  },
  menuItemTextActive: {
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(190,200,210,0.15)',
    marginVertical: spacing.md,
  },
  unitToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(190,200,210,0.1)',
    borderRadius: radius.md,
    padding: 2,
    marginTop: spacing.xs,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  unitButtonActive: {
    backgroundColor: Colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  unitButtonText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
  },
  unitButtonTextActive: {
    color: Colors.primary,
  },
});
