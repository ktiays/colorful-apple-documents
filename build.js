const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const buildDir = 'dist';
const zipName = 'colorful-apple-documents.zip';

function ensureBuildDir() {
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
  }
}

function copyFiles() {
  const filesToCopy = [
    'manifest.json',
    'background.js',
    'main.js',
    'styles.css',
    'override.css'
  ];

  filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(buildDir, file));
      console.log(`Copied ${file}`);
    }
  });

  if (fs.existsSync('icons')) {
    const iconsDir = path.join(buildDir, 'icons');
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir);
    }
    
    const iconFiles = fs.readdirSync('icons');
    iconFiles.forEach(icon => {
      fs.copyFileSync(path.join('icons', icon), path.join(iconsDir, icon));
      console.log(`Copied icons/${icon}`);
    });
  }
}

function createZip() {
  try {
    const zipPath = path.join(buildDir, zipName);
    execSync(`cd ${buildDir} && zip -r ${zipName} . -x ${zipName}`, { stdio: 'inherit' });
    const stats = fs.statSync(zipPath);
    console.log(`Created ${zipPath} (${stats.size} bytes)`);
  } catch (error) {
    throw new Error(`Failed to create zip: ${error.message}`);
  }
}

function clean() {
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
  }
}

function build() {
  try {
    console.log('Building Colorful Apple Documents extension...');
    
    clean();
    ensureBuildDir();
    copyFiles();
    createZip();
    
    console.log('Build completed successfully!');
    console.log(`Build artifacts available in ${buildDir}/`);
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  build();
}

module.exports = { build, clean };