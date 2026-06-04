import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bed, Edit2, Info, Moon, Sun, X } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { fontWeight, radius, spacing, typography } from '@/theme/typography';

interface SleepRecoveryCardProps {
  bedtime: string;
  setBedtime: (val: string) => void;
  waketime: string;
  setWaketime: (val: string) => void;
  triggerToast: (msg: string) => void;
}

export function SleepRecoveryCard({ bedtime, setBedtime, waketime, setWaketime, triggerToast }: SleepRecoveryCardProps) {
  const [activeTimePicker, setActiveTimePicker] = useState<'bed' | 'wake' | null>(null);
  const [pickerHour, setPickerHour] = useState(12);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerPeriod, setPickerPeriod] = useState<'AM' | 'PM'>('PM');

  const sleepHours = useMemo(() => {
    try {
      const [bh, bm] = bedtime.split(':').map(Number);
      const [wh, wm] = waketime.split(':').map(Number);
      let diffMins = wh * 60 + wm - (bh * 60 + bm);
      if (diffMins < 0) diffMins += 24 * 60;
      return Number((diffMins / 60).toFixed(1));
    } catch {
      return 8.0;
    }
  }, [bedtime, waketime]);

  const sleepMetrics = useMemo(() => {
    let sleepQuality = 'Optimal';
    let sleepQualityColor = '#10b981';
    if (sleepHours < 6) {
      sleepQuality = 'Poor';
      sleepQualityColor = Colors.error;
    } else if (sleepHours < 7.5) {
      sleepQuality = 'Fair';
      sleepQualityColor = '#f59e0b';
    }

    const cycles = Number((sleepHours / 1.5).toFixed(1));
    let cyclesFeedback = 'Ideal REM Recovery';
    if (cycles < 4) cyclesFeedback = 'Insufficient sleep phases';
    else if (cycles < 5) cyclesFeedback = 'Partial REM recovery';
    else if (cycles > 6.5) cyclesFeedback = 'Deep extended rest';

    return { sleepQuality, sleepQualityColor, cycles, cyclesFeedback };
  }, [sleepHours]);

  const formatTo12Hour = (time24: string) => {
    try {
      const [hourText, minuteText] = time24.split(':');
      const hour = Number(hourText);
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;
      return `${String(hour12).padStart(2, '0')}:${minuteText} ${period}`;
    } catch {
      return time24;
    }
  };

  const openTimePicker = (type: 'bed' | 'wake') => {
    const timeVal = type === 'bed' ? bedtime : waketime;
    const [hour24, minute] = timeVal.split(':').map(Number);
    const period = hour24 >= 12 ? 'PM' : 'AM';
    setPickerHour(hour24 % 12 === 0 ? 12 : hour24 % 12);
    setPickerMinute(minute || 0);
    setPickerPeriod(period);
    setActiveTimePicker(type);
  };

  const savePickerTime = () => {
    if (!activeTimePicker) return;

    let hour24 = pickerHour;
    if (pickerPeriod === 'PM' && hour24 !== 12) hour24 += 12;
    if (pickerPeriod === 'AM' && hour24 === 12) hour24 = 0;

    const formatted = `${String(hour24).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')}`;
    if (activeTimePicker === 'bed') {
      setBedtime(formatted);
      triggerToast('Bedtime updated successfully!');
    } else {
      setWaketime(formatted);
      triggerToast('Wakeup time updated successfully!');
    }
    setActiveTimePicker(null);
  };

  const adjustTime = (type: 'bed' | 'wake', amountMinutes: number) => {
    const timeStr = type === 'bed' ? bedtime : waketime;
    const [hour, minute] = timeStr.split(':').map(Number);
    let totalMins = hour * 60 + minute + amountMinutes;
    if (totalMins < 0) totalMins += 24 * 60;
    totalMins %= 24 * 60;
    const formatted = `${String(Math.floor(totalMins / 60)).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`;
    if (type === 'bed') setBedtime(formatted);
    else setWaketime(formatted);
  };

  return (
    <View style={styles.sleepCard}>
      <View style={styles.sleepHeader}>
        <View style={styles.cardTitleRow}>
          <View style={styles.sleepIconWrapper}>
            <Bed size={16} color="#8b5cf6" />
          </View>
          <Text style={styles.sleepCardTitle}>SLEEP RECOVERY</Text>
        </View>
        <View style={styles.sleepScoreWrap}>
          <Text style={[styles.sleepHoursText, { color: sleepMetrics.sleepQualityColor }]}>{sleepHours} hrs</Text>
          <Text style={styles.sleepCycleCountText}>{sleepMetrics.cycles} Cycles</Text>
        </View>
      </View>

      <Text style={styles.sleepSubtext}>
        {sleepMetrics.cyclesFeedback} · Target: 8.0 hrs
      </Text>

      <View style={styles.sleepSteppersContainer}>
        <View style={styles.sleepStepperCol}>
          <Text style={styles.sleepStepperLabel}>Bedtime</Text>
          <TouchableOpacity style={styles.sleepTimeDisplayRowPressable} onPress={() => openTimePicker('bed')} activeOpacity={0.75}>
            <Text style={styles.sleepTimeDisplayText}>{formatTo12Hour(bedtime)}</Text>
            <Edit2 size={14} color="#8b5cf6" style={styles.sleepTimeEditIcon} />
          </TouchableOpacity>
          <View style={styles.stepperActionRow}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustTime('bed', -30)} activeOpacity={0.75}>
              <Text style={styles.stepperBtnText}>-30m</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustTime('bed', 30)} activeOpacity={0.75}>
              <Text style={styles.stepperBtnText}>+30m</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sleepStepperCol}>
          <Text style={styles.sleepStepperLabel}>Wakeup</Text>
          <TouchableOpacity style={styles.sleepTimeDisplayRowPressable} onPress={() => openTimePicker('wake')} activeOpacity={0.75}>
            <Text style={styles.sleepTimeDisplayText}>{formatTo12Hour(waketime)}</Text>
            <Edit2 size={14} color="#8b5cf6" style={styles.sleepTimeEditIcon} />
          </TouchableOpacity>
          <View style={styles.stepperActionRow}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustTime('wake', -30)} activeOpacity={0.75}>
              <Text style={styles.stepperBtnText}>-30m</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustTime('wake', 30)} activeOpacity={0.75}>
              <Text style={styles.stepperBtnText}>+30m</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.sleepBarRow}>
        <View style={styles.sleepProgressBg}>
          <View
            style={[
              styles.sleepProgressFill,
              { width: `${Math.min(100, (sleepHours / 9) * 100)}%`, backgroundColor: sleepMetrics.sleepQualityColor },
            ]}
          />
        </View>
        <Text style={styles.sleepGoalLabelText}>{Math.round((sleepHours / 8) * 100)}% of Goal</Text>
      </View>

      {sleepHours < 6 && (
        <View style={styles.sleepWarningRow}>
          <Info size={14} color={Colors.error} style={styles.warningIcon} />
          <Text style={styles.sleepWarningText}>Sleep is under 6h. Recovery may be impaired today.</Text>
        </View>
      )}

      <Modal visible={activeTimePicker !== null} animationType="fade" transparent onRequestClose={() => setActiveTimePicker(null)}>
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <View style={styles.pickerTitleRow}>
                <View style={styles.pickerIconWrap}>
                  {activeTimePicker === 'bed' ? <Moon size={14} color="#8b5cf6" /> : <Sun size={14} color="#fbbf24" />}
                </View>
                <Text style={styles.pickerTitle}>Set {activeTimePicker === 'bed' ? 'Bedtime' : 'Wakeup Time'}</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveTimePicker(null)} activeOpacity={0.75} hitSlop={8}>
                <X size={18} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <Text style={styles.pickerTimePreviewText}>
              {String(pickerHour).padStart(2, '0')}:{String(pickerMinute).padStart(2, '0')} {pickerPeriod}
            </Text>

            <View style={styles.pickerColumnsContainer}>
              <View style={styles.pickerColumnCol}>
                <Text style={styles.pickerColumnLabel}>Hour</Text>
                <ScrollView style={styles.pickerColumnScroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                    <TouchableOpacity key={hour} style={[styles.pickerItem, pickerHour === hour && styles.pickerItemActive]} onPress={() => setPickerHour(hour)}>
                      <Text style={[styles.pickerItemText, pickerHour === hour && styles.pickerItemTextActive]}>{hour}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.pickerColumnCol}>
                <Text style={styles.pickerColumnLabel}>Minute</Text>
                <ScrollView style={styles.pickerColumnScroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                    <TouchableOpacity key={minute} style={[styles.pickerItem, pickerMinute === minute && styles.pickerItemActive]} onPress={() => setPickerMinute(minute)}>
                      <Text style={[styles.pickerItemText, pickerMinute === minute && styles.pickerItemTextActive]}>
                        {String(minute).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.pickerColumnCol}>
                <Text style={styles.pickerColumnLabel}>Period</Text>
                <View style={styles.periodToggleContainer}>
                  {(['AM', 'PM'] as const).map((period) => (
                    <TouchableOpacity key={period} style={[styles.periodBtn, pickerPeriod === period && styles.periodBtnActive]} onPress={() => setPickerPeriod(period)}>
                      <Text style={[styles.periodBtnText, pickerPeriod === period && styles.periodBtnTextActive]}>{period}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.pickerActions}>
              <TouchableOpacity style={styles.pickerCancelBtn} onPress={() => setActiveTimePicker(null)} activeOpacity={0.75}>
                <Text style={styles.pickerCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerSaveBtn} onPress={savePickerTime} activeOpacity={0.75}>
                <Text style={styles.pickerSaveBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sleepCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  sleepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sleepIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  sleepCardTitle: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: '#8b5cf6',
    letterSpacing: 0.8,
  },
  sleepScoreWrap: {
    alignItems: 'flex-end',
  },
  sleepHoursText: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  sleepCycleCountText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: '#8b5cf6',
    marginTop: 2,
  },
  sleepSubtext: {
    fontSize: typography.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    marginBottom: spacing.base,
  },
  sleepSteppersContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sleepStepperCol: {
    flex: 1,
    alignItems: 'center',
  },
  sleepStepperLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.onSurfaceVariant,
    marginBottom: 6,
  },
  sleepTimeDisplayRowPressable: {
    width: '100%',
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: 'rgba(139, 92, 246, 0.04)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  sleepTimeDisplayText: {
    fontSize: typography.md,
    color: Colors.onSurface,
    fontWeight: fontWeight.extraBold,
    fontVariant: ['tabular-nums'],
  },
  sleepTimeEditIcon: {
    marginLeft: 6,
  },
  stepperActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepperBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  stepperBtnText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#8b5cf6',
  },
  sleepBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  sleepProgressBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  sleepProgressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  sleepGoalLabelText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontWeight: fontWeight.bold,
  },
  sleepWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(186, 26, 26, 0.06)',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.12)',
  },
  warningIcon: {
    marginRight: 6,
  },
  sleepWarningText: {
    fontSize: 11,
    color: Colors.error,
    fontWeight: fontWeight.bold,
    flex: 1,
    lineHeight: 15,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 360,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pickerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  pickerTitle: {
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  pickerTimePreviewText: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: fontWeight.extraBold,
    color: Colors.onSurface,
    fontVariant: ['tabular-nums'],
    marginBottom: spacing.md,
  },
  pickerColumnsContainer: {
    flexDirection: 'row',
    gap: spacing.base,
    marginBottom: spacing.lg,
    height: 180,
  },
  pickerColumnCol: {
    flex: 1,
    alignItems: 'center',
  },
  pickerColumnLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  pickerColumnScroll: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  pickerItem: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
  },
  pickerItemText: {
    fontSize: typography.sm,
    color: Colors.onSurfaceVariant,
  },
  pickerItemTextActive: {
    color: Colors.onSurface,
    fontWeight: fontWeight.bold,
  },
  periodToggleContainer: {
    width: '100%',
    height: '100%',
    gap: spacing.sm,
  },
  periodBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: '#8b5cf6',
    borderWidth: 1.5,
  },
  periodBtnText: {
    fontSize: typography.sm,
    color: Colors.onSurfaceVariant,
    fontWeight: fontWeight.bold,
  },
  periodBtnTextActive: {
    color: '#8b5cf6',
  },
  pickerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pickerCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
  },
  pickerCancelBtnText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurfaceVariant,
  },
  pickerSaveBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
  },
  pickerSaveBtnText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
  },
});
