const fs = require('fs');
const path = require('path');
const filePath = path.join('app', 'page-html.ts');
let content = fs.readFileSync(filePath, 'utf8');
const startMarker = '\n/* Script page Paramètres déplacé';
const endMarker = '\n}\n\nexport interface OptionsPageParametres';
const i0 = content.indexOf(startMarker);
const i1 = content.indexOf(endMarker);
if (i0 === -1 || i1 === -1) {
  console.error('Markers not found', { i0, i1 });
  process.exit(1);
}
content = content.slice(0, i0) + content.slice(i1);
fs.writeFileSync(filePath, content);
console.log('Removed dead code block');
