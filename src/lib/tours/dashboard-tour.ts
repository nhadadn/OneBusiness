import type { DriveStep } from 'driver.js';

export const dashboardTourSteps: DriveStep[] = [
  {
    element: '[data-tour="dashboard-welcome"]',
    popover: {
      title: 'Bienvenido al Dashboard',
      description: 'Aquí verás un resumen rápido de ingresos, egresos, utilidad y saldos.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="dashboard-summary"]',
    popover: {
      title: 'Resumen financiero',
      description: 'Estas tarjetas consolidan los números clave del período seleccionado.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="dashboard-pending"]',
    popover: {
      title: 'Pendientes',
      description: 'Identifica rápidamente movimientos por aprobar o por registrar.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="dashboard-nav"]',
    popover: {
      title: 'Navegación',
      description: 'Usa este menú para cambiar entre módulos del sistema.',
      side: 'right',
      align: 'start',
    },
  },
];
