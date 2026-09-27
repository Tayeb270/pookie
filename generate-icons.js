/**
 * Generates valid PNG icons (192x192 and 512x512) for PWA installation using native Node.js zlib.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCheck = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCheck), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPNG(size) {
  const width = size;
  const height = size;
  const rawData = Buffer.alloc((width * 4 + 1) * height);

  const cx = width / 2;
  const cy = height / 2;
  const r = width * 0.44;

  let pos = 0;
  for (let y = 0; y < height; y++) {
    rawData[pos++] = 0; // Filter byte: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Squircle background corner calculation
      const cornerR = width * 0.22;
      const qx = Math.max(0, Math.abs(dx) - (cx - cornerR));
      const qy = Math.max(0, Math.abs(dy) - (cy - cornerR));
      const isInsideApp = Math.sqrt(qx * qx + qy * qy) <= cornerR;

      if (!isInsideApp) {
        // Transparent outside rounded icon
        rawData[pos++] = 0;
        rawData[pos++] = 0;
        rawData[pos++] = 0;
        rawData[pos++] = 0;
        continue;
      }

      // Pastel Pink Gradient: #ffd0e3 to #ee82ad
      const gradFactor = y / height;
      let pr = Math.round(255 - gradFactor * 17);
      let pg = Math.round(208 - gradFactor * 78);
      let pb = Math.round(227 - gradFactor * 54);

      // Cute bunny face center
      const bdx = x - cx;
      const bdy = y - (cy + height * 0.08);
      const bDist = Math.sqrt(bdx * bdx + (bdy * 1.1) * (bdy * 1.1));

      // Bunny ears
      const ear1Dx = x - (cx - width * 0.14);
      const ear1Dy = y - (cy - height * 0.18);
      const ear1Dist = Math.sqrt((ear1Dx * 1.6) * (ear1Dx * 1.6) + ear1Dy * ear1Dy);

      const ear2Dx = x - (cx + width * 0.14);
      const ear2Dy = y - (cy - height * 0.18);
      const ear2Dist = Math.sqrt((ear2Dx * 1.6) * (ear2Dx * 1.6) + ear2Dy * ear2Dy);

      const isBunny = bDist < width * 0.24 || ear1Dist < width * 0.2 || ear2Dist < width * 0.2;
      const isEarInner1 = ear1Dist < width * 0.12 && ear1Dy > -width * 0.16;
      const isEarInner2 = ear2Dist < width * 0.12 && ear2Dy > -width * 0.16;

      // Eyes
      const eye1 = Math.hypot(x - (cx - width * 0.1), y - (cy + height * 0.05));
      const eye2 = Math.hypot(x - (cx + width * 0.1), y - (cy + height * 0.05));
      const isEye = eye1 < width * 0.024 || eye2 < width * 0.024;

      // Blush
      const blush1 = Math.hypot(x - (cx - width * 0.16), y - (cy + height * 0.1));
      const blush2 = Math.hypot(x - (cx + width * 0.16), y - (cy + height * 0.1));
      const isBlush = blush1 < width * 0.035 || blush2 < width * 0.035;

      // Nose
      const nose = Math.hypot(x - cx, y - (cy + height * 0.09));
      const isNose = nose < width * 0.016;

      if (isEye) {
        rawData[pos++] = 74;  // #4a
        rawData[pos++] = 59;  // #3b
        rawData[pos++] = 67;  // #43
        rawData[pos++] = 255;
      } else if (isNose) {
        rawData[pos++] = 238; // #ee82ad
        rawData[pos++] = 130;
        rawData[pos++] = 173;
        rawData[pos++] = 255;
      } else if (isBlush) {
        rawData[pos++] = 255; // #ff9fc5
        rawData[pos++] = 159;
        rawData[pos++] = 197;
        rawData[pos++] = 255;
      } else if (isEarInner1 || isEarInner2) {
        rawData[pos++] = 255; // #ffd0e3
        rawData[pos++] = 208;
        rawData[pos++] = 227;
        rawData[pos++] = 255;
      } else if (isBunny) {
        rawData[pos++] = 255; // White
        rawData[pos++] = 255;
        rawData[pos++] = 255;
        rawData[pos++] = 255;
      } else {
        rawData[pos++] = pr;
        rawData[pos++] = pg;
        rawData[pos++] = pb;
        rawData[pos++] = 255;
      }
    }
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT Chunk
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.join(__dirname, 'icons');
fs.writeFileSync(path.join(outDir, 'icon-192.png'), createPNG(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), createPNG(512));
console.log('✅ Generated icons/icon-192.png and icons/icon-512.png successfully!');
