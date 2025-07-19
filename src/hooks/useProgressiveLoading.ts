import { useState, useEffect, useCallback } from "react";

export interface LoadingStage {
  id: string;
  name: string;
  progress: number;
  completed: boolean;
}

export interface ProgressiveLoadingState {
  currentStage: string;
  overallProgress: number;
  stages: LoadingStage[];
  isComplete: boolean;
  error?: string;
}

const initialStages: LoadingStage[] = [
  {
    id: "initialization",
    name: "Initializing Browser Investigator...",
    progress: 0,
    completed: false,
  },
  {
    id: "storage",
    name: "Loading saved settings...",
    progress: 0,
    completed: false,
  },
  {
    id: "devtools",
    name: "Connecting to DevTools API...",
    progress: 0,
    completed: false,
  },
  {
    id: "components",
    name: "Loading interface components...",
    progress: 0,
    completed: false,
  },
  {
    id: "ready",
    name: "Ready to capture network calls!",
    progress: 100,
    completed: false,
  },
];

export const useProgressiveLoading = () => {
  const [loadingState, setLoadingState] = useState<ProgressiveLoadingState>({
    currentStage: "initialization",
    overallProgress: 0,
    stages: initialStages,
    isComplete: false,
  });

  const updateStage = useCallback(
    (stageId: string, progress: number, completed?: boolean) => {
      setLoadingState((prev) => {
        const updatedStages = prev.stages.map((stage) =>
          stage.id === stageId
            ? { ...stage, progress, completed: completed ?? progress >= 100 }
            : stage,
        );

        const currentStageIndex = updatedStages.findIndex(
          (s) => s.id === stageId,
        );
        const nextStage = updatedStages[currentStageIndex + 1];
        const newCurrentStage = completed && nextStage ? nextStage.id : stageId;

        const overallProgress =
          updatedStages.reduce((acc, stage) => acc + stage.progress, 0) /
          updatedStages.length;
        const isComplete = updatedStages.every((stage) => stage.completed);

        return {
          ...prev,
          currentStage: isComplete ? "ready" : newCurrentStage,
          overallProgress,
          stages: updatedStages,
          isComplete,
        };
      });
    },
    [],
  );

  const setError = useCallback((error: string) => {
    setLoadingState((prev) => ({ ...prev, error }));
  }, []);

  const startLoading = useCallback(() => {
    // Simulate realistic loading stages
    const stages = [
      { id: "initialization", delay: 0, duration: 200 },
      { id: "storage", delay: 200, duration: 300 },
      { id: "devtools", delay: 500, duration: 400 },
      { id: "components", delay: 900, duration: 500 },
    ];

    stages.forEach(({ id, delay, duration }) => {
      setTimeout(() => {
        updateStage(id, 0);

        // Simulate progress
        const progressInterval = setInterval(() => {
          updateStage(id, Math.min(100, Math.random() * 30 + 70));
        }, duration / 4);

        setTimeout(() => {
          clearInterval(progressInterval);
          updateStage(id, 100, true);
        }, duration);
      }, delay);
    });

    // Mark as complete after all stages
    setTimeout(() => {
      updateStage("ready", 100, true);
    }, 1400);
  }, [updateStage]);

  const getCurrentStageInfo = useCallback(() => {
    const currentStage = loadingState.stages.find(
      (s) => s.id === loadingState.currentStage,
    );
    return {
      name: currentStage?.name || "Loading...",
      progress: currentStage?.progress || 0,
    };
  }, [loadingState]);

  return {
    loadingState,
    updateStage,
    setError,
    startLoading,
    getCurrentStageInfo,
    isLoading: !loadingState.isComplete && !loadingState.error,
  };
};
