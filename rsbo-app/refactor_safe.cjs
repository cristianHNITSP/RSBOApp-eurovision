const fs = require('fs');
const path = require('path');

function getCssFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getCssFiles(filePath, fileList);
    } else if (filePath.endsWith('.css') && !filePath.includes('tokens.css')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const tokensPath = path.join(__dirname, 'src/assets/css/tokens.css');
let tokensContent = fs.readFileSync(tokensPath, 'utf8');

const colorToStaticVar = {};
const files = getCssFiles(path.join(__dirname, 'src'));

let newTokens = '';
let newVarsCount = 0;
let replacedCount = 0;

function normalizeColor(c) {
  return c.toLowerCase().trim().replace(/\s+/g, '');
}

const colorRegex = /(#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|rgba?\([^)]+\)|hsla?\([^)]+\))/gi;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  let lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('data:image')) continue; // Ignorar base64/SVGs
      
      lines[i] = lines[i].replace(colorRegex, (fullMatch) => {
        const norm = normalizeColor(fullMatch);
        let varName = colorToStaticVar[norm];
        
        if (!varName) {
          // Crear variable ESTÁTICA que no se rompe en modo oscuro
          let slug = norm.replace(/[^a-z0-9]/g, '-').replace(/^-+|-+$/g, '');
          varName = `--static-color-${slug}`;
          
          let counter = 1;
          let testName = varName;
          while (Object.values(colorToStaticVar).includes(testName)) {
            testName = `${varName}-${counter}`;
            counter++;
          }
          varName = testName;
          colorToStaticVar[norm] = varName;
          newTokens += `  ${varName}: ${fullMatch};\n`;
          newVarsCount++;
        }
        
        replacedCount++;
        changed = true;
        return `var(${varName})`;
      });
  }

  if (changed) {
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
  }
});

if (newTokens) {
  tokensContent = tokensContent.replace(/(:root\s*\{[\s\S]*?)(\n\})/, `$1\n\n  /* --- COLORES ESTÁTICOS EXTRAÍDOS MASIVAMENTE --- */\n  /* Estos colores mantienen su valor en ambos modos. Cambiarlos gradualmente a variables semánticas (ej. --bg-base) */\n${newTokens}$2`);
  fs.writeFileSync(tokensPath, tokensContent, 'utf8');
}

console.log(`¡Refactor seguro completado! Reemplazos: ${replacedCount}. Variables estáticas creadas: ${newVarsCount}.`);
