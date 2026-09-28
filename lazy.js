const fs = require('fs');

const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf-8');

const importRegex = /import\s+([A-Za-z0-9_]+)\s+from\s+['"](\.\/pages\/[^'"]+)['"];/g;
let newContent = content;

let match;
while ((match = importRegex.exec(content)) !== null) {
  const componentName = match[1];
  const importPath = match[2];
  
  // Replace the static import with a lazy import
  newContent = newContent.replace(match[0], `const ${componentName} = lazy(() => import('${importPath}'));`);
}

// Ensure lazy and Suspense are imported from React
if (!newContent.includes("import { lazy, Suspense } from 'react';")) {
  newContent = newContent.replace("import { BrowserRouter", "import { lazy, Suspense } from 'react';\nimport { BrowserRouter");
}

// Wrap <Routes> with Suspense if not already wrapped
if (!newContent.includes("<Suspense fallback")) {
  newContent = newContent.replace("<Routes>", "<Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Yükleniyor...</div>}>\n              <Routes>");
  newContent = newContent.replace("</Routes>", "</Routes>\n            </Suspense>");
}

fs.writeFileSync(path, newContent);
console.log('Done!');
