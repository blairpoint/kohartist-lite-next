const fs = require('fs');
let code = fs.readFileSync('src/components/DetailedProfileEditor.tsx', 'utf8');

// Replace standard fetch with api.put
code = code.replace(/const res = await fetch\('\/api\/profile\/'.*?\);/g, "const res = await fetch('/api/me');");

code = code.replace(/await fetch\('\/api\/profile', {[\s\S]*?body: JSON\.stringify\(profile\)[\s\S]*?}\);/g, `await api.put('/api/profile', profile);`);

code = code.replace(/const token = await user\.getIdToken\(\);/g, '');
code = code.replace(/headers: {[\s\S]*?Authorization: `Bearer \$\{token\}`[\s\S]*?},/g, '');

code = code.replace(/import { api } from '\.\.\/api';/, '');
code = `import { api } from '../api';\n` + code;

fs.writeFileSync('src/components/DetailedProfileEditor.tsx', code);
