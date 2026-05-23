import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing } from '@/theme/typography';
import { Sparkles, Check, Dumbbell, Play, Pause, Plus } from 'lucide-react-native';

interface LiftTabProps {
  triggerToast: (msg: string) => void;
}

interface SetLog {
  id: string;
  setNum: number;
  weight: number;
  reps: number;
  rir: number;
  isChecked: boolean;
}

export function LiftTab({ triggerToast }: LiftTabProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(2535); // 42:15 default start
  const [isLbs, setIsLbs] = useState(true);

  // Set configuration input state
  const [inputWeight, setInputWeight] = useState('185');
  const [inputReps, setInputReps] = useState('8');
  const [inputRir, setInputRir] = useState('2');

  const [setsList, setSetsList] = useState<SetLog[]>([
    { id: '1', setNum: 1, weight: 185, reps: 8, rir: 2, isChecked: true },
    { id: '2', setNum: 2, weight: 185, reps: 8, rir: 2, isChecked: true },
    { id: '3', setNum: 3, weight: 185, reps: 6, rir: 1, isChecked: false },
  ]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scaleAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSecs((s) => s + 1);
      }, 1000);

      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.02,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      scaleAnim.setValue(1);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, scaleAnim]);

  const formatTime = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  };

  const handleLogSet = () => {
    const w = parseFloat(inputWeight) || 0;
    const r = parseInt(inputReps) || 0;
    const rir = parseInt(inputRir) || 0;

    if (w <= 0 || r <= 0) {
      triggerToast('Please enter valid Weight and Reps!');
      return;
    }

    const newSet: SetLog = {
      id: String(Date.now()),
      setNum: setsList.length + 1,
      weight: w,
      reps: r,
      rir,
      isChecked: true,
    };

    setSetsList((prev) => [...prev, newSet]);
    triggerToast(`Logged Set #${newSet.setNum}: ${w}${isLbs ? 'lbs' : 'kg'} × ${r} reps`);
  };

  const handleToggleCheck = (id: string) => {
    setSetsList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isChecked: !s.isChecked } : s))
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Session Timer Card */}
      <View style={styles.timerCard}>
        <View style={styles.timerHeaderRow}>
          <Text style={styles.timerLabel}>ACTIVE TRAINING SESSION</Text>
          <View style={styles.timerActiveDot} />
        </View>
        <Animated.Text style={[styles.timerDisplay, { transform: [{ scale: scaleAnim }] }]}>
          {formatTime(elapsedSecs)}
        </Animated.Text>
        <View style={styles.timerActions}>
          <TouchableOpacity
            style={[styles.timerBtn, isRunning ? styles.btnPause : styles.btnStart]}
            onPress={() => setIsRunning(!isRunning)}
            activeOpacity={0.8}
          >
            <View style={styles.timerBtnContent}>
              {isRunning ? (
                <Pause size={14} color={Colors.onPrimary} style={{ marginRight: 6 }} />
              ) : (
                <Play size={14} color={Colors.onPrimary} fill={Colors.onPrimary} style={{ marginRight: 6 }} />
              )}
              <Text style={styles.timerBtnText}>{isRunning ? 'Pause Workout' : 'Start Session'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Exercise Canvas card */}
      <View style={styles.card}>
        <View style={styles.exerciseHeader}>
          <View style={styles.tagChip}>
            <View style={styles.tagChipContent}>
              <Dumbbell size={10} color={Colors.primaryContainer} style={{ marginRight: 4 }} />
              <Text style={styles.tagChipText}>Lower Body</Text>
            </View>
          </View>
          <View style={styles.unitToggleRow}>
            <TouchableOpacity onPress={() => setIsLbs(true)}>
              <Text style={[styles.unitBtn, isLbs && styles.unitBtnActive]}>lbs</Text>
            </TouchableOpacity>
            <Text style={styles.unitSlash}>/</Text>
            <TouchableOpacity onPress={() => setIsLbs(false)}>
              <Text style={[styles.unitBtn, !isLbs && styles.unitBtnActive]}>kg</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.exerciseTitle}>Back Squat</Text>

        {/* Input Columns */}
        <View style={styles.columnsInputRow}>
          <View style={styles.inputCol}>
            <Text style={styles.columnLabel}>Weight ({isLbs ? 'lbs' : 'kg'})</Text>
            <TextInput
              style={styles.columnInput}
              value={inputWeight}
              onChangeText={setInputWeight}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputCol}>
            <Text style={styles.columnLabel}>Reps</Text>
            <TextInput
              style={styles.columnInput}
              value={inputReps}
              onChangeText={setInputReps}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputCol}>
            <Text style={styles.columnLabel}>RIR</Text>
            <TextInput
              style={styles.columnInput}
              value={inputRir}
              onChangeText={setInputRir}
              keyboardType="numeric"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logSetBtn} onPress={handleLogSet} activeOpacity={0.85}>
          <View style={styles.logSetBtnContent}>
            <Plus size={16} color={Colors.onPrimary} strokeWidth={3} style={{ marginRight: 6 }} />
            <Text style={styles.logSetBtnText}>Log Set</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* AI Whisper Card */}
      <View style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <View style={styles.whisperBadge}>
            <Text style={styles.whisperBadgeText}>Whisper</Text>
          </View>
          <Sparkles size={16} color="#a855f7" fill="#a855f7" />
        </View>
        <Text style={styles.insightQuote}>
          "Volume target reached for quadriceps. Adjust squat intensity by +5% next session."
        </Text>
      </View>

      {/* Set History Table */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>SET HISTORY</Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.thText, { flex: 0.8 }]}>Set #</Text>
          <Text style={[styles.thText, { flex: 1.5 }]}>Previous</Text>
          <Text style={[styles.thText, { flex: 2 }]}>Log</Text>
          <Text style={[styles.thText, { flex: 0.8, textAlign: 'right' }]}>Done</Text>
        </View>

        <View style={styles.tableBody}>
          {setsList.map((set) => (
            <View key={set.id} style={styles.tableRow}>
              <Text style={[styles.tdSetNum, { flex: 0.8 }]}>{set.setNum}</Text>
              <Text style={[styles.tdPrevious, { flex: 1.5 }]}>
                {set.setNum === 1 ? '175 lbs × 8' : set.setNum === 2 ? '175 lbs × 8' : '—'}
              </Text>
              <Text style={[styles.tdLog, { flex: 2 }]}>
                {set.weight} {isLbs ? 'lbs' : 'kg'} × {set.reps} (RIR {set.rir})
              </Text>
              <TouchableOpacity
                style={[styles.checkboxWrap, { flex: 0.8 }]}
                onPress={() => handleToggleCheck(set.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, set.isChecked && styles.checkboxChecked]}>
                  {set.isChecked && <Check size={12} color={Colors.onPrimary} strokeWidth={3.5} />}
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl * 2,
  },
  timerCard: {
    backgroundColor: Colors.primary,
    borderRadius: radius.lg,
    padding: spacing.base,
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  timerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  timerLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.0,
  },
  timerActiveDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: '#10b981',
  },
  timerDisplay: {
    color: Colors.onPrimary,
    fontSize: 42,
    fontWeight: fontWeight.extraBold,
    letterSpacing: 2,
    marginVertical: spacing.xs,
  },
  timerActions: {
    width: '100%',
  },
  timerBtn: {
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  btnStart: {
    backgroundColor: Colors.primaryContainer,
  },
  btnPause: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  timerBtnText: {
    color: Colors.onPrimary,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
  cardTitle: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 0.8,
    marginBottom: spacing.base,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tagChip: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  tagChipText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.primaryContainer,
  },
  unitToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unitBtn: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    color: Colors.outline,
  },
  unitBtnActive: {
    color: Colors.primaryContainer,
    fontWeight: fontWeight.bold,
  },
  unitSlash: {
    fontSize: 11,
    color: Colors.outline,
  },
  exerciseTitle: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: spacing.md,
  },
  columnsInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.base,
  },
  inputCol: {
    flex: 1,
  },
  columnLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    marginBottom: 4,
  },
  columnInput: {
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.25)',
    borderRadius: radius.md,
    backgroundColor: Colors.background,
    paddingHorizontal: spacing.sm,
    fontSize: typography.base,
    color: Colors.onSurface,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  logSetBtn: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  logSetBtnText: {
    color: Colors.onPrimary,
    fontWeight: fontWeight.bold,
    fontSize: typography.base,
  },
  insightCard: {
    backgroundColor: '#faf5ff', // Purple gradient accent
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.15)',
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  whisperBadge: {
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  whisperBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#a855f7',
  },
  insightSparkle: {
    fontSize: 14,
  },
  insightQuote: {
    fontSize: typography.sm,
    fontStyle: 'italic',
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.25)',
  },
  thText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
  },
  tableBody: {
    marginTop: spacing.xs,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.08)',
  },
  tdSetNum: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
  },
  tdPrevious: {
    fontSize: typography.xs,
    color: Colors.outline,
  },
  tdLog: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  checkboxWrap: {
    alignItems: 'flex-end',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.xs + 2,
    borderWidth: 1.5,
    borderColor: 'rgba(190, 200, 210, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkboxCheckmark: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.onPrimary,
  },
  timerBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logSetBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
