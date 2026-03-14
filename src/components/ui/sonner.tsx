'use client';

import type * as React from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

export function Toaster(props: ToasterProps) {
  return <Sonner richColors closeButton theme="light" {...props} />;
}

