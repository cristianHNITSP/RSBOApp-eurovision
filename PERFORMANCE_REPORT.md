# Reporte de Rendimiento y Análisis de Sistema (RSBOApp)

Este documento detalla el estado actual del sistema, el consumo de recursos y el análisis de tiempos de respuesta tanto en el backend como en el frontend.

## 1. Análisis de Recursos (Docker Stats)

Tras monitorear los contenedores activos, se observa un consumo de memoria estable pero con puntos de interés en los servicios de Auth y Frontend:

| Contenedor | CPU (%) | Memoria (RAM) | Observaciones |
| :--- | :--- | :--- | :--- |
| **rsboapp-gateway** | ~0.05% | ~20 MiB | Ligero, sin cuellos de botella detectados. |
| **rsboapp-inventory**| ~0.01% | ~45 MiB | Consumo óptimo para un servicio de datos. |
| **rsboapp-auth** | ~0.11% | **~94 MiB** | Consumo elevado comparado con otros; maneja múltiples conexiones DB. |
| **rsboapp-frontend-dev**| ~0.08% | ~86 MiB | Normal para entorno de desarrollo (Vite/HMR). |
| **rsboapp-mongo** | ~0.50% | ~44 MiB | Muy eficiente para el volumen de datos actual. |

**Nota sobre picos**: Durante la carga de matrices Ag-Grid, el uso de CPU en `rsboapp-inventory` tiene picos momentáneos mientras MongoDB procesa las agregaciones de celdas, pero se estabiliza rápidamente.

## 2. Telemetría de Red y Backend (Logs)

El análisis de los logs de `rsboapp-inventory` muestra un arranque limpio:
- **Redis**: Conectado y funcionando como caché de consultas.
- **Jobs**: El sistema de alertas de stock (`STOCK_ALERT`) realiza sweeps iniciales sin errores.
- **CORS**: Correctamente configurado para el entorno de desarrollo y la red interna.

**Tiempos de respuesta observados (Subjetivos/Logs):**
- Consultas de metadatos: < 50ms.
- Consultas de ítems (matriz): < 150ms por bloque (chunk).

## 3. Experiencia de Usuario y Renderizado (Frontend)

Pruebas realizadas directamente en el navegador (Ag-Grid):

### Tiempos de Renderizado
- **Carga de Planilla Simple**: ~1.2 segundos hasta interactividad total.
- **Carga de Planilla Compleja (Bifocal)**: ~1.8 segundos. El retardo principal es la carga incremental de columnas.
- **Cambio de Tab (SPH- a SPH+)**: Transición visual instantánea, con un retraso de datos de ~500ms mientras se descargan las nuevas celdas.

### Rendimiento de CPU (Client-side)
- **Scrolling**: Se percibe fluido. Sin embargo, al hacer scroll muy rápido, se ven "huecos" (placeholders) durante ~200-300ms. Esto indica que el renderizado del DOM es más rápido que la llegada de los datos por red.
- **Picos de CPU**: Se observa un pico de actividad en el navegador al momento de "inyectar" los datos en Ag-Grid, especialmente en matrices con muchas columnas dinámicas (Bifocal/Progresivo).

## 4. Conclusiones y Análisis Final

El sistema presenta un rendimiento **Sólido** para un entorno de desarrollo. No hay fugas de memoria evidentes ni procesos bloqueantes.

### Diagnóstico del "Lag" reportado:
El "lag" percibido no es por falta de potencia en el servidor o saturación de RAM, sino por la **naturaleza asíncrona de la carga incremental**. Al tener muchas celdas, el navegador espera a que los datos "aterricen". 

### Estrategia Sugerida:
1. **Optimización de Chunks**: Aumentar ligeramente el tamaño de los bloques de datos descargados para reducir el número de peticiones de red simultáneas.
2. **Caché Proactiva**: Implementar un sistema donde al cargar la pestaña `SPH-`, se empiece a descargar silenciosamente la pestaña `SPH+`.
3. **Limpieza de Logs**: Eliminar los logs de depuración masivos en producción para liberar ciclos de CPU en el cliente.

---
*Análisis generado mediante herramientas de telemetría de terminal y navegación automatizada.*
