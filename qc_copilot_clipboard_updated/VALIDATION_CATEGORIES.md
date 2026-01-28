# QC Checks - Categorías de Validaciones

Este documento lista todas las validaciones de QC Checks y sus categorías correspondientes.

## Categoría: Metadata

### Release Information
- **Release previously rejected** - Release que fue rechazado previamente
- **Version Tag Detected** - Campo Version detectado en el release
- **Language at release** - Idioma del release (Turkish/Vietnamese)
- **Cover Art** - Imagen de portada

### Track Information
- **Track Version Tag Detected** - Campo Version detectado en tracks específicos
- **Language in track** - Idioma del track (Turkish/Vietnamese)
- **Track duration >= 20min** - Duración del track ≥ 20 minutos
- **Track duration <= 30s** - Duración del track ≤ 30 segundos
- **Track duration 00:00:00** - El reproductor muestra 00:00:00 (posible pista sin audio o mal cargada)
- **Composer format invalid** - Compositor sin formato de nombre + apellido
- **Lyricist format invalid** - Letrista sin formato de nombre + apellido
- **Tracks in alphabetical order** - Tracks en orden alfabético
- **≥80% of tracks between 1:00 and 1:59** - Patrón de tracks cortos

### Content Analysis
- **Potential mashup detected** - Posible mashup detectado (formato "Title X Title")
- **Release Title matches top song** - Título del release coincide con canción famosa
- **Track matches top song** - Título del track coincide con canción famosa
- **Explicit content detected** - Contenido explícito detectado

## Categoría: User

### User Profile
- **User has Strikes** - Usuario tiene strikes previos (F1, F2, etc.)
- **User not verified** - Usuario no verificado
- **User has Zendesk ticket(s)** - Usuario tiene tickets de soporte abiertos o históricos

### User History
- **Match with Blacklisted Email** - Email coincide con lista negra
- **Match with Blacklisted Artist** - Artista coincide con lista negra
- **Match with Blacklisted Label** - Label coincide con lista negra
- **Match with Curated Artist** - Artista coincide con lista curada
- **Suspicious email domain detected** - Dominio de email sospechoso (ProtonMail, Tutanota, etc.)

## Categoría: Audio

### Audio Analysis
- **Audio matches found** - Coincidencias de audio encontradas
- **Audio matches in tracks** - Coincidencias de audio en tracks específicos
- **Suspicious audio matches detected** - Coincidencias de audio sospechosas
- **Audio title very similar** - Título de audio muy similar (80%+ similitud)
- **Audio title moderately similar** - Título de audio moderadamente similar (60-79% similitud)
- **Audio title different** - Título de audio completamente diferente
- **Audio artist very similar** - Artista de audio muy similar (80%+ similitud)
- **Audio artist moderately similar** - Artista de audio moderadamente similar (60-79% similitud)
- **Audio artists different** - Artistas de audio completamente diferentes
- **Audio additional artists** - Artistas adicionales detectados
- **Audio analysis consolidated** - Resultados consolidados de análisis de audio

### Audio Quality
- **No tracks found** - No se encontraron tracks
- **Tracks between 1:00 and 1:59** - Patrón de tracks cortos

### Audio Analysis Results
- **Score 100%** - Score del 100% (coincidencia perfecta de audio)
- **Similar title** - Título similar detectado
- **Similar title but different artist** - Título similar pero artista diferente
- **Similar artist** - Nombre de artista similar detectado
- **Title matches curated artist** - Título coincide con artista curado
- **Artist matches curated artist** - Artista coincide con artista curado

## Categoría: Tenant Information

### Tenant Data
- **Tenant Considerations** - Consideraciones específicas del tenant (desde Google Sheets)
- **Tenant Fraud Points** - Puntos de fraude del tenant y posición en ranking

## Categoría: System Status

### Analysis Status
- **Zendesk Tickets: Searching** - Búsqueda de tickets de Zendesk en progreso
- **Audio Analysis: In Progress** - Análisis de audio en progreso
- **Audio Analysis: Disabled** - Análisis de audio deshabilitado
- **Important modals open** - Modales importantes abiertos (bloquea análisis de audio)

## Results de Audio Analysis

### Estructura Simplificada
Cada track con alertas de audio muestra:
- **Track Info**: Información del track original para comparación
- **Results**: Lista plana de todos los results individuales detectados
- **Sin agrupación por fragmentos**: Todos los results se muestran al mismo nivel

### Estructura de Results
Cada result individual incluye:
- **Index**: Número secuencial del result
- **Title**: Título del result detectado
- **Artist**: Artista(s) del result
- **Album**: Álbum del result
- **Score**: Porcentaje de similitud del result (0-100%)
- **Alerts**: Alertas específicas del result

### Tipos de Alertas de Results
- **score_100**: Score del 100%
- **title_similar**: Título similar al track original
- **title_similar_artist_different**: Título similar pero artista diferente
- **multiple_artists**: Múltiples artistas detectados
- **high_score_different_title**: Score alto pero título diferente
- **album_info**: Información de álbum disponible

### Visualización en la Tabla
- **Fila del track**: Muestra la información del track original para comparación
- **Filas de results**: Cada result individual aparece como una fila separada
- **Filtrado de duplicados**: Solo se omiten results con datos idénticos en todos los campos
- **Estructura plana**: No hay agrupación jerárquica por fragmentos

## Notas Importantes

1. **Fragmentos Duplicados**: Solo se consideran duplicados cuando TODOS los campos (título, álbum, score, artistas y alertas) son idénticos.

2. **Categorización**: Las validaciones se categorizan automáticamente basándose en palabras clave en el mensaje.

3. **Prioridad de Colores**: 
   - 🔴 **Red**: Crítico (requiere atención inmediata)
   - 🟡 **Yellow**: Advertencia (requiere revisión)

4. **Audio Analysis**: Los resultados detallados de audio analysis se muestran en una tabla separada con información completa de cada fragmento detectado.

5. **Sistema de Control**: La herramienta incluye un sistema de control para habilitar/deshabilitar el análisis de audio en tiempo real.

6. **Detección de Modales**: El sistema detecta automáticamente cuando hay modales importantes abiertos y pausa el análisis de audio para evitar conflictos.

## Cambios Recientes

- **CORREGIDO**: "Release previously rejected" ahora aparece en categoría "Metadata" en lugar de "User"
- **MEJORADO**: Sistema de alertas de fragmentos más detallado y estructurado
- **OPTIMIZADO**: Filtrado de duplicados más inteligente que permite fragments con diferencias
- **NUEVO**: Sistema de análisis de audio optimizado con análisis paralelo masivo
- **NUEVO**: Validaciones de tenant information (considerations y fraud points)
- **NUEVO**: Sistema de control de análisis de audio en tiempo real
- **NUEVO**: Detección automática de modales importantes para evitar conflictos
- **NUEVO**: Validaciones de dominios de email sospechosos
- **NUEVO**: Sistema de highlighting mejorado para localizar elementos en la página
