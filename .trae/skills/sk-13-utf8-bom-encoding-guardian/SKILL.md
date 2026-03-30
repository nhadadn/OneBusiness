---
name: "sk-13-utf8-bom-encoding-guardian"
description: "Verificación de UTF-8 BOM y mojibake en Windows. Invocar antes de commits/PR y al ver caracteres corruptos (Ã±, DueÃ±o, etc.)."
---

# SK-13 — UTF-8 BOM & Encoding Guardian

## Cuándo invocarlo

- Antes de cada commit/merge.
- Si aparecen caracteres corruptos en UI/docs/tests (mojibake).
- Si algún archivo nuevo viene de copy/paste o export externo.

## Verificar BOM (UTF-8)

El BOM esperado es: `EF BB BF`.

```powershell
Get-Content ruta\archivo.tsx -Encoding Byte -TotalCount 3 | ForEach-Object { '{0:X2}' -f $_ }
```

## Barrido mojibake (src)

```powershell
Get-ChildItem -Recurse -Filter "*.tsx" -Path src |
  Select-String -Pattern 'DueÃ±o|Ã±|Ã³|Ã¡|Ã©|Ã­|Ãº' |
  Select-Object Path, LineNumber, Line
```

Resultado esperado: sin matches.

