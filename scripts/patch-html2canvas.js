import fs from 'fs';
import path from 'path';

const filesToPatch = [
  'node_modules/html2canvas/dist/html2canvas.esm.js',
  'node_modules/html2canvas/dist/html2canvas.js',
  'node_modules/html2canvas/lib/css/types/color.js',
];

const targetPattern = /if\s*\(\s*typeof\s+colorFunction\s*===\s*'undefined'\s*\)\s*\{\s*throw\s+new\s+Error\s*\(\s*"Attempting to parse an unsupported color function \\""\s*\+\s*value\.name\s*\+\s*"\\""\s*\);\s*\}/g;

const replacement = `if (typeof colorFunction === 'undefined') {
            try {
                if (typeof document !== 'undefined') {
                    var _canvas = document.createElement('canvas');
                    _canvas.width = 1; _canvas.height = 1;
                    var _ctx = _canvas.getContext('2d');
                    if (_ctx) {
                        var _str = value.name + '(' + value.values.map(function(t){ return (t && (t.text || (t.number !== undefined ? t.number : (t.value !== undefined ? t.value : '')))) || ''; }).join(' ') + ')';
                        _ctx.fillStyle = _str;
                        var _res = _ctx.fillStyle;
                        if (_res && _res.charAt(0) === '#') {
                            if (_res.length === 7) {
                                return pack(parseInt(_res.substring(1, 3), 16), parseInt(_res.substring(3, 5), 16), parseInt(_res.substring(5, 7), 16), 1);
                            }
                        } else if (_res && _res.indexOf('rgb') === 0) {
                            var _m = _res.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
                            if (_m) {
                                return pack(parseInt(_m[1], 10), parseInt(_m[2], 10), parseInt(_m[3], 10), _m[4] ? parseFloat(_m[4]) : 1);
                            }
                        }
                    }
                }
            } catch (_err) {}
            return 0;
        }`;

for (const relPath of filesToPatch) {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    if (targetPattern.test(content)) {
      content = content.replace(targetPattern, replacement);
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Successfully patched: ${relPath}`);
    } else {
      console.log(`Pattern not found or already patched: ${relPath}`);
    }
  } else {
    console.log(`File not found: ${relPath}`);
  }
}
