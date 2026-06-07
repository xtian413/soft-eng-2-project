import axios, { AxiosInstance } from 'axios';

const WGER_BASE_URL = 'https://wger.de/api/v2';
const API_KEY = '9cda3542e5d22ed7603d8b1a8721589fd59bfcfe';

export interface Muscle {
  id: number;
  name: string;
  name_en: string;
  is_front: boolean;
  image_url_main: string;
  image_url_secondary: string;
}

export interface Equipment {
  id: number;
  name: string;
}

export interface ExerciseTranslation {
  id: number;
  name: string;
  description: string;
  language: number;
}

export interface ExerciseImage {
  id: number;
  image: string;
  is_main: boolean;
  license_author: string;
}

export interface ExerciseVideo {
  id: number;
  video: string;
  license_author: string;
}

export interface ExerciseNote {
  id: number;
  uuid: string;
  comment: string;
  exercise: number;
}

export interface Exercise {
  id: number;
  uuid: string;
  name: string;
  category: number;
  muscles: number[]; // Primary muscles
  muscles_secondary: number[]; // Secondary muscles
  equipment: number[]; // Equipment IDs
  variation_group?: number;
  license_author: string;
}

export interface ExerciseInfo extends Exercise {
  translations: ExerciseTranslation[];
  images: ExerciseImage[];
  videos: ExerciseVideo[];
  aliases: any[];
  notes: ExerciseNote[];
  author_history: string[];
}

export interface MuscleData {
  id: number;
  name: string;
  is_front: boolean;
}

class WGERService {
  private api: AxiosInstance;
  private musclesCache: Muscle[] = [];
  private equipmentCache: Equipment[] = [];

  private normalizeExercise(exercise: any): ExerciseInfo {
    const mapIds = (items: any[] | undefined) => {
      if (!Array.isArray(items)) return [];
      return items
        .map((item) => (typeof item === 'number' ? item : item?.id))
        .filter((id) => typeof id === 'number');
    };

    return {
      ...exercise,
      muscles: mapIds(exercise?.muscles),
      muscles_secondary: mapIds(exercise?.muscles_secondary),
      equipment: mapIds(exercise?.equipment),
    } as ExerciseInfo;
  }

  constructor() {
    this.api = axios.create({
      baseURL: WGER_BASE_URL,
      params: {
        token: API_KEY,
      },
      timeout: 10000,
    });
  }

  /**
   * Get all muscles/body parts
   */
  async getMuscles(): Promise<Muscle[]> {
    try {
      if (this.musclesCache.length > 0) {
        return this.musclesCache;
      }

      const response = await this.api.get('/muscle/');
      const muscles = response.data.results || [];
      this.musclesCache = muscles;
      return muscles;
    } catch (error) {
      console.error('Error fetching muscles:', error);
      return [];
    }
  }

  /**
   * Get all equipment types
   */
  async getEquipment(): Promise<Equipment[]> {
    try {
      if (this.equipmentCache.length > 0) {
        return this.equipmentCache;
      }

      const response = await this.api.get('/equipment/');
      const equipment = response.data.results || [];
      this.equipmentCache = equipment;
      return equipment;
    } catch (error) {
      console.error('Error fetching equipment:', error);
      return [];
    }
  }

  /**
   * Get exercises by muscle ID
   */
  async getExercisesByMuscle(muscleId: number, equipment?: number): Promise<ExerciseInfo[]> {
    try {
      const params: any = {
        muscles: muscleId,
        limit: 100,
      };

      if (equipment) {
        params.equipment = equipment;
      }

      const response = await this.api.get('/exerciseinfo/', { params });
      const exercises = (response.data.results || []).map((exercise: any) => this.normalizeExercise(exercise));
      
      // Debug: Log sample exercise to see data structure
      if (exercises.length > 0) {
        console.log('[wgerService] Sample exercise from API:', {
          id: exercises[0].id,
          name: exercises[0].translations?.[0]?.name,
          muscles: exercises[0].muscles,
          muscles_secondary: exercises[0].muscles_secondary,
          fullData: exercises[0],
        });
      }
      
      return exercises;
    } catch (error) {
      console.error('Error fetching exercises by muscle:', error);
      return [];
    }
  }

  /**
   * Get exercises by equipment
   */
  async getExercisesByEquipment(equipmentId: number): Promise<ExerciseInfo[]> {
    try {
      const response = await this.api.get('/exerciseinfo/', {
        params: {
          equipment: equipmentId,
          limit: 100,
        },
      });
      return (response.data.results || []).map((exercise: any) => this.normalizeExercise(exercise));
    } catch (error) {
      console.error('Error fetching exercises by equipment:', error);
      return [];
    }
  }

  /**
   * Get exercise by ID with full details
   */
  async getExerciseById(exerciseId: number): Promise<ExerciseInfo | null> {
    try {
      const response = await this.api.get(`/exerciseinfo/${exerciseId}/`);
      return response.data ? this.normalizeExercise(response.data) : null;
    } catch (error) {
      console.error('Error fetching exercise by ID:', error);
      return null;
    }
  }

  /**
   * Search exercises by name
   */
  async searchExercises(query: string): Promise<ExerciseInfo[]> {
    try {
      // WGER doesn't have a direct search, so we fetch all and filter
      // For production, consider fetching all once and caching
      const response = await this.api.get('/exerciseinfo/', {
        params: {
          limit: 200,
        },
      });

      const allExercises = (response.data.results || []).map((exercise: any) => this.normalizeExercise(exercise));
      const lowerQuery = query.toLowerCase();

      return allExercises.filter((exercise: ExerciseInfo) => {
        const name = exercise.translations?.[0]?.name || '';
        return name.toLowerCase().includes(lowerQuery);
      });
    } catch (error) {
      console.error('Error searching exercises:', error);
      return [];
    }
  }

  /**
   * Get exercises by multiple criteria
   */
  async getFilteredExercises(
    muscleId?: number,
    equipmentId?: number,
    categoryId?: number
  ): Promise<ExerciseInfo[]> {
    try {
      const params: any = {
        limit: 100,
      };

      if (muscleId) params.muscles = muscleId;
      if (equipmentId) params.equipment = equipmentId;
      if (categoryId) params.category = categoryId;

      const response = await this.api.get('/exerciseinfo/', { params });
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching filtered exercises:', error);
      return [];
    }
  }

  /**
   * Get exercises that target secondary muscles
   */
  async getExercisesBySecondaryMuscle(muscleId: number): Promise<ExerciseInfo[]> {
    try {
      // WGER API might not have direct secondary muscle filtering
      // Fetch all exercises and filter client-side
      const response = await this.api.get('/exerciseinfo/', {
        params: {
          limit: 200,
        },
      });

      const allExercises = response.data.results || [];
      return allExercises.filter((ex: ExerciseInfo) => ex.muscles_secondary.includes(muscleId));
    } catch (error) {
      console.error('Error fetching exercises by secondary muscle:', error);
      return [];
    }
  }

  /**
   * Get muscle name by ID
   */
  async getMuscleName(muscleId: number): Promise<string> {
    try {
      const muscles = await this.getMuscles();
      const muscle = muscles.find((m) => m.id === muscleId);
      return muscle?.name_en || `Muscle ${muscleId}`;
    } catch (error) {
      console.error('Error getting muscle name:', error);
      return `Muscle ${muscleId}`;
    }
  }

  /**
   * Get equipment name by ID
   */
  async getEquipmentName(equipmentId: number): Promise<string> {
    try {
      const equipment = await this.getEquipment();
      const equip = equipment.find((e) => e.id === equipmentId);
      return equip?.name || `Equipment ${equipmentId}`;
    } catch (error) {
      console.error('Error getting equipment name:', error);
      return `Equipment ${equipmentId}`;
    }
  }
}

// Export singleton instance
export const wgerService = new WGERService();
