import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, Sparkles, Trash2, X } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { fontWeight, layout, radius, spacing, typography } from '@/theme/typography';
import type { MealId } from '@/screens/dashboard/types';
import type { ParsedFoodUnit } from '@/ai/foodParser';

export type QuickParserReviewItem = {
  id: string;
  parsedName: string;
  quantity: number;
  unit: ParsedFoodUnit;
  matchedName: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  status: 'ready' | 'unmatched' | 'needs_review';
  message: string;
};

type QuickParserCardProps = {
  value: string;
  mealId: MealId;
  items: QuickParserReviewItem[];
  isParsing: boolean;
  isSaving: boolean;
  error: string | null;
  onChangeText: (value: string) => void;
  onMealChange: (mealId: MealId) => void;
  onParse: () => void;
  onConfirm: () => void;
  onClear: () => void;
  onRemoveItem: (id: string) => void;
};

const MEAL_OPTIONS: Array<{ id: MealId; label: string }> = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
];

export function QuickParserCard({
  value,
  mealId,
  items,
  isParsing,
  isSaving,
  error,
  onChangeText,
  onMealChange,
  onParse,
  onConfirm,
  onClear,
  onRemoveItem,
}: QuickParserCardProps) {
  const readyCount = items.filter((item) => item.status === 'ready').length;
  const canParse = value.trim().length > 0 && !isParsing && !isSaving;
  const canConfirm = readyCount > 0 && !isParsing && !isSaving;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Sparkles size={15} color={Colors.primary} />
          <Text style={styles.title}>Quick Log</Text>
        </View>
        {items.length > 0 && (
          <TouchableOpacity
            style={styles.clearIconButton}
            onPress={onClear}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Clear quick log"
          >
            <X size={16} color={Colors.outline} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder="Example: 200g chicken breast and 2 eggs"
          placeholderTextColor={Colors.outline}
          editable={!isParsing && !isSaving}
          accessibilityLabel="Quick log food description"
        />
        <TouchableOpacity
          style={[styles.parseButton, !canParse && styles.disabledButton]}
          onPress={onParse}
          disabled={!canParse}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Parse quick log"
        >
          {isParsing ? (
            <ActivityIndicator size="small" color={Colors.onPrimary} />
          ) : (
            <Text style={styles.parseButtonText}>Parse</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.mealRow}>
        {MEAL_OPTIONS.map((meal) => {
          const selected = mealId === meal.id;
          return (
            <TouchableOpacity
              key={meal.id}
              style={[styles.mealChip, selected && styles.mealChipActive]}
              onPress={() => onMealChange(meal.id)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.mealChipText, selected && styles.mealChipTextActive]}>{meal.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {items.length > 0 && (
        <View style={styles.reviewList}>
          {items.map((item) => (
            <View key={item.id} style={styles.reviewRow}>
              <View style={styles.reviewTextBlock}>
                <Text style={styles.parsedText} numberOfLines={1}>
                  {item.quantity} {item.unit} {item.parsedName}
                </Text>
                <Text style={item.status === 'ready' ? styles.matchText : styles.reviewMessage} numberOfLines={2}>
                  {item.status === 'ready' && item.matchedName
                    ? `${item.matchedName} · ${item.calories} kcal · P ${item.protein}g C ${item.carbs}g F ${item.fat}g`
                    : item.message}
                </Text>
              </View>
              <View style={styles.reviewActions}>
                {item.status === 'ready' && (
                  <View style={styles.readyBadge}>
                    <Check size={13} color={Colors.primary} />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => onRemoveItem(item.id)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.parsedName}`}
                >
                  <Trash2 size={15} color={Colors.outline} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {items.length > 0 && (
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={onClear}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Clear parsed quick log items"
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmButton, !canConfirm && styles.disabledButton]}
            onPress={onConfirm}
            disabled={!canConfirm}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Confirm quick log foods"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.onPrimary} />
            ) : (
              <Text style={styles.confirmButtonText}>Confirm Add</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.18)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  clearIconButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.2)',
    backgroundColor: Colors.background,
    paddingHorizontal: spacing.md,
    color: Colors.onSurface,
    fontSize: typography.sm,
  },
  parseButton: {
    minHeight: layout.minTouchTarget,
    minWidth: 76,
    borderRadius: radius.md,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  parseButtonText: {
    color: Colors.onPrimary,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
  mealRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.md,
  },
  mealChip: {
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  mealChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  mealChipText: {
    color: Colors.outline,
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
  },
  mealChipTextActive: {
    color: Colors.onPrimary,
  },
  errorText: {
    marginTop: spacing.sm,
    color: Colors.error,
    fontSize: typography.xs,
    lineHeight: 17,
  },
  reviewList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.14)',
    backgroundColor: Colors.surfaceContainerLow,
  },
  reviewTextBlock: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },
  parsedText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  matchText: {
    marginTop: 2,
    fontSize: typography.xs,
    color: Colors.onSurfaceVariant,
  },
  reviewMessage: {
    marginTop: 2,
    fontSize: typography.xs,
    color: Colors.outline,
    lineHeight: 16,
  },
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readyBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  clearButton: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  clearButtonText: {
    color: Colors.onSurfaceVariant,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
  confirmButton: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryContainer,
  },
  confirmButtonText: {
    color: Colors.onPrimary,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
  disabledButton: {
    opacity: 0.55,
  },
});
