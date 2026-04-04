'use client';

import { useEffect, useRef } from 'react';
import type { Driver } from 'driver.js';
import type { DriveStep } from 'driver.js';

import { useTour } from '@/hooks/use-tour';

export type FeatureTourProps = {
  steps: DriveStep[];
  tourId: string;
  onComplete: () => void;
  autoStart?: boolean;
};

export function FeatureTour({ steps, tourId, onComplete, autoStart = true }: FeatureTourProps) {
  const { shouldShowTour, markTourCompleted } = useTour(tourId);
  const driverRef = useRef<Driver | null>(null);
  const ignoreDestroyedRef = useRef(false);

  useEffect(() => {
    if (!autoStart) return;
    if (!shouldShowTour) return;
    if (steps.length === 0) return;

    let cancelled = false;
    let driverObj: Driver | null = null;
    ignoreDestroyedRef.current = false;

    void (async () => {
      const mod = await import('driver.js');
      await import('driver.js/dist/driver.css');
      if (cancelled) return;

      const handleComplete = () => {
        if (ignoreDestroyedRef.current) return;
        markTourCompleted();
        onComplete();
      };

      const config = {
        nextBtnText: 'Siguiente',
        prevBtnText: 'Anterior',
        doneBtnText: 'Finalizar',
        closeBtnText: 'Cerrar',
        showProgress: true,
        progressText: '{{current}} de {{total}}',
        onDestroyed: handleComplete,
      } satisfies Parameters<typeof mod.driver>[0] & { closeBtnText: string };

      const instance = mod.driver(config as unknown as Parameters<typeof mod.driver>[0]);
      driverObj = instance;

      driverRef.current = instance;
      instance.setSteps(steps);
      instance.drive();
    })();

    return () => {
      cancelled = true;
      ignoreDestroyedRef.current = true;
      driverObj?.destroy();
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, [autoStart, markTourCompleted, onComplete, shouldShowTour, steps]);

  return null;
}
