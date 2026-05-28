#!/bin/bash

echo "=== Detectando colores hardcodeados (hex, rgb, rgba, hsl, hsla) ==="
echo "Analizando archivos .css en rsbo-app/src..."
echo ""
echo "Cantidad | Archivo"
echo "--------------------------------------------------------"

# Busca los colores, cuenta por archivo y los ordena de mayor a menor cantidad
grep -rnE '(#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|rgba?\([^)]+\)|hsla?\([^)]+\))' --include="*.css" rsbo-app/src | awk -F: '{print $1}' | sort | uniq -c | sort -nr

echo "--------------------------------------------------------"
echo "Análisis completado."
