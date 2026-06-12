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
  const [chartWidth, setChartWidth] = React.useState(0);

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
    labelTextStyle: { color: Colors.outline, fontSize: 8 },
  }));

  // Calculate appropriate Y-axis range with a buffer of 2kg
  const weights = entries.map((e) => e.weight_kg);
  const minWeight = weights.length > 0 ? Math.min(...weights) : 60;
  const maxWeight = weights.length > 0 ? Math.max(...weights) : 80;

  let minValue = Math.floor(minWeight - 2);
  let maxValue = Math.ceil(maxWeight + 2);

  // Make sure the range is at least 6 and divisible by 3 (for 3 sections)
  if (maxValue - minValue < 6) {
    const diff = 6 - (maxValue - minValue);
    minValue = Math.max(0, minValue - Math.ceil(diff / 2));
    maxValue = minValue + 6;
  }

  const range = maxValue - minValue;
  const remainder = range % 3;
  if (remainder !== 0) {
    maxValue += (3 - remainder);
  }
  const stepValue = (maxValue - minValue) / 3;

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

      {/* Chart container */}
      <View
        style={styles.chartContainer}
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
      >
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
          chartWidth > 0 && (
            <LineChart
              data={chartData}
              width={chartWidth - 40}
              height={100}
              areaChart
              curved
              color={Colors.primary}
              thickness={2}
              startFillColor="rgba(14,165,233,0.12)"
              endFillColor="rgba(14,165,233,0.01)"
              
              // Y-axis scale configuration
              yAxisOffset={minValue}
              maxValue={maxValue - minValue}
              stepValue={stepValue}
              noOfSections={3}

              // Data points (Nodes) representing weight on specific days
              hideDataPoints={false}
              customDataPoint={() => (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: Colors.primary,
                    borderWidth: 1.5,
                    borderColor: Colors.surfaceContainerLowest,
                  }}
                />
              )}
              dataPointsHeight={8}
              dataPointsWidth={8}

              // Y-axis styling
              hideYAxisText={false}
              yAxisColor="transparent"
              yAxisTextStyle={{ color: Colors.outline, fontSize: 8 }}
              yAxisLabelContainerStyle={{ width: 25, marginRight: -10 }}
              yAxisLabelWidth={25}

              // X-axis and spacing
              xAxisColor="transparent"
              initialSpacing={15}
              endSpacing={15}
              adjustToWidth={true}

              // Rules/Grid lines
              rulesColor="rgba(190,200,210,0.12)"
              rulesType="dashed"

              // Interactive tooltip on hover/press
              pointerConfig={{
                pointerStripUptoDataPoint: true,
                pointerStripColor: 'rgba(14,165,233,0.2)',
                pointerStripWidth: 1.5,
                pointerColor: Colors.primary,
                radius: 4,
                pointerLabelWidth: 80,
                pointerLabelHeight: 30,
                activatePointersOnLongPress: false,
                autoAdjustPointerLabelPosition: true,
                pointerLabelComponent: (items: any) => {
                  if (!items || items.length === 0) return null;
                  return (
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        backgroundColor: Colors.surfaceContainerLowest,
                        borderRadius: 4,
                        borderWidth: 1,
                        borderColor: Colors.primary,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: Colors.onSurface,
                          fontSize: 9,
                          fontWeight: 'bold',
                        }}
                      >
                        {items[0].value} kg
                      </Text>
                    </View>
                  );
                },
              }}
            />
          )
        )}
      </View>
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
  chartContainer: {
    width: '100%',
    height: 110,
    justifyContent: 'center',
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
