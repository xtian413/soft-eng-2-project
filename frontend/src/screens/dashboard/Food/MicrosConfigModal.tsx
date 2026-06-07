import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/theme/colors';
import { fontWeight, radius, spacing, typography } from '@/theme/typography';

export const ALL_MICROS = [
  { key: 'fiber', name: 'Fiber', target: 30, unit: 'g', color: '#10b981', desc: 'Aids digestion and satiety' },
  { key: 'sodium', name: 'Sodium', target: 2300, unit: 'mg', color: '#f59e0b', desc: 'Regulates water and muscles' },
  { key: 'potassium', name: 'Potassium', target: 3500, unit: 'mg', color: '#0ea5e9', desc: 'Supports muscles and hydration' },
  { key: 'calcium', name: 'Calcium', target: 1000, unit: 'mg', color: '#6366f1', desc: 'Supports bone strength' },
  { key: 'iron', name: 'Iron', target: 18, unit: 'mg', color: '#ef4444', desc: 'Supports oxygen transport' },
  { key: 'vitaminC', name: 'Vitamin C', target: 90, unit: 'mg', color: '#fbbf24', desc: 'Supports immune function' },
  { key: 'folate', name: 'Folate', target: 400, unit: 'mcg', color: '#ec4899', desc: 'Supports cell division' },
];

interface MicrosConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibleMicros: string[];
  setVisibleMicros: React.Dispatch<React.SetStateAction<string[]>>;
  triggerToast: (msg: string) => void;
}

export function MicrosConfigModal({
  isOpen,
  onClose,
  visibleMicros,
  setVisibleMicros,
  triggerToast,
}: MicrosConfigModalProps) {
  const toggleMicro = (key: string) => {
    setVisibleMicros((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) {
          triggerToast('Keep at least one nutrient visible!');
          return prev;
        }
        return prev.filter((item) => item !== key);
      }

      if (prev.length >= 6) {
        triggerToast('Maximum of 6 nutrients reached!');
        return prev;
      }

      return [...prev, key];
    });
  };

  return (
    <Modal visible={isOpen} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Customize Micronutrients</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} accessibilityRole="button">
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Select up to 6 micronutrients to display.</Text>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {ALL_MICROS.map((micro) => {
              const selected = visibleMicros.includes(micro.key);

              return (
                <TouchableOpacity
                  key={micro.key}
                  style={styles.itemRow}
                  onPress={() => toggleMicro(micro.key)}
                  activeOpacity={0.75}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                >
                  <View style={styles.checkbox}>
                    {selected && <View style={[styles.checkboxFill, { backgroundColor: micro.color }]} />}
                  </View>
                  <View style={styles.itemTextWrap}>
                    <Text style={styles.itemName}>{micro.name}</Text>
                    <Text style={styles.itemDesc}>{micro.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    color: Colors.onSurface,
    fontSize: typography.md,
    fontWeight: fontWeight.bold,
  },
  doneText: {
    color: Colors.primary,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    color: Colors.outline,
    fontSize: typography.xs,
    marginBottom: spacing.base,
  },
  list: {
    maxHeight: 350,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.08)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: Colors.outline,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxFill: {
    width: 10,
    height: 10,
    borderRadius: radius.xs,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemName: {
    color: Colors.onSurface,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
  itemDesc: {
    color: Colors.outline,
    fontSize: 10,
    marginTop: 2,
  },
});
