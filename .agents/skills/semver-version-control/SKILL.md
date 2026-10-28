---
name: semver-version-control
description: >-
  Audits, calculates, and applies software version increments according to Semantic Versioning (SemVer)
  standards (MAJOR, MINOR, PATCH). Use this skill whenever the user asks to update or increment the software
  version, determine which version number to bump based on recent code changes, update package.json, or explain
  the criteria for breaking changes (MAJOR), new features (MINOR), and bug fixes (PATCH).
---

# Control de Versiones SemVer (Semantic Versioning)

Esta skill define el estándar y procedimiento estricto para gestionar el versionado del software siguiendo la convención internacional **SemVer 2.0.0** (`MAJOR.MINOR.PATCH`).

---

## 🔢 Estructura de una Versión: `X.Y.Z`

```text
       v 1 . 2 . 3
         │   │   │
  MAJOR ─┘   │   └── PATCH
             │
    MINOR ───┘
```

---

## 🎯 Criterio de Decisión para los 3 Tipos de Cambio

### 1. `MAJOR` (Primer número: `X.0.0`)
Incrementa cuando se introducen **cambios incompatibles hacia atrás (Breaking Changes)**.
- **Regla matemática**: `X` aumenta en 1, y tanto `Y` como `Z` se reinician obligatoriamente a `0` (ej. `1.4.2` $\rightarrow$ `2.0.0`).
- **Casos que exigen MAJOR**:
  - Migraciones de base de datos destructivas (eliminar tablas, renombrar columnas en producción que rompen clientes antiguos).
  - Cambios en la firma o contrato de APIs públicas / Server Actions que rompen compatibilidad.
  - Reescrituras completas de arquitectura o sustitución del framework principal con cambios incompatibles.
  - Modificación de esquemas de autenticación que invalidan tokens o accesos previos sin migración retrocompatible.

### 2. `MINOR` (Segundo número: `X.Y.0`)
Incrementa cuando se añade **nueva funcionalidad compatible hacia atrás (Features)**.
- **Regla matemática**: `Y` aumenta en 1, y `Z` se reinicia a `0` (ej. `1.1.3` $\rightarrow$ `1.2.0`).
- **Casos que exigen MINOR**:
  - Nuevos módulos o pantallas en el sistema (ej. Bóveda, Bot de WhatsApp, Facturación).
  - Nuevas capacidades interactivas agregadas a pantallas existentes (ej. barras de búsqueda, filtros reactivos, exportadores a PDF/Excel).
  - Adición de nuevas columnas o tablas opcionales en la base de datos sin romper los datos existentes.
  - Nuevas Server Actions o endpoints sin romper los ya existentes.

### 3. `PATCH` (Tercer número: `X.Y.Z`)
Incrementa cuando se realizan **correcciones de errores, parches o ajustes menores (Bug Fixes)**.
- **Regla matemática**: Únicamente `Z` aumenta en 1. `X` e `Y` permanecen intactos (ej. `1.1.0` $\rightarrow$ `1.1.1`).
- **Casos que exigen PATCH**:
  - Arreglo de un bug de cálculo (ej. error en sumatoria de totales de proyecto o cálculo de stock).
  - Corrección de un error en consola o warning durante el renderizado (ej. warnings de Next.js, hidratación, `revalidatePath`).
  - Ajustes cosméticos y de estilos CSS (espaciados, tipografías, colores, bordes).
  - Actualización de parches de seguridad de dependencias npm existentes sin cambios de API.
  - Corrección de textos, títulos o etiquetas en la interfaz.

---

## 🌳 Árbol de Decisión Rápido

Para determinar qué número incrementar, analiza los cambios del commit o lote de trabajo con este orden de precedencia (el de mayor impacto manda):

1. **¿Hay algún cambio que rompa el funcionamiento previo o contratos existentes?**
   - **SÍ** $\rightarrow$ Incrementar **`MAJOR`** (`X+1.0.0`)
   - **NO** $\rightarrow$ Pasar a la pregunta 2.

2. **¿Se agregó alguna característica, filtro, pantalla, botón o funcionalidad nueva?**
   - **SÍ** $\rightarrow$ Incrementar **`MINOR`** (`X.Y+1.0`)
   - **NO** $\rightarrow$ Pasar a la pregunta 3.

3. **¿Son únicamente correcciones de bugs, mejoras visuales o ajustes de dependencias?**
   - **SÍ** $\rightarrow$ Incrementar **`PATCH`** (`X.Y.Z+1`)

---

## 📋 Protocolo de Ejecución Paso a Paso

Cuando el usuario pida actualizar la versión del sistema:

1. **Revisar los cambios recientes**:
   Inspeccionar el historial de Git para clasificar las modificaciones:
   ```bash
   git status
   git log -n 5 --oneline
   ```
2. **Determinar el tipo de cambio** usando el árbol de decisión anterior (`major`, `minor` o `patch`).
3. **Ejecutar el script auxiliar**:
   Ejecutar el script multiplataforma en el directorio del proyecto:
   ```bash
   node .agents/skills/semver-version-control/scripts/bump-version.js <major|minor|patch>
   ```
   *Alternativa manual*: Modificar directamente la propiedad `"version"` en [package.json](file:///c:/Users/Ulises/Documents/PROYECTOS/UPGRADE/package.json).
4. **Sincronizar documentación y git tags**:
   - Verificar si [README.md](file:///c:/Users/Ulises/Documents/PROYECTOS/UPGRADE/README.md) requiere actualizar alguna mención de versión o changelog.
   - Crear el commit con mensaje semántico:
     ```bash
     git commit -am "chore(release): vX.Y.Z"
     ```
   - (Opcional si el usuario lo solicita) Crear tag en Git:
     ```bash
     git tag -a vX.Y.Z -m "Release vX.Y.Z"
     ```
