import React, { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Apple, EggFried, Plus, Soup, Trash2, Utensils } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { fontWeight, radius, spacing, typography } from '@/theme/typography';
import type { FoodLogEntry, MealId } from '@/screens/dashboard/types';

interface MealDiarySectionProps {
  foodLogs: FoodLogEntry[];
  onOpenSearch: (mealId: MealId) => void;
  onItemPress: (entry: FoodLogEntry) => void;
  onDeleteEntry: (id: string) => void;
  readOnly?: boolean;
}

const mealDefs: { id: MealId; name: string }[] = [
  { id: 'breakfast', name: 'Breakfast' },
  { id: 'lunch', name: 'Lunch' },
  { id: 'dinner', name: 'Dinner' },
  { id: 'snack', name: 'Snacks & Extras' },
];

function getSyncStatus(entry: FoodLogEntry) {
  return entry.syncStatus ?? 'pending';
}

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
}

function SwipeableRow({ children, onDelete }: SwipeableRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpened = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderGrant: () => {
        translateX.setOffset(isOpened.current ? -70 : 0);
      },
      onPanResponderMove: (_, gestureState) => {
        let dragAmount = gestureState.dx;
        if (isOpened.current) {
          dragAmount = -70 + gestureState.dx;
        }
        translateX.setValue(Math.min(10, Math.max(-110, dragAmount)));
      },
      onPanResponderRelease: (_, gestureState) => {
        translateX.flattenOffset();
        const currentTranslation = (translateX as unknown as { _value: number })._value;

        if (gestureState.dx < -20 || (currentTranslation < -35 && gestureState.dx <= 15)) {
          isOpened.current = true;
          Animated.spring(translateX, {
            toValue: -70,
            useNativeDriver: true,
            friction: 7,
            tension: 55,
          }).start();
        } else {
          isOpened.current = false;
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 7,
            tension: 55,
          }).start();
        }
      },
    })
  ).current;

  const closeRow = () => {
    isOpened.current = false;
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 7,
      tension: 50,
    }).start();
  };

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.deleteBackground}>
        <TouchableOpacity
          style={styles.swipeDeleteButton}
          onPress={() => {
            closeRow();
            onDelete();
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Delete food entry"
        >
          <Trash2 size={16} color="#ffffff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.swipeContent, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

export function MealDiarySection({ foodLogs, onOpenSearch, onItemPress, onDeleteEntry, readOnly = false }: MealDiarySectionProps) {
  const renderMealIcon = (mealId: MealId) => {
    switch (mealId) {
      case 'breakfast':
        return <EggFried size={18} color={Colors.primary} />;
      case 'lunch':
        return <Utensils size={18} color={Colors.primary} />;
      case 'dinner':
        return <Soup size={18} color={Colors.primary} />;
      default:
        return <Apple size={18} color={Colors.primary} />;
    }
  };

  return (
    <>
      {mealDefs.map((meal) => {
        const logged = foodLogs.filter((item) => item.mealId === meal.id);
        const mealCals = Math.round(logged.reduce((sum, item) => sum + item.calories, 0));

        return (
          <View key={meal.id} style={styles.mealSectionCard}>
            <View style={styles.mealSectionHeader}>
              <View style={styles.mealHeaderTitleGroup}>
                <View style={styles.mealIconWrapper}>{renderMealIcon(meal.id)}</View>
                <View>
                  <Text style={styles.mealSectionName}>{meal.name}</Text>
                  <Text style={styles.mealSectionSubtext}>
                    {logged.length} items · {mealCals} kcal logged
                  </Text>
                </View>
              </View>
              {!readOnly && (
                <TouchableOpacity
                  style={styles.mealAddCircleBtn}
                  onPress={() => onOpenSearch(meal.id)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Add food to ${meal.name}`}
                  hitSlop={8}
                >
                  <Plus size={14} color={Colors.primaryContainer} strokeWidth={3} />
                </TouchableOpacity>
              )}
            </View>

            {logged.length > 0 && (
              <View style={styles.loggedRowsList}>
                {logged.map((entry) => {
                  const rowContent = (
                    <TouchableOpacity
                      style={styles.loggedRow}
                      onPress={() => onItemPress(entry)}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={`View details for ${entry.name}`}
                    >
                      <View style={styles.loggedRowBody}>
                        <View style={styles.loggedRowNameLine}>
                          <Text style={styles.loggedRowName} numberOfLines={1}>
                            {entry.name}
                          </Text>
                          <Text style={[styles.syncStatusPill, styles[`syncStatus_${getSyncStatus(entry)}`]]}>
                            {getSyncStatus(entry)}
                          </Text>
                        </View>
                        <Text style={styles.loggedRowMacros} numberOfLines={2}>
                          {entry.servingSize} {entry.servingUnit} · {entry.protein}P · {entry.carbs}C · {entry.fat}F
                        </Text>
                      </View>
                      <View style={styles.loggedRowCaloriesContainer}>
                        <Text style={styles.loggedRowCaloriesNumber}>{entry.calories}</Text>
                        <Text style={styles.loggedRowCaloriesLabel}>kcal</Text>
                      </View>
                    </TouchableOpacity>
                  );

                  return readOnly ? (
                    <View key={entry.id}>{rowContent}</View>
                  ) : (
                    <SwipeableRow key={entry.id} onDelete={() => onDeleteEntry(entry.id)}>
                      {rowContent}
                    </SwipeableRow>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  mealSectionCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
  mealSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    paddingRight: spacing.sm,
  },
  mealIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 101, 145, 0.08)',
  },
  mealSectionName: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  mealSectionSubtext: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginTop: 1,
  },
  mealAddCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loggedRowsList: {
    marginTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: 'rgba(190, 200, 210, 0.15)',
    paddingTop: spacing.xs,
  },
  loggedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  loggedRowBody: {
    flex: 1,
    paddingRight: spacing.base,
  },
  loggedRowNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loggedRowName: {
    flexShrink: 1,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  syncStatusPill: {
    overflow: 'hidden',
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 9,
    fontWeight: fontWeight.bold,
    textTransform: 'lowercase',
  },
  syncStatus_synced: {
    color: Colors.outline,
    backgroundColor: 'rgba(110, 120, 129, 0.08)',
  },
  syncStatus_pending: {
    color: Colors.primary,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  syncStatus_failed: {
    color: Colors.error,
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
  },
  loggedRowMacros: {
    fontSize: 10,
    color: Colors.outline,
    marginTop: 2,
  },
  loggedRowCaloriesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  loggedRowCaloriesNumber: {
    fontSize: typography.sm + 1,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  loggedRowCaloriesLabel: {
    fontSize: 8,
    fontWeight: fontWeight.medium,
    color: Colors.outline,
    textAlign: 'center',
    marginTop: -2,
  },
  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.08)',
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 70,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
  },
  swipeDeleteButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeContent: {
    backgroundColor: Colors.surfaceContainerLowest,
  },
});
