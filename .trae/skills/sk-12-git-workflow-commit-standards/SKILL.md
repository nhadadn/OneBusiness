---
name: "sk-12-git-workflow-commit-standards"
description: "Flujo Git y estándares de commits. Invocar al preparar merges/push a main, publicar branches de sprint y limpiar working tree."
---

# SK-12 — Git Workflow & Commit Standards

## Cuándo invocarlo

- Antes de mergear una rama de sprint a `main`.
- Antes de hacer `push` a `origin/main`.
- Al diagnosticar “no veo cambios en GitHub” (tracking/upstream).

## Comandos base (PowerShell)

```powershell
git status
git branch
git log --oneline -5
git diff
```

## Estándar de mensajes de commit (ejemplo)

```text
feat(1.4.A): mensaje
fix(2.3-E): mensaje
docs(DOCS-01): mensaje
```

## Flujo recomendado (sprint → main)

1) Asegurar working tree limpio (`git status`).
2) Actualizar `main` desde remoto (`git fetch`, `git pull`).
3) Merge (preferir fast-forward si aplica).
4) Correr `npm test` y `npm run lint`.
5) `git push origin main`.

