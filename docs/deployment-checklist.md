# Checklist De Ejecucion Y Despliegue

## Estado actual

Hoy el monorepo puede correr en local con esta separacion:

- apps/web como frontend Next.js
- apps/api como backend Fastify
- PostgreSQL como persistencia central cuando DATABASE_URL esta configurada

Sin DATABASE_URL, la API arranca igual pero cae a repositorios en memoria. Eso sirve para demos y pruebas rapidas, no para un despliegue serio.

## Que falta para ejecutar de forma completa

### Minimo para web + API

- DATABASE_URL valida hacia PostgreSQL
- NEXT_PUBLIC_API_BASE_URL apuntando a la API desplegada

### Para emision ARCA real

- ARCA_CERT
- ARCA_KEY
- certificado asociado correctamente al servicio WSFEv1 en el entorno correspondiente

## Recomendacion de despliegue

### Opcion recomendada hoy

- apps/web en Vercel
- apps/api en Railway, Render o Fly.io
- PostgreSQL en Neon, Supabase, Railway o similar

Esta es la mejor opcion con el estado actual del repo porque:

- la web ya es una app Next.js estandar y calza bien en Vercel
- la API hoy es Fastify standalone, no una app pensada para funciones serverless de Vercel
- la API necesita conexiones a PostgreSQL y potencialmente manejo mas estable de certificados/secretos

### Opcion no recomendada por ahora

Subir web y API juntas a Vercel sin cambios grandes.

Eso requeriria refactorar la API actual hacia route handlers o funciones serverless compatibles con el modelo de Vercel. No es imposible, pero hoy no es el camino corto.

## Orden sugerido

1. Crear repositorio Git remoto.
2. Subir el monorepo.
3. Desplegar apps/web en Vercel configurando el Root Directory en apps/web.
4. Desplegar apps/api en otro proveedor Node.
5. Crear la base PostgreSQL.
6. Cargar variables de entorno en ambos despliegues.
7. Validar onboarding, login, sync y vouchers.

Guia concreta del repo actual:

- [docs/vercel-railway-deploy.md](docs/vercel-railway-deploy.md)

## Variables por servicio

### apps/web

- NEXT_PUBLIC_API_BASE_URL

### apps/api

- DATABASE_URL
- ARCA_CERT
- ARCA_KEY
- PORT si el proveedor lo requiere de forma explicita
- HOST si el proveedor lo requiere de forma explicita

## Configuracion minima en Vercel

Proyecto:

- Framework Preset: Next.js
- Root Directory: apps/web

Variables:

- NEXT_PUBLIC_API_BASE_URL=https://tu-api.example.com

## Configuracion minima para la API

Proveedor Node recomendado:

- Railway
- Render
- Fly.io

Comando de build:

- no es estrictamente obligatorio para pruebas si el proveedor soporta start de TypeScript con runtime, pero para un despliegue prolijo conviene definir build separado mas adelante

Comando actual de desarrollo:

- corepack pnpm --filter @facturacion/api dev

Pendiente recomendable para produccion:

- agregar script start productivo compilado o ejecutar via tsx de forma controlada segun proveedor

## Base de datos

La base no es opcional si queres:

- usuarios persistentes
- organizaciones persistentes
- sincronizacion durable
- locks de comprobantes entre dispositivos

Sin base, la API funciona solo como demo efimera en memoria.

## Decision concreta

Si queres mover esto YA, el siguiente paso correcto es:

1. crear repo Git remoto
2. desplegar web en Vercel
3. desplegar API en Railway o Render
4. conectar PostgreSQL

Eso nos deja una arquitectura deployable sin refactor grande.