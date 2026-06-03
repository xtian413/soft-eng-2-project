import React, { useMemo, useState } from 'react';
import { Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing } from '@/theme/typography';
import { Activity, Share2 } from 'lucide-react-native';

type GenderKey = 'male' | 'female';
type HeightUnit = 'cm' | 'in';
type WeightUnit = 'kg' | 'lb';
type ActivityOption = {
  key: string;
  label: string;
  subtitle: string;
  multiplier: number;
};

const activityOptions: ActivityOption[] = [
  { key: 'sedentary', label: 'Sedentary', subtitle: 'little or no exercise', multiplier: 1.2 },
  { key: 'light', label: 'Lightly Active', subtitle: '1-3 days/week', multiplier: 1.375 },
  { key: 'moderate', label: 'Moderately Active', subtitle: '3-5 days/week', multiplier: 1.55 },
  { key: 'very', label: 'Very Active', subtitle: '6-7 days/week', multiplier: 1.725 },
  { key: 'extreme', label: 'Extremely Active', subtitle: 'physical job or intense training', multiplier: 1.9 },
];

const lossLevels = [
  { label: 'Light', targetKg: 0.25 },
  { label: 'Moderate', targetKg: 0.5 },
  { label: 'Heavy', targetKg: 1.0 },
];

export function TDEECalculator() {
  const [age, setAge] = useState('25');
  const [gender, setGender] = useState<GenderKey>('male');
  const [height, setHeight] = useState('180');
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm');
  const [weight, setWeight] = useState('80');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [activityKey, setActivityKey] = useState(activityOptions[2].key);

  const selectedActivity = activityOptions.find((option) => option.key === activityKey) ?? activityOptions[2];

  const { errors, isValid, bmr, tdee, heightCm, weightKg, heightDisplay, weightDisplay, lossPlans, exportMessage } = useMemo(() => {
    const nextErrors: string[] = [];
    const ageValue = parseInt(age, 10);
    const heightValue = parseFloat(height);
    const weightValue = parseFloat(weight);
    const hasAge = age.trim().length > 0;
    const hasHeight = height.trim().length > 0;
    const hasWeight = weight.trim().length > 0;

    if (!hasAge) {
      nextErrors.push('Age is required.');
    } else if (Number.isNaN(ageValue) || ageValue < 1 || ageValue > 120) {
      nextErrors.push('Age must be between 1 and 120.');
    }

    if (!hasHeight) {
      nextErrors.push('Height is required.');
    } else if (Number.isNaN(heightValue) || heightValue <= 0) {
      nextErrors.push('Height must be greater than 0.');
    }

    if (!hasWeight) {
      nextErrors.push('Weight is required.');
    } else if (Number.isNaN(weightValue) || weightValue <= 0) {
      nextErrors.push('Weight must be greater than 0.');
    }

    const heightCmValue = !Number.isNaN(heightValue)
      ? heightUnit === 'in'
        ? heightValue * 2.54
        : heightValue
      : 0;
    const weightKgValue = !Number.isNaN(weightValue)
      ? weightUnit === 'lb'
        ? weightValue / 2.204622621848776
        : weightValue
      : 0;

    const valid = nextErrors.length === 0;
    const bmrValue = valid
      ? Math.round(
          10 * weightKgValue + 6.25 * heightCmValue - 5 * ageValue + (gender === 'male' ? 5 : -161),
        )
      : 0;
    const tdeeValue = valid ? Math.round(bmrValue * selectedActivity.multiplier) : 0;
    const heightInValue = heightCmValue / 2.54;
    const weightLbValue = weightKgValue * 2.204622621848776;

    const lossPlansValue = valid
      ? lossLevels.map((level) => {
          const weekly = Math.round(level.targetKg * 7700);
          const daily = Math.round(weekly / 7);
          const intake = Math.max(0, tdeeValue - daily);
          return {
            label: level.label,
            weeklyGoal: `${level.targetKg.toFixed(2).replace(/\.00$/, '')} kg/week`,
            dailyDeficit: `${daily.toLocaleString()} kcal`,
            intake: `${intake.toLocaleString()} kcal`,
          };
        })
      : [];

    const message = `TDEE Results\nAge: ${hasAge ? `${ageValue} years` : 'N/A'}\nGender: ${gender === 'male' ? 'Male' : 'Female'}\nHeight: ${heightCmValue ? `${heightCmValue.toFixed(0)}cm/${heightInValue.toFixed(0)}in` : 'N/A'}\nWeight: ${weightKgValue ? `${weightKgValue.toFixed(0)}kg/${weightLbValue.toFixed(0)}lb` : 'N/A'}\nActivity: ${selectedActivity.label}\n\nMaintenance: ${tdeeValue.toLocaleString()} kcal\nLight (-${lossPlansValue[0]?.dailyDeficit ?? '0'}): ${lossPlansValue[0]?.intake ?? '0'} kcal\nModerate (-${lossPlansValue[1]?.dailyDeficit ?? '0'}): ${lossPlansValue[1]?.intake ?? '0'} kcal\nHeavy (-${lossPlansValue[2]?.dailyDeficit ?? '0'}): ${lossPlansValue[2]?.intake ?? '0'} kcal\n\nDisclaimer: Consult healthcare provider before dietary changes.`;

    return {
      errors: nextErrors,
      isValid: valid,
      bmr: bmrValue,
      tdee: tdeeValue,
      heightCm: heightCmValue,
      weightKg: weightKgValue,
      heightDisplay: `${Math.round(heightCmValue).toLocaleString()} cm / ${Math.round(heightInValue).toLocaleString()} in`,
      weightDisplay: `${Math.round(weightKgValue).toLocaleString()} kg / ${Math.round(weightLbValue).toLocaleString()} lb`,
      lossPlans: lossPlansValue,
      exportMessage: message,
    };
  }, [age, gender, height, heightUnit, weight, weightUnit, selectedActivity]);

  const handleShare = async () => {
    await Share.share({ message: exportMessage });
  };

  const toggleHeightUnit = () => {
    const heightValue = parseFloat(height);
    if (!Number.isNaN(heightValue) && heightValue > 0) {
      if (heightUnit === 'cm') {
        setHeight((heightValue / 2.54).toFixed(1).replace(/\.0$/, ''));
        setHeightUnit('in');
      } else {
        setHeight((heightValue * 2.54).toFixed(0));
        setHeightUnit('cm');
      }
      return;
    }
    setHeightUnit(heightUnit === 'cm' ? 'in' : 'cm');
  };

  const toggleWeightUnit = () => {
    const weightValue = parseFloat(weight);
    if (!Number.isNaN(weightValue) && weightValue > 0) {
      if (weightUnit === 'kg') {
        setWeight((weightValue * 2.204622621848776).toFixed(1).replace(/\.0$/, ''));
        setWeightUnit('lb');
      } else {
        setWeight((weightValue / 2.204622621848776).toFixed(0));
        setWeightUnit('kg');
      }
      return;
    }
    setWeightUnit(weightUnit === 'kg' ? 'lb' : 'kg');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>TDEE & Weight Loss Calculator</Text>
            <Text style={styles.subtitle}>Estimate your maintenance calories and daily targets.</Text>
          </View>
          <Activity size={24} color={Colors.primary} />
        </View>

        <View style={styles.rowInputGroup}>
          <View style={styles.inputBlock}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={[styles.input, !age.trim() || errors.some((error) => error.includes('Age')) ? styles.inputError : null]}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholder="25"
              placeholderTextColor={Colors.outline}
            />
          </View>

          <View style={styles.genderGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.toggleRowDouble}>
              {(['male', 'female'] as GenderKey[]).map((option) => (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.8}
                  style={[styles.toggleButton, gender === option && styles.toggleButtonActive]}
                  onPress={() => setGender(option)}
                >
                  <Text style={[styles.toggleButtonText, gender === option && styles.toggleButtonTextActive]}>
                    {option === 'male' ? 'Male' : 'Female'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.rowInputGroup}>
          <View style={styles.inputBlock}>
            <Text style={styles.label}>Height</Text>
            <View style={styles.inputWithButton}>
              <TextInput
                style={[styles.input, styles.flexInput, !height.trim() || errors.some((error) => error.includes('Height')) ? styles.inputError : null]}
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                placeholder={heightUnit === 'cm' ? '180' : '71'}
                placeholderTextColor={Colors.outline}
              />
              <TouchableOpacity activeOpacity={0.8} style={styles.unitButton} onPress={toggleHeightUnit}>
                <Text style={styles.unitButtonText}>{heightUnit.toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.label}>Weight</Text>
            <View style={styles.inputWithButton}>
              <TextInput
                style={[styles.input, styles.flexInput, !weight.trim() || errors.some((error) => error.includes('Weight')) ? styles.inputError : null]}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder={weightUnit === 'kg' ? '80' : '176'}
                placeholderTextColor={Colors.outline}
              />
              <TouchableOpacity activeOpacity={0.8} style={styles.unitButton} onPress={toggleWeightUnit}>
                <Text style={styles.unitButtonText}>{weightUnit.toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={[styles.label, styles.sectionLabel]}>Activity Level</Text>
        <View style={styles.activityGrid}>
          {activityOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.8}
              style={[styles.activityCard, selectedActivity.key === option.key && styles.activityCardActive]}
              onPress={() => setActivityKey(option.key)}
            >
              <Text style={[styles.activityTitle, selectedActivity.key === option.key && styles.activityTitleActive]}>{option.label}</Text>
              <Text style={styles.activitySubtitle}>{option.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity activeOpacity={0.8} style={styles.shareButton} onPress={handleShare}>
          <Share2 size={16} color={Colors.onPrimary} style={styles.shareIcon} />
          <Text style={styles.shareText}>Export Results</Text>
        </TouchableOpacity>
      </View>

      {!!errors.length && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errors.join(' ')}</Text>
        </View>
      )}

      <View style={styles.card}> 
        <Text style={styles.cardTitle}>Maintenance Calories</Text>
        {isValid ? (
          <>
            <Text style={styles.maintenanceValue}>{tdee.toLocaleString()} kcal</Text>
            <Text style={styles.calculationText}>
              BMR × activity ({selectedActivity.multiplier.toFixed(3)}) = {tdee.toLocaleString()} kcal
            </Text>
            <Text style={styles.unitInfo}>{heightDisplay} · {weightDisplay}</Text>
          </>
        ) : (
          <Text style={styles.emptyText}>Enter valid inputs to calculate</Text>
        )}
      </View>

      <View style={styles.lossWrapper}>
        {lossPlans.length > 0 ? (
          lossPlans.map((plan) => (
            <View key={plan.label} style={styles.lossCard}>
              <Text style={styles.lossLabel}>{plan.label}</Text>
              <Text style={styles.lossGoal}>{plan.weeklyGoal}</Text>
              <Text style={styles.lossDetail}>{plan.dailyDeficit} daily deficit</Text>
              <Text style={styles.lossIntake}>{plan.intake} target intake</Text>
            </View>
          ))
        ) : (
          <View style={styles.lossEmpty}>
            <Text style={styles.emptyText}>Enter valid inputs to calculate your weight-loss targets.</Text>
          </View>
        )}
      </View>

      <View style={styles.disclaimerCard}>
        <Activity size={20} color={Colors.primary} style={styles.disclaimerIcon} />
        <Text style={styles.disclaimerText}>
          Calculations are estimates only. Consult a healthcare provider before changing diet or exercise routines.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.lg,
    fontWeight: fontWeight.extraBold,
    color: Colors.onSurface,
  },
  subtitle: {
    fontSize: typography.sm,
    color: Colors.outline,
    marginTop: spacing.xs,
    maxWidth: '75%',
  },
  sectionLabel: {
    marginTop: spacing.md,
  },
  rowInputGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputBlock: {
    flex: 1,
  },
  label: {
    fontSize: typography.sm,
    color: Colors.outline,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.6)',
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: typography.base,
    color: Colors.onSurface,
    backgroundColor: Colors.surface,
  },
  inputError: {
    borderColor: Colors.error,
  },
  genderGroup: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleRowDouble: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.6)',
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  toggleButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  toggleButtonText: {
    fontSize: typography.sm,
    color: Colors.outline,
    fontWeight: fontWeight.medium,
  },
  toggleButtonTextActive: {
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  inputWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flexInput: {
    flex: 1,
  },
  unitButton: {
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.6)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: Colors.surface,
  },
  unitButtonText: {
    fontSize: typography.sm,
    color: Colors.primary,
    fontWeight: fontWeight.semiBold,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  activityCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
    marginBottom: spacing.sm,
  },
  activityCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  activityTitle: {
    fontSize: typography.sm,
    color: Colors.onSurface,
    fontWeight: fontWeight.semiBold,
  },
  activityTitleActive: {
    color: Colors.primary,
  },
  activitySubtitle: {
    marginTop: spacing.xs,
    fontSize: typography.xs,
    color: Colors.outline,
    lineHeight: 18,
  },
  shareButton: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
  },
  shareIcon: {
    marginRight: spacing.xs,
  },
  shareText: {
    color: Colors.onPrimary,
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: Colors.error,
    fontSize: typography.sm,
  },
  cardTitle: {
    fontSize: typography.xs,
    fontWeight: fontWeight.bold,
    color: Colors.outline,
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  maintenanceValue: {
    fontSize: typography.xxxl,
    fontWeight: fontWeight.extraBold,
    color: Colors.onSurface,
    marginBottom: spacing.sm,
  },
  calculationText: {
    fontSize: typography.sm,
    color: Colors.outline,
    marginBottom: spacing.xs,
  },
  unitInfo: {
    fontSize: typography.xs,
    color: Colors.outline,
  },
  emptyText: {
    fontSize: typography.sm,
    color: Colors.outline,
    lineHeight: 20,
  },
  lossWrapper: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  lossCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.15)',
  },
  lossLabel: {
    fontSize: typography.sm,
    color: Colors.primary,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  lossGoal: {
    fontSize: typography.md,
    color: Colors.onSurface,
    fontWeight: fontWeight.extraBold,
    marginBottom: spacing.xs,
  },
  lossDetail: {
    fontSize: typography.sm,
    color: Colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  lossIntake: {
    fontSize: typography.base,
    color: Colors.onSurface,
    fontWeight: fontWeight.bold,
  },
  lossEmpty: {
    padding: spacing.base,
    alignItems: 'center',
  },
  disclaimerCard: {
    flexDirection: 'row',
    backgroundColor: '#eff4ff',
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.12)',
  },
  disclaimerIcon: {
    marginTop: 2,
  },
  disclaimerText: {
    flex: 1,
    fontSize: typography.sm,
    color: Colors.primary,
    lineHeight: 20,
  },
});
