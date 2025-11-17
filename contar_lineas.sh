

# Inicializamos totales
total_lines=0
total_comments=0

# Recorremos todos los archivos .vue excluyendo node_modules y archivos de configuración
for file in $(find . \
    \( -name "*.vue" -o -name "*.js" \) \
    ! -path "./node_modules/*" \
    ! -name "vue.config.js" \
    ! -name "vite.config.js" \
    ! -name "package*.json" \
    ! -name ".eslintrc.js" \
    ! -name ".prettierrc.js" \
    ! -name ".babelrc" \
); do

    # Contar todas las líneas del archivo
    lines=$(wc -l < "$file")
    # Contar comentarios: //, <!--, /* ... */
    comments=$(grep -E -c "^\s*//|^\s*/\*|^\s*\*|^\s*<!--" "$file")

    echo "$file -> Líneas: $lines, Comentarios: $comments"

    # Acumular totales
    total_lines=$((total_lines + lines))
    total_comments=$((total_comments + comments))
done

# Resumen final
echo "=============================="
echo "Total líneas: $total_lines"
echo "Total comentarios: $total_comments"

