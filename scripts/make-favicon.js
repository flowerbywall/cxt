/**
 * The site favicon: a grey C ring.
 *
 * The shape is a 300-degree arc with a 30-degree gap at 3 o'clock, stroke 6
 * units on a 100-unit field. It is 陈小天's initial drawn as geometry rather
 * than set as type: the character collapses into mush at 16px, the arc does
 * not, and the gap is what stops it reading as a filled disc in a tab.
 *
 * The ink is not chosen here. It is read out of global.css's light theme at
 * run time, so the icon is the site's own --element-tertiary-color by
 * construction and cannot disagree with the page it belongs to. Today that is
 * #6e6c68, checked below at 5.15:1 on a light tab and 3.61:1 on a dark one;
 * the black this site shipped for a while measures 1.27:1 on a dark tab,
 * which is to say invisible there.
 *
 * That check is not a build step. This script is run by hand (`npm run
 * favicon`), so the icon can still be forgotten when the theme moves -- and
 * it was: the rasters sat on #6c6c74 for a while after the tertiary grey
 * became #6e6c68. Re-run it whenever that token changes.
 *
 * SVG is the single source of truth for the geometry: every raster size
 * below is sharp rendering this one string, so the sizes cannot drift apart.
 * Editing a PNG directly is not supported.
 *
 * PNG for modern browsers, ICO with a real alpha channel for older ones
 * (the ring's transparency has to survive, so the ICO is packed from the
 * rendered 32px pixels rather than drawn by hand), and apple-touch-icon,
 * which is what a phone uses when the site is added to the home screen --
 * that one must stay opaque, since iOS masks it into a rounded square and
 * paints transparency black.
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.resolve(__dirname, '../public');
fs.mkdirSync(PUB, { recursive: true });

const css = fs.readFileSync(path.resolve(__dirname, '../src/styles/global.css'), 'utf8');
const tertiary = css.match(/:root\s*\{[^}]*--element-tertiary-color:\s*(#[0-9a-fA-F]{6})/);
if (!tertiary) throw new Error('could not find --element-tertiary-color in the light theme');
const hex = tertiary[1].toLowerCase();
const SIZES = [16, 32, 48];
const APPLE = 180;

/**
 * Centre (50,50), radius 40, stroke 6. The outer edge of the stroke lands at
 * 50 + 40 + 3 = 93, so 7 units of air on each side: enough that the arc is
 * never clipped at any size, tight enough that it fills the square.
 *
 * The two endpoints sit at 88.64, 60.35 and 88.64, 39.65 -- 15 degrees below
 * and above the 3 o'clock line -- which is where the 30-degree gap comes
 * from. large-arc-flag 1 draws the long way round, so what is left out is
 * the gap, not the arc.
 */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <path d="M 88.64 60.35 A 40.0 40.0 0 1 1 88.64 39.65" fill="none" stroke="${hex}" stroke-width="6" stroke-linecap="round"/>
</svg>
`;

// Keep the vector source next to the rasters it produced, so the geometry can
// be edited later without reverse-engineering it out of a PNG.
fs.writeFileSync(path.join(PUB, 'logo.svg'), SVG);

/** Transparent-background ring, for every slot that supports alpha. */
function pngRing(size) {
  return sharp(Buffer.from(SVG), { density: Math.ceil((size * 72) / 100) })
    .resize(size, size, { fit: 'contain' })
    .png();
}

/** Same ring on white, for the slot iOS renders on an opaque rounded square. */
function pngRingOpaque(size) {
  return sharp(Buffer.from(SVG), { density: Math.ceil((size * 72) / 100) })
    .resize(size, size, { fit: 'contain' })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png();
}

/**
 * ICO with a real 32bpp alpha channel, packed from rendered RGBA pixels.
 * BMP-in-ICO: XOR holds BGRA rows bottom-up, the AND mask stays all zero
 * because the alpha byte already carries the transparency.
 */
function icoFromRgba(rgba, n) {
  const xorSize = n * n * 4;
  const andStride = ((n + 31) >> 5) << 2;
  const andSize = andStride * n;
  const dataSize = 40 + xorSize + andSize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  const dir = Buffer.alloc(16);
  dir[0] = n; dir[1] = n;
  dir.writeUInt16LE(1, 4); dir.writeUInt16LE(32, 6);
  dir.writeUInt32LE(dataSize, 8); dir.writeUInt32LE(22, 12);
  const bih = Buffer.alloc(40);
  bih.writeUInt32LE(40, 0); bih.writeInt32LE(n, 4); bih.writeInt32LE(n * 2, 8);
  bih.writeUInt16LE(1, 12); bih.writeUInt16LE(32, 14);
  bih.writeUInt32LE(xorSize + andSize, 20);

  const xor = Buffer.alloc(xorSize);
  for (let y = 0; y < n; y++) {
    const src = y * n * 4;                    // sharp's rows are top-down
    const dst = (n - 1 - y) * n * 4;          // BMP rows are bottom-up
    for (let x = 0; x < n; x++) {
      const s = src + x * 4, d = dst + x * 4;
      xor[d] = rgba[s + 2]; xor[d + 1] = rgba[s + 1]; xor[d + 2] = rgba[s]; xor[d + 3] = rgba[s + 3];
    }
  }
  return Buffer.concat([header, dir, bih, xor, Buffer.alloc(andSize)]);
}

/* WCAG relative luminance, used to assert the ink clears 3:1 on both tabs. */
function luminance(hexStr) {
  const ch = [1, 3, 5].map((i) => parseInt(hexStr.substr(i, 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* The two tab colours Base.astro declares in its theme-color metas. */
const TABS = { light: '#fdfdfc', dark: '#111110' };

(async () => {
  // the ink has to be visible on both tabs, which is the whole reason it is
  // the site's tertiary grey rather than black
  for (const [name, tab] of Object.entries(TABS)) {
    const r = contrast(hex, tab);
    if (r < 3) throw new Error(`${hex} on a ${name} tab is ${r.toFixed(2)}:1, below the 3:1 line`);
    console.log(`verified: ${hex} on ${name} tab ${tab} = ${r.toFixed(2)}:1 (>= 3:1)`);
  }

  for (const s of SIZES) {
    await pngRing(s).toFile(path.join(PUB, `favicon-${s}.png`));
  }
  // apple-touch-icon: what a phone uses when the site is added to the home
  // screen. It must be opaque -- iOS masks it into a rounded square itself
  // and renders transparent areas as black.
  await pngRingOpaque(APPLE).toFile(path.join(PUB, 'apple-touch-icon.png'));

  // the ICO carries the ring's own alpha, packed from the rendered pixels
  const { data: rgba32 } = await sharp(path.join(PUB, 'favicon-32.png'))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  fs.writeFileSync(path.join(PUB, 'favicon.ico'), icoFromRgba(rgba32, 32));
  const ico = fs.readFileSync(path.join(PUB, 'favicon.ico'));
  if (ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1) throw new Error('not an ICO');
  if (ico.readUInt16LE(4) !== 1) throw new Error('expected exactly one image');
  if (ico.readUInt32LE(14) !== 40 + 32 * 32 * 4 + 128) throw new Error('bad ICO data size');
  console.log('verified: favicon.ico header, dims, 32bpp, alpha preserved');

  // re-read every written PNG. Two invariants:
  //
  //  - no stray colour. The ink is the theme's tertiary grey (#6e6c68,
  //    channel spread 6), and the rasteriser's sub-pixel
  //    coverage pushes partial-alpha pixels a little off neutral, so the
  //    assertion cannot be "equals the ink exactly". What it can be is
  //    "never a third hue" -- if the SVG ever picked up a colour it should
  //    not have, the spread opens up here and the run fails. Below ~32/255
  //    the un-premultiplication is pure rounding noise, so those pixels
  //    count as coverage and are left alone.
  //  - the mark's body is the site's own grey. At 16px the 6-unit stroke is
  //    thin enough that no pixel reaches full opacity, so "ink" is counted
  //    as near-opaque rather than exactly opaque.
  const inkR = parseInt(hex.slice(1, 3), 16);
  const inkG = parseInt(hex.slice(3, 5), 16);
  const inkB = parseInt(hex.slice(5, 7), 16);
  const inkSpread = Math.max(inkR, inkG, inkB) - Math.min(inkR, inkG, inkB);
  for (const s of SIZES) {
    const file = `favicon-${s}.png`;
    const { data, info } = await sharp(path.join(PUB, file))
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let ink = 0, field = 0, edge = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      const at = i / info.channels;
      if (a === 0) { field++; continue; }
      // No stray hue, asserted on the pixels that carry weight. Sub-pixel
      // coverage shifts partial-alpha pixels off neutral, so the check is
      // scoped to alpha >= 128; below that the un-premultiplication is
      // rounding noise and those pixels count as coverage.
      // The threshold is 128, not ~32 as once written.
      if (a >= 128 && Math.max(r, g, b) - Math.min(r, g, b) > inkSpread + 4) {
        throw new Error(`${file} has an off-grey pixel at ${at}: ${[r, g, b, a]}, spread over ${inkSpread + 4}`);
      }
      const isInk = Math.abs(r - inkR) <= 2 && Math.abs(g - inkG) <= 2 && Math.abs(b - inkB) <= 2;
      if (a >= 200) {
        if (isInk) ink++;
        else throw new Error(`${file} has a solid pixel that is not the ink at ${at}: ${[r, g, b, a]}`);
      } else {
        edge++;
      }
    }
    if (ink === 0) throw new Error(`${file} has no ink -- the arc did not render`);
    const total = info.width * info.height;
    console.log(`verified: ${file} ${info.width}x${info.height}, ink ${ink}/${total} px (${Math.round((ink / total) * 100)}%), ${field} field, ${edge} antialiased`);
  }

  // apple-touch-icon separately: it is flattened onto white, so alpha is 255
  // everywhere and the ink-field dichotomy does not apply. Two checks instead
  // of a strict line test -- the blend has to stay in the grey family (the
  // spread check above), and the pixels that carry the mark have to be the
  // ink. A naive ink-to-white interpolation is NOT asserted, because sharp
  // blends in linear light: a pixel that reads 250,250,250 sits at 121,121,121
  // on the sRGB line, so a straight channel lerp would reject correct output.
  {
    const file = 'apple-touch-icon.png';
    const { data, info } = await sharp(path.join(PUB, file))
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let ink = 0, field = 0, edge = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      const at = i / info.channels;
      if (a !== 255) throw new Error(`${file} is not fully opaque at ${at}: alpha ${a}`);
      if (Math.max(r, g, b) - Math.min(r, g, b) > inkSpread + 4) {
        throw new Error(`${file} has an off-grey pixel at ${at}: ${[r, g, b, a]}, spread over ${inkSpread + 4}`);
      }
      if (r === 255 && g === 255 && b === 255) { field++; continue; }
      if (Math.abs(r - inkR) <= 2 && Math.abs(g - inkG) <= 2 && Math.abs(b - inkB) <= 2) ink++;
      else edge++;
    }
    if (ink === 0) throw new Error(`${file} has no ink -- the arc did not render`);
    const total = info.width * info.height;
    console.log(`verified: ${file} ${info.width}x${info.height}, ink ${ink}/${total} px (${Math.round((ink / total) * 100)}%), ${field} field, ${edge} antialiased`);
  }

  // print the 16px mark as text, since that is the size it actually lives at
  const { data: d16, info: i16 } = await sharp(path.join(PUB, 'favicon-16.png'))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rows = [];
  for (let y = 0; y < i16.height; y++) {
    let row = '';
    for (let x = 0; x < i16.width; x++) {
      const i = (y * i16.width + x) * i16.channels;
      row += d16[i + 3] < 64 ? '.' : (d16[i + 3] > 200 ? '#' : '+');
    }
    rows.push(row);
  }
  console.log('\nfavicon-16.png:\n' + rows.join('\n'));
  console.log('\nwritten to ' + PUB);
})();
