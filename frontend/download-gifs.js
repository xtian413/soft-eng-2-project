const fs = require('fs');
const path = require('path');
const https = require('https');

const CSV_PATH = path.join(__dirname, 'assets', 'exercises.csv');
const GIFS_DIR = path.join(__dirname, 'assets', 'gifs');
const MAP_FILE_PATH = path.join(__dirname, 'src', 'api', 'localGifs.ts');

const EXCLUDED_EQUIPMENT = [].map(s => s.toLowerCase().trim());

// Create gifs directory if it doesn't exist
if (!fs.existsSync(GIFS_DIR)) {
  fs.mkdirSync(GIFS_DIR, { recursive: true });
}

// Helper to make HTTPS requests with headers
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };
    https.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Status ${res.statusCode}`));
        return;
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

// Helper to download a file
function downloadFile(url, destPath) {
  const tmpPath = `${destPath}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
  return new Promise((resolve, reject) => {
    let file;
    try {
      file = fs.createWriteStream(tmpPath);
    } catch (e) {
      reject(e);
      return;
    }
    
    file.on('error', (err) => {
      file.close();
      if (fs.existsSync(tmpPath)) {
        try { fs.unlinkSync(tmpPath); } catch (e) {}
      }
      reject(err);
    });

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/gif,image/*;q=0.8,*/*;q=0.5',
        'Referer': 'https://github.com/'
      },
      timeout: 15000
    };

    https.get(url, options, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(tmpPath)) {
          try { fs.unlinkSync(tmpPath); } catch (e) {}
        }
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(tmpPath)) {
        try { fs.unlinkSync(tmpPath); } catch (e) {}
      }
      reject(err);
    });
  }).then(() => {
    if (fs.existsSync(tmpPath)) {
      fs.renameSync(tmpPath, destPath);
    }
  });
}

// Simple CSV parser
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  
  const source = text.replace(/^\uFEFF/, '');
  
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    
    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }
    
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    
    if (char === '\r') continue;
    field += char;
  }
  
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  
  return rows;
}

// Write the mapping file
function generateMappingFile() {
  console.log('Generating mapping file src/api/localGifs.ts...');
  const files = fs.readdirSync(GIFS_DIR)
    .filter(file => file.endsWith('.gif'))
    .map(file => file.replace('.gif', ''))
    .sort();
    
  let fileContent = `// This file is auto-generated. Do not edit manually.
export const LOCAL_GIFS: Record<string, any> = {
`;
  files.forEach(id => {
    fileContent += `  "${id}": require("../../assets/gifs/${id}.gif"),\n`;
  });
  fileContent += `};\n`;
  
  fs.writeFileSync(MAP_FILE_PATH, fileContent, 'utf8');
  console.log(`Successfully mapped ${files.length} GIFs in ${MAP_FILE_PATH}`);
}

// Execute
(async () => {
  try {
    console.log('Fetching exercise dataset metadata from GitHub...');
    const jsonUrl = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json';
    const jsonText = await fetchUrl(jsonUrl);
    const gitExercises = JSON.parse(jsonText);
    
    console.log(`Successfully loaded ${gitExercises.length} exercises metadata from GitHub.`);
    
    // Map ID -> Suffix filename
    const idToFilename = new Map();
    gitExercises.forEach(ex => {
      // Find suffix filename from values (image, video, etc.)
      const id = ex.id;
      let filename = null;
      
      Object.values(ex).forEach(val => {
        if (typeof val === 'string') {
          // Look for pattern "0001-xxxxx.gif" or "0001-xxxxx.jpg"
          const match = val.match(/(\d{4}-.+)\.(gif|jpg)/);
          if (match) {
            filename = `${match[1]}.gif`;
          }
        }
      });
      
      if (id && filename) {
        idToFilename.set(id, filename);
      }
    });
    
    console.log(`Mapped ${idToFilename.size} exercises to media filenames.`);
    
    // Load local CSV
    console.log('Reading local exercises.csv...');
    if (!fs.existsSync(CSV_PATH)) {
      console.error(`Error: exercises.csv not found at ${CSV_PATH}`);
      process.exit(1);
    }
    
    const csvText = fs.readFileSync(CSV_PATH, 'utf8');
    const rows = parseCsv(csvText);
    const [header, ...dataRows] = rows;
    const normalizedHeader = header.map(item => item.trim());
    
    const equipmentIdx = normalizedHeader.indexOf('equipment');
    const idIdx = normalizedHeader.indexOf('id');
    const nameIdx = normalizedHeader.indexOf('name');
    
    const downloadQueue = [];
    dataRows.forEach(row => {
      if (row.length < 2) return;
      const eq = row[equipmentIdx]?.toLowerCase().trim();
      const id = row[idIdx]?.trim();
      const name = row[nameIdx]?.trim();
      
      if (!id || !eq) return;
      
      const isExcluded = EXCLUDED_EQUIPMENT.some(ex => eq.includes(ex) || ex.includes(eq));
      if (!isExcluded) {
        downloadQueue.push({ id, name, equipment: eq });
      }
    });
    
    console.log(`Total exercises to download: ${downloadQueue.length} (Excluded: ${dataRows.length - downloadQueue.length})`);
    console.log('Starting sequential downloads with 200ms delay...');
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < downloadQueue.length; i++) {
      const item = downloadQueue[i];
      const destPath = path.join(GIFS_DIR, `${item.id}.gif`);
      
      // Skip if already exists
      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
        successCount++;
        continue;
      }
      
      const filename = idToFilename.get(item.id);
      if (!filename) {
        failCount++;
        console.error(`[${i + 1}/${downloadQueue.length}] FAILED ${item.id} - ${item.name}: No matching GitHub filename found.`);
        continue;
      }
      
      const gitUrl = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/${filename}`;
      try {
        await downloadFile(gitUrl, destPath);
        successCount++;
        console.log(`[${i + 1}/${downloadQueue.length}] Downloaded ${item.id} - ${item.name} (${item.equipment})`);
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        failCount++;
        console.error(`[${i + 1}/${downloadQueue.length}] FAILED ${item.id} - ${item.name}: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\nDownloads complete.`);
    console.log(`Successfully processed: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    
    generateMappingFile();
    console.log('\nAll set! You can compile and run the app.');
  } catch (error) {
    console.error('Fatal error in downloader:', error.message);
  }
})();
