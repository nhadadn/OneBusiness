import type { DriveStep } from 'driver.js';

export const arqueoTourSteps: DriveStep[] = [
  {
    element: '[data-tour="arqueo-selector"]',
    popover: {
      title: 'Selección de negocio',
      description: 'El arqueo depende del negocio y la fecha de corte seleccionados.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="arqueo-table"]',
    popover: {
      title: 'Detalle de arqueo',
      description: 'Consulta saldos calculados, saldos reales y diferencias por cuenta.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="arqueo-comprometidos"]',
    popover: {
      title: 'Comprometidos',
      description: 'Este valor muestra montos comprometidos que impactan el efectivo disponible.',
      side: 'top',
      align: 'center',
    },
  },
];
