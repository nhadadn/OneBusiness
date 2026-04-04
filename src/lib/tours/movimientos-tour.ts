import type { DriveStep } from 'driver.js';

export const movimientosTourSteps: DriveStep[] = [
  {
    element: '[data-tour="movimientos-table"]',
    popover: {
      title: 'Tabla de movimientos',
      description: 'Consulta y revisa los movimientos registrados para el negocio seleccionado.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="movimientos-filters"]',
    popover: {
      title: 'Filtros',
      description: 'Filtra por estado, tipo y rango de fechas para encontrar información rápido.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="movimientos-new"]',
    popover: {
      title: 'Nuevo movimiento',
      description: 'Crea un ingreso, egreso o traspaso desde aquí.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="movimientos-approve"]',
    popover: {
      title: 'Aprobar',
      description: 'Aprueba un movimiento pendiente cuando corresponde.',
      side: 'left',
      align: 'center',
    },
  },
  {
    element: '[data-tour="movimientos-pay"]',
    popover: {
      title: 'Marcar como pagado',
      description: 'Cuando un movimiento esté aprobado, puedes marcarlo como pagado.',
      side: 'left',
      align: 'center',
    },
  },
];
