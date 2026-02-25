const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join('app', 'page-html.ts'), 'utf8');
const start = src.indexOf('<script>') + '<script>'.length;
const end = src.indexOf('</script>', start);
let script = src.slice(start, end);
// Remove // #region agent log ... // #endregion blocks (and the IIFE on same line or next)
script = script.replace(/\s*\/\/ #region agent log\s*\n\s*\(function\(\)\{var p=\{sessionId:[^}]+\}[^)]+\)\(\}\);\s*\n\s*\/\/ #endregion\s*/g, '\n    ');
// Remove button bind block: var allWithId ... parentChain ... debug IIFE ... (keep var btn and if (btn) addEventListener)
script = script.replace(/\s*var allWithId = document\.querySelectorAll\('#bouton-test-connexion'\);\s*\n\s*var parentChain = \[\];\s*\n\s*var p = btn;\s*\n\s*for \(var i = 0; i < 8 && p; i\+\+\) \{[^}]+\}\s*\n\s*\/\/ #region agent log[\s\S]*?\/\/ #endregion\s*\n\s*/g, '\n      ');
const scriptsDir = path.join('app', 'scripts');
fs.mkdirSync(scriptsDir, { recursive: true });
fs.writeFileSync(path.join(scriptsDir, 'parametres.js'), script.trim(), 'utf8');
console.log('parametres.js written');
