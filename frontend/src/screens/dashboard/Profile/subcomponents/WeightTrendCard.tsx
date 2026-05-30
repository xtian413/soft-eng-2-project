import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing } from '@/theme/typography';
import type { ProgressEntry } from '@/api/progressApi';
import { format, parseISO } from 'date-fns';

interface WeightTrendCardProps {
  entries: ProgressEntry[];
  loading: boolean;
}

/** Renders the Weight Trend card with a line chart */
export function WeightTrendCard({ entries, loading }: WeightTrendCardProps) {
  const latest = entries.length > 0 ? entries[entries.length - 1] : null;
  const earliest = entries.length > 0 ? entries[0] : null;

  const deltaNum =
    latest && earliest
      ? parseFloat((latest.weight_kg - earliest.weight_kg).toFixed(1))
      : null;

  const chartData = entries.map((e, i) => ({
    value: e.weight_kg,
    label:
      i === 0 || i === entries.length - 1 || i === Math.floor(entries.length / 2)
        ? format(parseISO(e.recorded_at), 'MMM d')
        : '',
    labelTextStyle: { color: Colors.outline, fontSize: 10 },
  }));

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Weight Trend</Text>
          <Text style={styles.subtitle}>Past 30 Days</Text>
        </View>
        {latest && (
          <View style={styles.headerRight}>
            <Text style={styles.currentWeight}>{latest.weight_kg} kg</Text>
            {deltaNum !== null && (
              <View
                style={[
                  styles.deltaBadge,
                  {
                    backgroundColor:
                      deltaNum >= 0
                        ? 'rgba(34,197,94,0.12)'
                        : 'rgba(239,68,68,0.12)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.deltaText,
                    { color: deltaNum >= 0 ? '#22c55e' : '#ef4444' },
                  ]}
                >
                  {deltaNum >= 0 ? '↑ +' : '↓ '}
                  {deltaNum} kg
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Chart */}
      {loading ? (
        <ActivityIndicator
          color={Colors.primary}
          style={{ height: 110, justifyContent: 'center' }}
        />
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No weight entries yet. Log your weight to see the trend.
          </Text>
        </View>
      ) : (
        <LineChart
          data={chartData}
          height={100}
          areaChart
          curved
          color={Colors.primary}
          thickness={2.5}
          startFillColor="rgba(14,165,233,0.15)"
          endFillColor="rgba(14,165,233,0.01)"
          hideDataPoints={false}
          dataPointsColor={Colors.surfaceContainerLowest}
          dataPointsRadius={4}
          hideYAxisText
          hideAxesAndRules
          initialSpacing={0}
          endSpacing={0}
          rulesColor="transparent"
          yAxisColor="transparent"
          xAxisColor="transparent"
          noOfSections={3}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(190,200,210,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  subtitle: {
    fontSize: typography.xs,
    color: Colors.outline,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  currentWeight: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  deltaBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  deltaText: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
  },
  empty: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  emptyText: {
    fontSize: typography.sm,
    color: Colors.outline,
    textAlign: 'center',
  },
});
