# Despliegue Inicial En Vercel Y Railway

## Objetivo

Dejar un camino corto y repetible para desplegar la web en Vercel y la API en Railway con PostgreSQL central.

## Web en Vercel

El repo ya incluye [vercel.json](vercel.json) con:

- rootDirectory en apps/web
- installCommand con pnpm
- buildCommand filtrado a @facturacion/web

### Variables necesarias

- NEXT_PUBLIC_API_BASE_URL

### Flujo sugerido

1. Crear proyecto en Vercel desde el repo.
2. Confirmar que detecta la configuracion del archivo vercel.json.
3. Cargar NEXT_PUBLIC_API_BASE_URL apuntando a la API desplegada.
4. Ejecutar primer deploy.

## API en Railway

El repo ya incluye [railway.toml](railway.toml) con:

- buildCommand usando pnpm en el monorepo completo
- startCommand apuntando a @facturacion/api
- healthcheck en /health

### Variables necesarias

- DATABASE_URL
- ARCA_CERT
- ARCA_KEY
- PORT si Railway lo expone de forma explicita

### Flujo sugerido

1. Crear servicio en Railway desde el repo.
2. Dejar Root Directory en la raiz del repo para que el workspace vea packages compartidos.
3. Cargar DATABASE_URL y las variables fiscales.
4. Ejecutar el deploy.

## Base PostgreSQL

El repo ya incluye un bootstrap reproducible:

- script raiz: `corepack pnpm db:apply`
- script real: packages/db/scripts/apply-schema.mjs

Eso aplica [packages/db/schema.sql](packages/db/schema.sql) sobre la DATABASE_URL configurada.

## Observacion actual

La API productiva se deja corriendo con tsx sobre el codigo fuente porque los packages workspace todavia no estan empaquetados en dist para runtime compilado. Eso es suficiente para un primer deploy funcional, pero mas adelante conviene endurecer un build productivo completo de packages/domain y packages/contracts.