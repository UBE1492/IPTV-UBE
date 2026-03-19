# IPTV-UBE

Automatización de listas IPTV enfocada en contenido de Perú.

## Características

- **Fuentes Seleccionadas**: Enfoque en canales peruanos (Premium, Deportes, Generales).
- **Verificación en Tiempo Real**: Sistema de pool de trabajadores (10 hilos) para verificar señales activas.
- **Procesamiento Paralelo**: Descarga de fuentes y EPG de forma concurrente para mayor velocidad.
- **Formatos de Salida**: M3U, TXT, XML (EPG) y JSON (TvBox).

## Cómo empezar

1.  Instala las dependencias:
    ```bash
    npm install
    ```
2.  Genera las listas:
    ```bash
    npm run m3u
    ```
3.  Los resultados aparecerán en la carpeta `m3u/`.

## Licencia

MIT
