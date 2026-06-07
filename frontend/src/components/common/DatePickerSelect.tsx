import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing, layout } from '@/theme/typography';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = CURRENT_YEAR - 120;
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - MIN_YEAR + 1 }, (_, i) => CURRENT_YEAR - i);

type PickerSegment = 'month' | 'day' | 'year';

interface DatePickerSelectProps {
  value: string;     // YYYY-MM-DD
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function daysInMonth(month: number, year: number): number {
  // month is 1-indexed
  return new Date(year, month, 0).getDate();
}

function parseDateParts(value: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { month: null, day: null, year: null };
  }
  const [y, m, d] = value.split('-').map(Number);
  return { month: m, day: d, year: y };
}

/** Three-segment month/day/year picker that opens a modal with a scrollable list. */
export function DatePickerSelect({ value, onChange, disabled, label }: DatePickerSelectProps) {
  const { month: initMonth, day: initDay, year: initYear } = useMemo(
    () => parseDateParts(value),
    [value]
  );

  const [selectedMonth, setSelectedMonth] = useState<number | null>(initMonth);
  const [selectedDay, setSelectedDay] = useState<number | null>(initDay);
  const [selectedYear, setSelectedYear] = useState<number | null>(initYear);
  const [activePicker, setActivePicker] = useState<PickerSegment | null>(null);

  // Reset internal state when value prop changes externally (e.g. form reset)
  React.useEffect(() => {
    setSelectedMonth(initMonth);
    setSelectedDay(initDay);
    setSelectedYear(initYear);
  }, [initMonth, initDay, initYear]);

  const commitDate = useCallback(
    (month: number | null, day: number | null, year: number | null) => {
      if (month && day && year) {
        onChange(`${year}-${pad(month)}-${pad(day)}`);
      }
    },
    [onChange]
  );

  const handleSelectMonth = useCallback(
    (m: number) => {
      setSelectedMonth(m);
      // Clamp day if needed (e.g. Feb 30 → Feb 28/29)
      const maxDay = daysInMonth(m, selectedYear ?? CURRENT_YEAR);
      const clampedDay = selectedDay !== null ? Math.min(selectedDay, maxDay) : null;
      if (clampedDay !== selectedDay) {
        setSelectedDay(clampedDay);
      }
      commitDate(m, clampedDay, selectedYear);
      setActivePicker(null);
    },
    [selectedDay, selectedYear, commitDate]
  );

  const handleSelectDay = useCallback(
    (d: number) => {
      setSelectedDay(d);
      commitDate(selectedMonth, d, selectedYear);
      setActivePicker(null);
    },
    [selectedMonth, selectedYear, commitDate]
  );

  const handleSelectYear = useCallback(
    (y: number) => {
      setSelectedYear(y);
      // Clamp day for Feb in leap/non-leap years
      const maxDay = selectedMonth ? daysInMonth(selectedMonth, y) : 31;
      const clampedDay = selectedDay !== null ? Math.min(selectedDay, maxDay) : null;
      if (clampedDay !== selectedDay) {
        setSelectedDay(clampedDay);
      }
      commitDate(selectedMonth, clampedDay, y);
      setActivePicker(null);
    },
    [selectedMonth, selectedDay, commitDate]
  );

  const dayOptions = useMemo(() => {
    const max = selectedMonth && selectedYear
      ? daysInMonth(selectedMonth, selectedYear)
      : 31;
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [selectedMonth, selectedYear]);

  const openPicker = (segment: PickerSegment) => {
    if (disabled) return;
    setActivePicker(segment);
  };

  const segmentValue = (segment: PickerSegment): string => {
    switch (segment) {
      case 'month':
        return selectedMonth ? MONTHS[selectedMonth - 1] : 'Month';
      case 'day':
        return selectedDay ? String(selectedDay) : 'Day';
      case 'year':
        return selectedYear ? String(selectedYear) : 'Year';
    }
  };

  const segmentHasValue = (segment: PickerSegment): boolean => {
    switch (segment) {
      case 'month': return selectedMonth !== null;
      case 'day': return selectedDay !== null;
      case 'year': return selectedYear !== null;
    }
  };

  const renderPickerItems = () => {
    if (!activePicker) return null;

    let data: number[];
    let labelFn: (n: number) => string;
    let handleSelect: (n: number) => void;

    switch (activePicker) {
      case 'month':
        data = Array.from({ length: 12 }, (_, i) => i + 1);
        labelFn = (n) => MONTHS[n - 1];
        handleSelect = handleSelectMonth;
        break;
      case 'day':
        data = dayOptions;
        labelFn = (n) => `${n}`;
        handleSelect = handleSelectDay;
        break;
      case 'year':
        data = YEAR_OPTIONS;
        labelFn = (n) => `${n}`;
        handleSelect = handleSelectYear;
        break;
    }

    return (
      <FlatList
        data={data}
        keyExtractor={(item) => `${item}`}
        renderItem={({ item }) => {
          const isSelected = (() => {
            switch (activePicker) {
              case 'month': return item === selectedMonth;
              case 'day': return item === selectedDay;
              case 'year': return item === selectedYear;
              default: return false;
            }
          })();
          return (
            <TouchableOpacity
              style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
              onPress={() => handleSelect(item)}
              activeOpacity={0.65}
            >
              <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
                {labelFn(item)}
              </Text>
            </TouchableOpacity>
          );
        }}
        style={styles.pickerList}
        showsVerticalScrollIndicator={true}
        initialScrollIndex={Math.max(0, data.indexOf(
          (() => {
            switch (activePicker) {
              case 'month': return selectedMonth ?? 1;
              case 'day': return selectedDay ?? 1;
              case 'year': return selectedYear ?? CURRENT_YEAR;
              default: return 0;
            }
          })()
        ) - 2)}
        getItemLayout={(_data, index) => ({
          length: 48,
          offset: 48 * index,
          index,
        })}
      />
    );
  };

  const pickerTitle = activePicker
    ? activePicker === 'month' ? 'Select Month'
      : activePicker === 'day' ? 'Select Day'
      : 'Select Year'
    : '';

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.segmentsRow}>
        {(['month', 'day', 'year'] as PickerSegment[]).map((segment) => (
          <TouchableOpacity
            key={segment}
            style={[
              styles.segment,
              segmentHasValue(segment) && styles.segmentActive,
              disabled && styles.segmentDisabled,
            ]}
            onPress={() => openPicker(segment)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Select ${segment}`}
            accessibilityState={{ disabled }}
          >
            <Text
              style={[
                styles.segmentText,
                segmentHasValue(segment) && styles.segmentTextActive,
              ]}
              numberOfLines={1}
            >
              {segmentValue(segment)}
            </Text>
            <ChevronDown size={14} color={segmentHasValue(segment) ? Colors.primaryContainer : Colors.outline} />
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={activePicker !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{pickerTitle}</Text>
              <TouchableOpacity
                onPress={() => setActivePicker(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close picker"
              >
                <Text style={styles.modalCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerBody}>{renderPickerItems()}</View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
    color: Colors.onSurface,
    marginBottom: spacing.xs,
  },
  segmentsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.4)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: 4,
  },
  segmentActive: {
    borderColor: Colors.primaryContainer,
    backgroundColor: '#ffffff',
    ...Platform.select({
      web: { boxShadow: '0px 2px 4px rgba(14, 165, 233, 0.06)' },
      default: {
        shadowColor: Colors.primaryContainer,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
  },
  segmentDisabled: {
    opacity: 0.5,
  },
  segmentText: {
    flex: 1,
    fontSize: typography.sm,
    fontWeight: fontWeight.medium,
    color: Colors.outline,
  },
  segmentTextActive: {
    color: Colors.onSurface,
    fontWeight: fontWeight.semiBold,
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
    maxHeight: '55%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.15)',
  },
  modalTitle: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  modalCloseText: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.primaryContainer,
  },
  pickerBody: {
    paddingBottom: spacing.xxl,
  },
  pickerList: {
    maxHeight: 320,
  },
  pickerItem: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(190, 200, 210, 0.12)',
  },
  pickerItemActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  pickerItemText: {
    fontSize: typography.base,
    fontWeight: fontWeight.medium,
    color: Colors.onSurface,
  },
  pickerItemTextActive: {
    color: Colors.primaryContainer,
    fontWeight: fontWeight.bold,
  },
});
