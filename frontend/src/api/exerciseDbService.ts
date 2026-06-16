import { LOCAL_GIFS } from './localGifs';
import EXERCISES_JSON from './exercises.json';

export interface Muscle {
  id: number;
  name: string;
  name_en: string;
  is_front: boolean;
  image_url_main: string;
  image_url_secondary: string;
  slug: string;
  aliases: string[];
}

export interface ExerciseDbExercise {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl: string;
  secondaryMuscles: string[];
  instructions: string[];
  primaryMuscleIds: number[];
  secondaryMuscleIds: number[];
}

export interface EquipmentOption {
  id: string;
  name: string;
}

const MUSCLES: Muscle[] = [
  {
    id: 1,
    name: 'Chest',
    name_en: 'Chest',
    is_front: true,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'chest',
    aliases: ['chest', 'pectorals', 'pecs'],
  },
  {
    id: 2,
    name: 'Biceps',
    name_en: 'Biceps',
    is_front: true,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'biceps',
    aliases: ['biceps', 'upper arms'],
  },
  {
    id: 3,
    name: 'Triceps',
    name_en: 'Triceps',
    is_front: false,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'triceps',
    aliases: ['triceps', 'upper arms'],
  },
  {
    id: 4,
    name: 'Abs',
    name_en: 'Abs',
    is_front: true,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'abs',
    aliases: ['abs', 'abdominals', 'core', 'waist'],
  },
  {
    id: 5,
    name: 'Obliques',
    name_en: 'Obliques',
    is_front: true,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'obliques',
    aliases: ['obliques'],
  },
  {
    id: 6,
    name: 'Quadriceps',
    name_en: 'Quadriceps',
    is_front: true,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'quadriceps',
    aliases: ['quadriceps', 'quads', 'upper legs'],
  },
  {
    id: 7,
    name: 'Hamstrings',
    name_en: 'Hamstrings',
    is_front: false,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'hamstring',
    aliases: ['hamstrings', 'hamstring', 'upper legs'],
  },
  {
    id: 8,
    name: 'Glutes',
    name_en: 'Glutes',
    is_front: false,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'gluteal',
    aliases: ['glutes', 'glute', 'gluteus', 'gluteus maximus', 'butt'],
  },
  {
    id: 9,
    name: 'Adductors',
    name_en: 'Adductors',
    is_front: false,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'adductors',
    aliases: ['adductors', 'inner thigh'],
  },
  {
    id: 10,
    name: 'Abductors',
    name_en: 'Abductors',
    is_front: false,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'abductors',
    aliases: ['abductors', 'outer thigh'],
  },
  {
    id: 11,
    name: 'Calves',
    name_en: 'Calves',
    is_front: true,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'calves',
    aliases: ['calves', 'calf', 'lower legs'],
  },
  {
    id: 12,
    name: 'Trapezius',
    name_en: 'Trapezius',
    is_front: false,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'trapezius',
    aliases: ['trapezius', 'traps'],
  },
  {
    id: 13,
    name: 'Upper Back',
    name_en: 'Upper Back',
    is_front: false,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'upper-back',
    aliases: ['upper back', 'lats', 'latissimus dorsi', 'latissimus', 'back'],
  },
  {
    id: 14,
    name: 'Lower Back',
    name_en: 'Lower Back',
    is_front: false,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'lower-back',
    aliases: ['lower back', 'erector spinae', 'spine'],
  },
  {
    id: 15,
    name: 'Forearms',
    name_en: 'Forearms',
    is_front: true,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'forearm',
    aliases: ['forearms', 'forearm'],
  },
  {
    id: 16,
    name: 'Deltoids',
    name_en: 'Deltoids',
    is_front: true,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'deltoids',
    aliases: ['delts', 'deltoids', 'shoulders', 'shoulder'],
  },
  {
    id: 17,
    name: 'Neck',
    name_en: 'Neck',
    is_front: true,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'neck',
    aliases: ['neck'],
  },
  {
    id: 18,
    name: 'Tibialis',
    name_en: 'Tibialis',
    is_front: true,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'tibialis',
    aliases: ['tibialis', 'shin'],
  },
  {
    id: 19,
    name: 'Hands',
    name_en: 'Hands',
    is_front: true,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'hands',
    aliases: ['hands', 'hand'],
  },
  {
    id: 20,
    name: 'Feet',
    name_en: 'Feet',
    is_front: true,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'feet',
    aliases: ['feet', 'foot'],
  },
  {
    id: 21,
    name: 'Ankles',
    name_en: 'Ankles',
    is_front: true,
    image_url_main: '',
    image_url_secondary: '',
    slug: 'ankles',
    aliases: ['ankles', 'ankle'],
  },
];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const buildAliasIndex = () => {
  const index = new Map<string, number[]>();

  MUSCLES.forEach((muscle) => {
    muscle.aliases.forEach((alias) => {
      const key = normalize(alias);
      const existing = index.get(key) || [];
      index.set(key, [...existing, muscle.id]);
    });
  });

  return index;
};

const ALIAS_INDEX = buildAliasIndex();

const resolveMuscleIds = (values: string[]) => {
  const ids: number[] = [];

  values.forEach((value) => {
    const normalized = normalize(value);
    const matched = ALIAS_INDEX.get(normalized) || [];
    matched.forEach((id) => {
      if (!ids.includes(id)) ids.push(id);
    });
  });

  return ids;
};

class ExerciseDbService {
  private exercisesCache: ExerciseDbExercise[] | null = null;
  private equipmentCache: EquipmentOption[] | null = null;

  private async loadExercises(): Promise<ExerciseDbExercise[]> {
    if (this.exercisesCache) return this.exercisesCache;

    const exercises = (EXERCISES_JSON as any[]).map((item) => {
      const secondaryMuscles = item.secondaryMuscles || [];
      const muscleSignals = [item.target, item.bodyPart, ...secondaryMuscles].filter(Boolean);
      const primaryMuscleIds = resolveMuscleIds([item.target, item.bodyPart].filter(Boolean));
      const secondaryMuscleIds = resolveMuscleIds(secondaryMuscles);
      const combined = resolveMuscleIds(muscleSignals);

      return {
        id: item.id || 'Unnamed id',
        name: item.name || 'Unnamed exercise',
        bodyPart: item.bodyPart || '',
        target: item.target || '',
        equipment: item.equipment || '',
        gifUrl: item.gifUrl || '',
        secondaryMuscles,
        instructions: item.instructions || [],
        primaryMuscleIds: primaryMuscleIds.length > 0 ? primaryMuscleIds : combined,
        secondaryMuscleIds,
      } as ExerciseDbExercise;
    });

    this.exercisesCache = exercises;
    return exercises;
  }

  async getExercises(): Promise<ExerciseDbExercise[]> {
    return this.loadExercises();
  }

  async getExercisesByMuscle(muscleId: number, equipment?: string): Promise<ExerciseDbExercise[]> {
    const exercises = await this.loadExercises();
    return exercises.filter((exercise) => {
      const matchesMuscle =
        exercise.primaryMuscleIds.includes(muscleId) || exercise.secondaryMuscleIds.includes(muscleId);
      const matchesEquipment = equipment ? normalize(exercise.equipment) === normalize(equipment) : true;
      return matchesMuscle && matchesEquipment;
    });
  }

  async getExercisesByBodyPart(bodyPart: string): Promise<ExerciseDbExercise[]> {
    const exercises = await this.loadExercises();
    const normalized = normalize(bodyPart);
    return exercises.filter((exercise) => normalize(exercise.bodyPart) === normalized);
  }

  async searchExercises(query: string): Promise<ExerciseDbExercise[]> {
    const exercises = await this.loadExercises();
    const normalized = normalize(query);
    if (!normalized) return exercises;

    return exercises.filter((exercise) => {
      return normalize(exercise.name).includes(normalized);
    });
  }

  async getEquipment(): Promise<EquipmentOption[]> {
    if (this.equipmentCache) return this.equipmentCache;
    const exercises = await this.loadExercises();

    const equipmentList = Array.from(new Set(exercises.map((exercise) => exercise.equipment).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ id: name, name }));

    this.equipmentCache = equipmentList;
    return equipmentList;
  }

  async getMuscles(): Promise<Muscle[]> {
    return MUSCLES;
  }

  async getMuscleName(muscleId: number): Promise<string> {
    const muscle = MUSCLES.find((item) => item.id === muscleId);
    return muscle?.name_en || `Muscle ${muscleId}`;
  }
}

export const exerciseDbService = new ExerciseDbService();

export function getGifSource(item: ExerciseDbExercise): any {
  if (!item) return null;
  const localGif = LOCAL_GIFS[item.id];
  if (localGif) {
    return localGif;
  }

  // Fallback to official high-speed CloudFront CDN if URL points to broken exercisedb.io domain
  if (item.gifUrl && item.gifUrl.includes('exercisedb.io/image')) {
    return { uri: `https://d205bpvrqc9yn1.cloudfront.net/${item.id}.gif` };
  }

  return item.gifUrl ? { uri: item.gifUrl } : null;
}
