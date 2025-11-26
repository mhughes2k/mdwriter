const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'marked', 'marked.min.js');
const destDir = path.join(__dirname, '..', 'src', 'renderer');
const dest = path.join(destDir, 'marked.min.js');

fs.access(src, fs.constants.R_OK, (err) => {
  if (err) {
    console.log('Marked not installed yet');
    return;
  }

  // Ensure destination directory exists
  fs.mkdir(destDir, { recursive: true }, (mkErr) => {
    if (mkErr) {
      console.error('Failed to create destination directory for marked:', mkErr.message);
      return;
    }

    const readStream = fs.createReadStream(src);
    const writeStream = fs.createWriteStream(dest);

    readStream.on('error', (e) => console.error('Error reading marked:', e.message));
    writeStream.on('error', (e) => console.error('Error writing marked:', e.message));
    writeStream.on('finish', () => console.log('Copied marked.min.js to src/renderer'));

    readStream.pipe(writeStream);
  });
});
