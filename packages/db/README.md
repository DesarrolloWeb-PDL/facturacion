# Database package

Este paquete contiene el modelo SQL canonico del MVP y reglas de persistencia para PostgreSQL central y adaptacion posterior a SQLite local.

## Estrategia

- PostgreSQL es la fuente canonica de consolidacion
- SQLite replica un subconjunto operativo para offline-first
- la numeracion fiscal autorizada se controla del lado central salvo CAEA

## Scripts utiles

- `corepack pnpm --filter @facturacion/db validate`: valida la forma base del schema SQL
- `corepack pnpm --filter @facturacion/db apply`: aplica schema.sql sobre la DATABASE_URL configurada
