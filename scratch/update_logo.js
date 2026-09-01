const fs = require('fs');
const path = require('path');

const srcPath = 'C:/Users/LUCKY/.gemini/antigravity/brain/c0b9201d-d038-4e6c-a45e-887122382248/.user_uploaded/media_1788279357707.jpg';

const targets = [
  path.join(__dirname, '../assets/icon.png'),
  path.join(__dirname, '../assets/android-icon-foreground.png'),
  path.join(__dirname, '../assets/splash-icon.png'),
  path.join(__dirname, '../assets/adaptive-icon.png'),
];

if (fs.existsSync(srcPath)) {
  const data = fs.readFileSync(srcPath);
  for (const target of targets) {
    fs.writeFileSync(target, data);
    console.log(`Updated asset: ${target}`);
  }
  console.log('All logo assets successfully updated!');
} else {
  console.error('Source image not found at', srcPath);
}
