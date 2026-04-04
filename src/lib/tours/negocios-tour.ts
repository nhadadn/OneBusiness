import type { DriveStep } from 'driver.js';

export const negociosTourSteps: DriveStep[] = [
  {
    element: '[data-tour="negocios-table"]',
    popover: {
      title: 'Listado de negocios',
      description: 'Aquí puedes ver y administrar los negocios disponibles.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="negocios-new"]',
    popover: {
      title: 'Crear negocio',
      description: 'Agrega un nuevo negocio al holding desde este botón.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="negocios-edit"]',
    popover: {
      title: 'Editar negocio',
      description: 'Edita la información del negocio y su configuración.',
      side: 'left',
      align: 'center',
    },
  },
];
