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

const rootMatch = tokensContent.match(/:root\s*\{([\s\S]*?)\}/);
let rootContent = rootMatch ? rootMatch[1] : '';

const colorToVar = {};
const varRegex = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
let match;
while ((match = varRegex.exec(rootContent)) !== null) {
  const varName = match[1];
  let val = match[2].trim().toLowerCase();
  colorToVar[val] = varName;
}

function normalizeColor(c) {
  c = c.toLowerCase().trim();
  return c.replace(/\s+/g, '');
}

// Actualizamos los tokens con versión normalizada para facilitar búsquedas
Object.keys(colorToVar).forEach(key => {
    colorToVar[normalizeColor(key)] = colorToVar[key];
});

const files = getCssFiles(path.join(__dirname, 'src'));
let newTokens = '';
let newVarsCount = 0;
let replacedCount = 0;

const colorRegex = /(#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|rgba?\([^)]+\)|hsla?\([^)]+\))/gi;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  let lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
      // Ignorar data URIs de SVG que a veces usan colores hexadecimales
      if (lines[i].includes('data:image')) continue;
      
      lines[i] = lines[i].replace(colorRegex, (fullMatch) => {
        const norm = normalizeColor(fullMatch);
        let varName = colorToVar[norm];
        
        if (!varName) {
          // Si el color no existe, creamos un nombre seguro para la variable
          let slug = norm.replace(/[^a-z0-9]/g, '-').replace(/^-+|-+$/g, '');
          varName = `--color-${slug}`;
          
          let counter = 1;
          let testName = varName;
          while (Object.values(colorToVar).includes(testName)) {
            testName = `${varName}-${counter}`;
            counter++;
          }
          varName = testName;
          colorToVar[norm] = varName;
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
  tokensContent = tokensContent.replace(/(:root\s*\{[\s\S]*?)(\n\})/, `$1\n  /* Colores extraídos automáticamente */\n${newTokens}$2`);
  fs.writeFileSync(tokensPath, tokensContent, 'utf8');
}

console.log(`OK. Reemplazos en CSS: ${replacedCount}. Nuevas variables en tokens.css: ${newVarsCount}.`);
