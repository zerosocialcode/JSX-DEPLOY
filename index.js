#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import shell from 'shelljs';
import figlet from 'figlet';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
const __filename = fileURLToPath(import.meta.url);
const CURRENT_DIR = process.cwd();

// --- CLI INTERFACE ---
console.log(chalk.magenta(figlet.textSync('JSX-DEPLOY', { font: 'Standard' })));

program
  .version('1.0.0')
  .argument('<file>', 'The .jsx/.tsx file you want to convert')
  .argument('[output]', 'The name of the output folder (optional)')
  .action(async (filePath, outputName) => {
    await createDeployableProject(filePath, outputName);
  });

program.parse(process.argv);

// --- MAIN LOGIC ---
async function createDeployableProject(userFilePath, outputName) {
  const spinner = ora('Analyzing code...').start();
  
  // 1. Validation
  const fullPath = path.resolve(CURRENT_DIR, userFilePath);
  if (!fs.existsSync(fullPath)) {
    spinner.fail(chalk.red(`Error: File not found at ${fullPath}`));
    process.exit(1);
  }

  const fileNameNoExt = path.basename(userFilePath, path.extname(userFilePath));
  const projectName = outputName || `${fileNameNoExt}-app`;
  const projectPath = path.join(CURRENT_DIR, projectName);

  // 2. Prepare Project Directory
  if (fs.existsSync(projectPath)) {
    spinner.warn(chalk.yellow(`Warning: Directory "${projectName}" already exists. Overwriting...`));
    fs.removeSync(projectPath);
  }
  fs.mkdirSync(projectPath);
  
  try {
    // 3. Read & Patch User Code
    let userCode = fs.readFileSync(fullPath, 'utf-8');
    
    // Auto-patch: If no export is found, try to export the first component
    if (!userCode.includes('export default') && !userCode.includes('export const') && !userCode.includes('export function')) {
      const match = userCode.match(/function\s+([A-Z][a-zA-Z0-9]*)/) || userCode.match(/const\s+([A-Z][a-zA-Z0-9]*)/);
      if (match) {
        userCode += `\n\nexport default ${match[1]};`;
        spinner.text = `Patched missing export: ${match[1]}`;
      }
    }

    // 4. Create Directory Structure
    fs.ensureDirSync(path.join(projectPath, 'src'));
    fs.ensureDirSync(path.join(projectPath, 'public'));

    // Write the user's code to src/App.jsx
    fs.writeFileSync(path.join(projectPath, 'src', 'App.jsx'), userCode);

    // 5. dependency Analysis
    const detectedPackages = extractImports(userCode);
    
    // 6. Generate Configuration Files
    spinner.text = 'Generating config files (Vite, Netlify, Vercel)...';
    
    createViteConfig(projectPath);
    createIndexHtml(projectPath, projectName);
    createMainEntry(projectPath);
    createPackageJson(projectPath, projectName, detectedPackages);
    createNetlifyToml(projectPath); // For Netlify
    createVercelJson(projectPath);  // For Vercel
    createGitIgnore(projectPath);

    // 7. Install Dependencies
    spinner.text = chalk.blue('Installing dependencies (this may take a moment)...');
    shell.cd(projectPath);
    
    if (shell.exec('npm install', { silent: true }).code !== 0) {
      spinner.fail('Failed to install dependencies. Check your npm setup.');
      process.exit(1);
    }

    spinner.succeed(chalk.green('Project generated successfully!'));

    // 8. Final Instructions
    console.log(`\n${chalk.bold.green('Your deploy-ready project is here:')} ${chalk.cyan(projectPath)}`);
    console.log('\nTo test locally:');
    console.log(chalk.yellow(`  cd ${projectName}`));
    console.log(chalk.yellow('  npm run dev'));
    
    console.log('\nTo deploy to Netlify:');
    console.log(chalk.cyan('  1. Drag and drop the folder into Netlify Drop'));
    console.log(chalk.cyan('     OR'));
    console.log(chalk.cyan('  2. Push to GitHub and connect to Netlify (Build command is pre-configured)'));

  } catch (error) {
    spinner.fail('Critical Error');
    console.error(error);
  }
}

// --- HELPER FUNCTIONS ---

function extractImports(content) {
  const imports = new Set();
  const regex = /from ['"](.*)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    let pkg = match[1];
    if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
        const parts = pkg.split('/');
        // Handle scoped packages (@radix-ui/react-slot) vs regular (framer-motion)
        if (pkg.startsWith('@') && parts.length > 1) {
            pkg = `${parts[0]}/${parts[1]}`;
        } else {
            pkg = parts[0];
        }
        imports.add(pkg);
    }
  }
  return Array.from(imports);
}

function createPackageJson(root, name, extraDeps) {
  const deps = { "react": "^18.2.0", "react-dom": "^18.2.0" };
  
  // Add detected dependencies
  extraDeps.forEach(dep => {
    if (dep !== 'react' && dep !== 'react-dom') deps[dep] = "latest"; 
  });

  const json = {
    name: name,
    private: true,
    version: "1.0.0",
    type: "module",
    scripts: { 
      "dev": "vite", 
      "build": "vite build", 
      "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
      "preview": "vite preview" 
    },
    dependencies: deps,
    devDependencies: {
      "@types/react": "^18.2.66",
      "@types/react-dom": "^18.2.22",
      "@vitejs/plugin-react": "^4.2.1",
      "vite": "^5.2.0",
      "eslint": "^8.57.0",
      "eslint-plugin-react": "^7.34.1",
      "eslint-plugin-react-hooks": "^4.6.0",
      "eslint-plugin-react-refresh": "^0.4.6"
    }
  };
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(json, null, 2));
}

function createViteConfig(root) {
  const content = `import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react'; export default defineConfig({ plugins: [react()] });`;
  fs.writeFileSync(path.join(root, 'vite.config.js'), content);
}

function createNetlifyToml(root) {
  // This file tells Netlify exactly how to build the site and handle SPA routing
  const content = `
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;
  fs.writeFileSync(path.join(root, 'netlify.toml'), content);
}

function createVercelJson(root) {
  // Good to have if user chooses Vercel instead
  const content = {
    "rewrites": [{ "source": "/(.*)", "destination": "/" }]
  };
  fs.writeFileSync(path.join(root, 'vercel.json'), JSON.stringify(content, null, 2));
}

function createGitIgnore(root) {
  const content = `node_modules\ndist\n.DS_Store\n.env`;
  fs.writeFileSync(path.join(root, '.gitignore'), content);
}

function createIndexHtml(root, title) {
  const content = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;
  fs.writeFileSync(path.join(root, 'index.html'), content);
}

function createMainEntry(root) {
  // This wrapper ensures both default and named exports work seamlessly
  const content = `
import React from 'react'
import ReactDOM from 'react-dom/client'
import * as UserCode from './App.jsx'
import './index.css'

// LOGIC: Smartly find what to render
let App = UserCode.default;

// If no default export, look for the first named export that looks like a Component (Capitalized)
if (!App) {
  const keys = Object.keys(UserCode);
  const componentName = keys.find(k => /^[A-Z]/.test(k)); 
  if (componentName) {
    App = UserCode[componentName];
  }
}

if (!App) {
   // Fallback UI if patching failed
   App = () => <div style={{color:'red', padding:'20px'}}><h1>Export Error</h1><p>No suitable React component found in file.</p></div>
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;
  const cssContent = `
@tailwind base;
@tailwind components;
@tailwind utilities;

body { margin: 0; font-family: system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
`;

  fs.writeFileSync(path.join(root, 'src', 'main.jsx'), content);
  fs.writeFileSync(path.join(root, 'src', 'index.css'), cssContent);
}
