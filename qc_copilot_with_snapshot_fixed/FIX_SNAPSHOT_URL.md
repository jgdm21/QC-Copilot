# Fix para Snapshot Build Failed - Agregar releaseUrl

## Problema
El snapshot falla porque `drawer.js` intenta acceder a `window.parent.location.href`, lo cual está bloqueado por CORS cuando se ejecuta desde un iframe de extensión.

## Solución
Ya actualicé `drawer.js` en la línea 1268 para usar `currentState.releaseUrl` en lugar de `window.parent.location.href`.

**AHORA NECESITAS HACER ESTE CAMBIO EN EL ARCHIVO QUE ENVÍA LOS DATOS AL DRAWER:**

Busca en tu código donde se envía el mensaje `initRelease` al drawer (probablemente en `content.js` o similar).

El mensaje debe verse algo así:

```javascript
iframe.contentWindow.postMessage({
  tipo: 'initRelease',
  flags: flags,
  releaseData: releaseData,
  // ... otros campos
}, '*');
```

**AGREGA EL CAMPO `releaseUrl`:**

```javascript
iframe.contentWindow.postMessage({
  tipo: 'initRelease',
  flags: flags,
  releaseData: releaseData,
  releaseUrl: window.location.href,  // 👈 AGREGAR ESTA LÍNEA
  audioMatchTracks: audioMatchTracks,
  explicitFound: explicitFound,
  zendeskInfo: zendeskInfo,
  previouslyRejected: previouslyRejected,
  tenantInfo: tenantInfo
}, '*');
```

## Archivos que debes revisar:
1. Busca el archivo donde se envía `postMessage` con `tipo: 'initRelease'`
2. Agrega `releaseUrl: window.location.href` al objeto del mensaje
3. Recarga la extensión

## Verificación
Después del cambio, cuando hagas clic en "Copy Snapshot", debería funcionar correctamente y copiar el JSON al portapapeles.
