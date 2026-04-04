'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = (id: string) => `onebusiness_tour_${id}_completed`;

export function useTour(tourId: string) {
  const storageKey = useMemo(() => STORAGE_KEY(tourId), [tourId]);
  const [shouldShowTour, setShouldShowTour] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const completed = window.localStorage.getItem(storageKey);
    setShouldShowTour(!completed);
  }, [storageKey]);

  const markTourCompleted = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, 'true');
    setShouldShowTour(false);
  }, [storageKey]);

  const resetTour = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(storageKey);
    setShouldShowTour(true);
  }, [storageKey]);

  return { shouldShowTour, markTourCompleted, resetTour };
}
