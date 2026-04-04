import type { DriveStep } from 'driver.js';

export const cuentasBancoTourSteps: DriveStep[] = [
  {
    element: '[data-tour="cuentas-table"]',
    popover: {
      title: 'Cuentas bancarias',
      description: 'Revisa las cuentas y sus saldos asociados al negocio seleccionado.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="cuentas-new"]',
    popover: {
      title: 'Crear cuenta',
      description: 'Crea una nueva cuenta bancaria para este negocio.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="cuentas-tipo"]',
    popover: {
      title: 'Disponibilidad',
      description: 'Identifica si una cuenta es global, compartida o exclusiva.',
      side: 'left',
      align: 'center',
    },
  },
  {
    element: '[data-tour="cuentas-assign"]',
    popover: {
      title: 'Asignación',
      description: 'Desde la edición puedes asignar la cuenta a negocios cuando aplica.',
      side: 'left',
      align: 'center',
    },
  },
];
