---
name: "sk-07-windows-powershell-validator"
description: "Comandos y reglas para Windows + PowerShell en OneBusiness. Invocar al dar comandos de terminal, paths con ()[] y chequeos de encoding."
---

# SK-07 — Windows PowerShell Validator

## Cuándo invocarlo

- Antes de proponer comandos de terminal (entorno Windows + PowerShell).
- Al manejar rutas con `()` y `[]` (escapes).
- Al validar encoding (UTF-8 BOM) y mojibake.

## Reglas de entorno

- Shell: PowerShell (no bash/sh/cmd).
- Rutas con `()` y `[]` requieren escape en algunos contextos.

## Comandos útiles

**Leer archivo con rutas especiales**
```powershell
Get-Content src/app/\(dashboard\)/cotizaciones/\[id\]/page.tsx
```

**Verificar existencia antes de modificar**
```powershell
Test-Path src/components/cotizaciones/cotizacion-detalle.tsx
```

**Buscar texto**
```powershell
Get-ChildItem -Recurse -Include "*.ts","*.tsx" -Path src | Select-String -Pattern "useActualizarEstado"
```

## Encoding UTF-8 BOM

**Verificar BOM (EF BB BF)**
```powershell
Get-Content src/components/nuevo.tsx -Encoding Byte -TotalCount 3 | ForEach-Object { '{0:X2}' -f $_ }
```

## Barrido mojibake (obligatorio antes de commit)

```powershell
Get-ChildItem -Recurse -Filter "*.tsx" -Path src |
  Select-String -Pattern 'DueÃ±o|Ã±|Ã³|Ã¡|Ã©|Ã­|Ãº' |
  Select-Object Path, LineNumber, Line
```

