# Solicitud: Creación de Prompt Maestro para Vibecoding - Proyecto OneBusiness

## Contexto del Proyecto
Estoy trabajando en el proyecto **OneBusiness** (repositorio GitHub) y necesito crear un **prompt maestro especializado en Vibecoding** que sirva como guía para completar el desarrollo según el CTO-Action-Plan inicial.

### Estado Actual
- **Sprint completado**: 1.1 - 1.3 (parcialmente 1.4)
- **Documentación disponible**: 
  - Informe técnico consolidado (sprints 1.1-1.4)
  - ADR (Architecture Decision Records) actualizado
  - Ground Truth extendido a Sprint 1.4
- **Último commit**: 90940f7 (2026-03-12)
- **Validaciones pasadas**: ✅ lint, ✅ test (15 suites/99 tests), ✅ build

### Objetivo del Sprint 1.4 (Pendiente)
1. Categorización de movimientos (globales + específicas por negocio)
2. Arqueo bancario (comparar saldo calculado vs saldo real)
3. Vista de consolidación del holding completo (solo para rol Dueño)

## Tu Tarea
Necesito que analices los documentos adjuntos y el repositorio OneBusiness para crear un **prompt maestro** que:

1. **Redefina la estrategia** basándose en:
   - Ground Truth actual (estado verificado del proyecto)
   - Archivos ADR e informe técnico principal
   - Propósito original del proyecto

2. **Genere prompts actualizados** incorporando las 7 reglas aprendidas durante el desarrollo:

### REGLAS OBLIGATORIAS PARA TODOS LOS PROMPTS

**P1 - PROMPTS AUTOCONTENIDOS**
- Cada prompt debe funcionar independientemente y de forma secuencial
- Incluir siempre:
  - Lista de archivos existentes (NO duplicar)
  - Lista de archivos a CREAR (nuevos)
  - Lista de archivos a MODIFICAR (con fragmento relevante del código actual)
  - Imports disponibles en el proyecto

**P2 - ESPECIFICACIONES EXACTAS**
- Definir schemas Zod campo por campo
- Especificar tipos TypeScript exactos
- Incluir lógica de negocio descriptiva, sin llegar a crear la solucion final.
- Documentar explícitamente casos edge

**P3 - BLOQUE 0 DE VERIFICACIÓN PREVIA**
- Iniciar cada prompt con comandos de verificación UNICAMENTE EN WINDOWS(CMD/POWERSHELL):
  ```powershell
  Get-Content <archivo-a-modificar>
  ```
- Confirmar existencia y contenido actual antes de modificar

**P4 - VALIDACIÓN OBLIGATORIA AL FINAL**
- Terminar cada prompt con:
  ```powershell
  # Verificar archivos creados/modificados
  Get-Content <cada-archivo-nuevo-o-modificado>
  
  # Validar compilación
  npm run build
  
  # Ejecutar tests
  npm run test
  

**P5 - NO DUPLICAR CÓDIGO EXISTENTE**
- Verificar antes de crear:
  - ¿Hook similar existe? → Extender, no crear
  - ¿Componente similar existe? → Reutilizar
  - ¿Lógica en service existe? → Importar, no copiar
- Ejemplos críticos ya existentes:
  - `useUpdateSaldoReal()`
  - `formatCurrencyMXN()`
  - `parseMoney()`
  - `handleServiceError()`

**P6 - MODIFICACIONES NO SOLICITADAS**
- Si la IA modifica archivos no incluidos en el prompt:
  - Solicitar `Get-Content` de esos archivos
  - Verificar que no hay breaking changes
  - Documentar el cambio antes de continuar

**P7 - DECIMAL PARA CÁLCULOS MONETARIOS**
- Los montos vienen como string Decimal de la BD
- Usar `parseFloat()` para operaciones simples
- Para acumulaciones: sumar como números, formatear al final
- **NUNCA** usar `parseInt()` para montos

### Decisiones de Diseño Confirmadas
1. **Categorías**: Globales (negocioId=null) + específicas por negocio
2. **Saldo real**: Campo manual, comparado vs saldo calculado
3. **Arqueo**: Dentro del alcance de Sprint 1.4
4. **Consolidación**: Solo para rol Dueño (no Admin)
5. **Decimal**: `parseFloat()` para todos los cálculos monetarios

### Gap Detectado
- Sprint 1.4 está **parcial**: existe módulo de cuentas bancarias, pero **falta implementación de categorías** (schema/API/UI)
- Desviación documentada en ADR: cuentas bancarias modeladas por negocio (FK directa) en lugar de N:M

## Formato de Entrega Esperado

Por favor, proporciona:

1. **Prompt Maestro de Vibecoding** que incluya:
   - Análisis del estado actual vs objetivo
   - Estrategia de completación del Sprint 1.4.
   - Template de prompt que incorpore las 7 reglas
   - Checklist de validación pre/post ejecución
   
2. **Lista priorizada de tareas** para completar Sprint 1.4:
   - Cada tarea con su prompt específico siguiendo las reglas
   - Orden de ejecución recomendado
   - Dependencias entre tareas

3. **Plan de validación** para cada entregable

4. **Recomendaciones** para mantener la calidad y evitar regresiones

---

**Nota**: Adjunto los documentos mencionados (informe técnico, ADR, Ground Truth). Por favor, analízalos en detalle. REITERO, LA INTENCION ES QUE ESTE MASTER PROMPT GENERE LA INSTRUCCION PARA LA CREACION DE TODOS LOS PROMPTS A DESARROLLAR PARA LOGRAR EL SPRINT 1.4 Y SU PREPARACION PARA LOS SIGUIENTES SPRINTS.