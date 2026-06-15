import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const PENDING_AUTO_TUTORIAL_USER_KEY = 'gemi:pendingAutoTutorialUserId';

type TutorialStartOptions = {
  persistCompletion?: boolean;
};

interface TutorialContextType {
  isTutorialActive: boolean;
  currentStep: number;
  startTutorial: (options?: TutorialStartOptions) => void;
  endTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  resetTutorial: () => Promise<void>;
  hasSeenTutorial: boolean;
  isLoading: boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const shouldPersistCompletionRef = useRef(false);
  const pendingFetchRef = useRef<string | null>(null);
  const lastCheckedUserRef = useRef<string | null>(null);
  const lastWriteTimeRef = useRef<number>(0);

  const clearPendingAutoTutorial = useCallback(async (userId: string) => {
    const pendingUserId = await AsyncStorage.getItem(PENDING_AUTO_TUTORIAL_USER_KEY);
    console.log('[Tutorial][Complete] Checking pending auto tutorial flag before removal', {
      key: PENDING_AUTO_TUTORIAL_USER_KEY,
      expectedValue: userId,
      currentValue: pendingUserId,
      willRemove: pendingUserId === userId,
    });
    if (pendingUserId === userId) {
      await AsyncStorage.removeItem(PENDING_AUTO_TUTORIAL_USER_KEY);
      const valueAfterRemove = await AsyncStorage.getItem(PENDING_AUTO_TUTORIAL_USER_KEY);
      console.log('[Tutorial][Complete] Pending auto tutorial flag removed', {
        key: PENDING_AUTO_TUTORIAL_USER_KEY,
        valueAfterRemove,
        removed: valueAfterRemove === null,
      });
    }
  }, []);

  const checkAutomaticTutorialStatus = useCallback(async (userId: string) => {
    console.log('[Tutorial][Startup] Automatic tutorial status check requested', {
      authenticatedUserId: userId,
      pendingFetchUserId: pendingFetchRef.current,
      lastCheckedUserId: lastCheckedUserRef.current,
    });

    if (pendingFetchRef.current === userId) {
      console.log('[Tutorial][Startup] Not checking tutorial status', {
        authenticatedUserId: userId,
        reason: 'A tutorial status check is already in flight for this user.',
      });
      return;
    }
    if (lastCheckedUserRef.current === userId) {
      console.log('[Tutorial][Startup] Not checking tutorial status', {
        authenticatedUserId: userId,
        reason: 'This user was already checked in the current provider session.',
      });
      setIsLoading(false);
      return;
    }

    pendingFetchRef.current = userId;
    setIsLoading(true);

    try {
      const pendingUserId = await AsyncStorage.getItem(PENDING_AUTO_TUTORIAL_USER_KEY);
      console.log('[Tutorial][Startup] Pending auto tutorial flag read', {
        authenticatedUserId: userId,
        key: PENDING_AUTO_TUTORIAL_USER_KEY,
        pendingAutoTutorialUserId: pendingUserId,
      });
      if (pendingUserId !== userId) {
        console.log('[Tutorial][Startup] Tutorial will not auto-start', {
          authenticatedUserId: userId,
          pendingAutoTutorialUserId: pendingUserId,
          tutorialCompletionExists: 'not checked',
          reason: 'Pending auto tutorial user id does not match the authenticated user.',
        });
        setHasSeenTutorial(true);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('has_seen_onboarding')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn(`[Tutorial] Failed to fetch tutorial status for new user ${userId}:`, error);
        console.log('[Tutorial][Startup] Tutorial will not auto-start', {
          authenticatedUserId: userId,
          pendingAutoTutorialUserId: pendingUserId,
          tutorialCompletionExists: 'unknown',
          reason: 'Profile tutorial completion check failed.',
        });
        setHasSeenTutorial(true);
        return;
      }

      const hasSeen = data?.has_seen_onboarding ?? false;
      console.log('[Tutorial][Startup] Profile tutorial completion read', {
        authenticatedUserId: userId,
        pendingAutoTutorialUserId: pendingUserId,
        hasSeenOnboarding: data?.has_seen_onboarding ?? null,
        tutorialCompletionExists: hasSeen,
      });
      setHasSeenTutorial(hasSeen);

      if (hasSeen) {
        console.log('[Tutorial][Startup] Tutorial will not auto-start', {
          authenticatedUserId: userId,
          pendingAutoTutorialUserId: pendingUserId,
          tutorialCompletionExists: hasSeen,
          reason: 'Profile already has tutorial completion saved.',
        });
        await clearPendingAutoTutorial(userId);
      } else {
        console.log('[Tutorial][Startup] Tutorial is eligible to auto-start', {
          authenticatedUserId: userId,
          pendingAutoTutorialUserId: pendingUserId,
          tutorialCompletionExists: hasSeen,
          reason: 'Pending flag matches and profile has not completed onboarding.',
        });
      }
    } catch (error) {
      console.error(`[Tutorial] Exception checking automatic tutorial status for ${userId}:`, error);
      console.log('[Tutorial][Startup] Tutorial will not auto-start', {
        authenticatedUserId: userId,
        reason: 'Exception while checking pending flag or completion state.',
      });
      setHasSeenTutorial(true);
    } finally {
      lastCheckedUserRef.current = userId;
      pendingFetchRef.current = null;
      setIsLoading(false);
    }
  }, [clearPendingAutoTutorial]);

  useEffect(() => {
    const handleSessionUser = async (userId: string | null) => {
      console.log('[Tutorial][Startup] Session user observed by TutorialContext', {
        authenticatedUserId: userId,
      });
      setCurrentUserId(userId);

      if (!userId) {
        console.log('[Tutorial][Startup] Tutorial will not auto-start', {
          authenticatedUserId: null,
          reason: 'No authenticated user.',
        });
        setHasSeenTutorial(true);
        setIsLoading(false);
        pendingFetchRef.current = null;
        lastCheckedUserRef.current = null;
        shouldPersistCompletionRef.current = false;
        return;
      }

      await checkAutomaticTutorialStatus(userId);
    };

    let active = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!active) return;
        console.log('[Tutorial][Startup] Initial getSession result', {
          authenticatedUserId: data.session?.user?.id ?? null,
          hasSession: !!data.session,
        });
        void handleSessionUser(data.session?.user?.id ?? null);
      })
      .catch((error) => {
        console.error('[Tutorial] Error checking auth state:', error);
        if (active) setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[Tutorial][Startup] Auth state change observed by TutorialContext', {
        event: _event,
        authenticatedUserId: session?.user?.id ?? null,
        hasSession: !!session,
      });
      void handleSessionUser(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [checkAutomaticTutorialStatus]);

  const startTutorial = useCallback((options?: TutorialStartOptions) => {
    shouldPersistCompletionRef.current = options?.persistCompletion ?? false;
    console.log('[Tutorial][Start] Opening tutorial', {
      persistCompletion: shouldPersistCompletionRef.current,
      reason: shouldPersistCompletionRef.current
        ? 'Automatic tutorial start will save completion on finish.'
        : 'Manual tutorial start will not save completion state.',
    });
    setCurrentStep(0);
    setIsTutorialActive(true);
  }, []);

  const markTutorialComplete = useCallback(async () => {
    if (!currentUserId) {
      console.log('[Tutorial][Complete] Completion not saved', {
        reason: 'No current authenticated user id.',
      });
      return;
    }

    const now = Date.now();
    const timeSinceLastWrite = now - lastWriteTimeRef.current;
    if (timeSinceLastWrite < 2000) {
      await new Promise((resolve) => setTimeout(resolve, 2000 - timeSinceLastWrite));
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ has_seen_onboarding: true })
        .eq('id', currentUserId);

      lastWriteTimeRef.current = Date.now();

      if (error) {
        console.error(`[Tutorial] Error marking tutorial complete for user ${currentUserId}:`, error);
        console.log('[Tutorial][Complete] Completion save failed', {
          completionTable: 'profiles',
          completionKey: 'has_seen_onboarding',
          valueBeingSaved: true,
          userId: currentUserId,
        });
        return;
      }

      console.log('[Tutorial][Complete] Completion saved', {
        completionTable: 'profiles',
        completionKey: 'has_seen_onboarding',
        valueBeingSaved: true,
        userId: currentUserId,
      });
      setHasSeenTutorial(true);
      await clearPendingAutoTutorial(currentUserId);
    } catch (error) {
      console.error(`[Tutorial] Exception marking tutorial complete for user ${currentUserId}:`, error);
    }
  }, [clearPendingAutoTutorial, currentUserId]);

  const finishTutorial = useCallback(async () => {
    setIsTutorialActive(false);
    console.log('[Tutorial][Complete] Tutorial finished', {
      persistCompletion: shouldPersistCompletionRef.current,
      reason: shouldPersistCompletionRef.current
        ? 'Automatic tutorial completion will be persisted.'
        : 'Manual tutorial completion will not modify completion state.',
    });

    if (shouldPersistCompletionRef.current) {
      await markTutorialComplete();
    }

    shouldPersistCompletionRef.current = false;
  }, [markTutorialComplete]);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => prev + 1);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const resetTutorial = useCallback(async () => {
    if (!currentUserId) return;

    try {
      console.log('[Tutorial][Reset] Writing pending auto tutorial flag', {
        key: PENDING_AUTO_TUTORIAL_USER_KEY,
        value: currentUserId,
      });
      await AsyncStorage.setItem(PENDING_AUTO_TUTORIAL_USER_KEY, currentUserId);
      lastCheckedUserRef.current = null;
      setHasSeenTutorial(false);
      setCurrentStep(0);
    } catch (error) {
      console.error(`[Tutorial] Exception resetting automatic tutorial for ${currentUserId}:`, error);
    }
  }, [currentUserId]);

  return (
    <TutorialContext.Provider
      value={{
        isTutorialActive,
        currentStep,
        startTutorial,
        endTutorial: finishTutorial,
        nextStep,
        prevStep,
        skipTutorial: finishTutorial,
        resetTutorial,
        hasSeenTutorial,
        isLoading,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
}
