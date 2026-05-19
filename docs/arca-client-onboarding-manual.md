# Manual Base Para Alta de Cliente en ARCA

## Objetivo

Este manual sirve para pedirle a cada cliente la informacion minima necesaria para configurar facturacion electronica en la plataforma sin tocar su Clave Fiscal dentro de la app.

## Aclaracion importante

La Clave Fiscal no debe cargarse ni almacenarse en esta aplicacion.

Se usa solamente en el sitio oficial de ARCA/AFIP para:

- obtener certificados
- asociar servicios web
- revisar puntos de venta y relaciones habilitadas

Despues de eso, la app trabaja con configuracion del emisor y certificados digitales.

## Datos que el cliente tiene que completar

Checklist funcional:

- razon social o nombre completo del emisor
- CUIT
- condicion frente al IVA
- ingresos brutos, si corresponde
- fecha de inicio de actividades
- domicilio fiscal
- provincia, localidad y codigo postal
- punto o puntos de venta que se usaran
- entorno a usar: testing u homologacion primero, produccion despues

Checklist tecnico:

- certificado digital X.509 del emisor para testing
- clave privada asociada al certificado
- certificado digital X.509 del emisor para produccion, cuando llegue esa etapa
- clave privada asociada para produccion
- confirmacion de que el certificado fue asociado al web service correcto

## Donde se obtiene cada cosa

### 1. Certificado de testing

Segun la documentacion oficial de WSAA, el certificado digital para testing se gestiona desde WSASS, ingresando con Clave Fiscal.

Referencia oficial:

- WSAA indica que el certificado para testing se obtiene en WSASS
- URL oficial WSAA testing: https://www.afip.gob.ar/ws/documentacion/wsaa.asp

### 2. Certificado de produccion

Segun la misma documentacion oficial, el certificado para produccion se gestiona desde Administrador de Certificados Digitales.

Referencia oficial:

- URL oficial WSAA produccion: https://www.afip.gob.ar/ws/documentacion/wsaa.asp
- Instructivo oficial de obtencion de certificado productivo: https://www.afip.gob.ar/ws/WSAA/wsaa_obtener_certificado_produccion.pdf

### 3. Asociacion del certificado al web service

La documentacion oficial de WSAA indica:

- en testing, la asociacion al Web Service de Negocio se hace en WSASS
- en produccion, la asociacion se hace en Administrador de Relaciones de Clave Fiscal

Referencia oficial:

- Instructivo oficial de asociacion: https://www.afip.gob.ar/ws/WSAA/wsaa_asociar_certificado_a_wsn_produccion.pdf

### 4. Servicio web a habilitar

Para este proyecto, el servicio principal inicial es WSFEv1.

La documentacion oficial de factura electronica lo publica como el web service para comprobantes A, B, C y M sin detalle de item, y CAEA para A y B.

Referencia oficial:

- https://www.afip.gob.ar/ws/documentacion/ws-factura-electronica.asp
- Manual desarrollador WSFEv1: https://www.afip.gob.ar/ws/documentacion/manuales/manual-desarrollador-ARCA-COMPG.pdf

### 5. Punto de venta

El cliente tiene que confirmar que ya dispone de un punto de venta habilitado para la operatoria que va a usar.

Observacion operativa:

- en pruebas reales del portal se pudo ver la administracion de puntos de venta desde PVEL
- la navegacion exacta puede variar segun perfil y servicios habilitados del contribuyente

Por eso, en el onboarding conviene pedir:

- numero de punto de venta
- descripcion o nombre del punto de venta
- confirmacion de que ese punto de venta corresponde al esquema que va a usar el cliente

## Que archivos pedirle al cliente

Pedir exactamente esto:

- archivo de certificado, normalmente .crt
- archivo de clave privada, normalmente .key
- alias interno para identificar el certificado
- passphrase de la clave privada, si existe

La passphrase no deberia enviarse por canales inseguros ni quedar expuesta en chat o mail abierto.

## Flujo recomendado de onboarding

1. El cliente completa sus datos fiscales basicos.
2. El cliente ingresa a ARCA con su Clave Fiscal por su cuenta.
3. Obtiene o descarga el certificado correspondiente.
4. Asocia el certificado a WSFEv1.
5. Confirma el punto de venta.
6. Entrega a soporte o carga en la app el certificado y la clave privada.
7. La app valida WSAA en homologacion.
8. Recién despues se prueba autorizacion WSFEv1.

## Reglas para soporte

- no pedir Clave Fiscal por chat, mail ni telefono
- no reutilizar datos reales de un cliente como seed demo
- separar testing de produccion con certificados distintos
- dejar por escrito que el CAE solo existe cuando ARCA responde correctamente

## Estado actual del repo

El demo web ya no deberia usar datos reales o realistas de una prueba puntual como emisor por defecto. Cada cliente debe completar su propio onboarding fiscal.