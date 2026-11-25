import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const outputDirectory = resolve(process.cwd(), 'public/assets/3d/textures');
const textureSets = [
  { id: 'saab-340b', model: 'Saab 340 B', titleLength: 1220, titleSize: 176 },
  { id: 'dash-8-q400', model: 'Dash 8 Q400', titleLength: 1220, titleSize: 176 },
  { id: 'sukhoi-superjet-100', model: 'SSJ Superjet 100', titleLength: 1160, titleSize: 168 },
  { id: 'mc-21-310', model: 'MC-21-310', titleLength: 1080, titleSize: 158 },
];

function textureSvg({ model, titleLength, titleSize }) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1024" viewBox="0 0 2048 1024">
      <defs>
        <linearGradient id="body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset="0.64" stop-color="#f4fafc"/>
          <stop offset="1" stop-color="#d9e8ef"/>
        </linearGradient>
        <linearGradient id="stripe" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#12304c"/>
          <stop offset="0.5" stop-color="#1769aa"/>
          <stop offset="1" stop-color="#12304c"/>
        </linearGradient>
        <filter id="softPaint" x="-8%" y="-12%" width="116%" height="124%">
          <feGaussianBlur stdDeviation="0.45"/>
        </filter>
      </defs>
      <rect width="2048" height="1024" fill="url(#body)"/>
      <rect y="570" width="2048" height="94" fill="url(#stripe)" opacity="0.92"/>
      <rect y="664" width="2048" height="16" fill="#8fd6ff" opacity="0.82"/>
      <path d="M0 535 C430 510 760 526 1024 548 C1340 575 1660 575 2048 542 L2048 590 C1660 614 1320 616 1024 585 C710 554 392 550 0 580Z" fill="#2b88c8" opacity="0.68"/>

      <!-- Positive-z side of the cylindrical fuselage. -->
      <g text-anchor="middle" font-family="Brush Script MT, Segoe Script, URW Chancery L, cursive" fill="#4c6b86" opacity="0.85" filter="url(#softPaint)">
        <text x="1030" y="268" font-size="${titleSize}" textLength="${titleLength}" lengthAdjust="spacingAndGlyphs">BeyondSkyBlue</text>
      </g>
      <text x="1030" y="356" text-anchor="middle" font-family="Oxanium, Arial, sans-serif" font-size="52" font-weight="700" letter-spacing="6" fill="#143b63" opacity="0.86">${model}</text>

      <!-- Negative-z side; separated into the lower UV band and mirrored so it reads from outside. -->
      <g transform="translate(2048 0) scale(-1 1)" text-anchor="middle" font-family="Brush Script MT, Segoe Script, URW Chancery L, cursive" fill="#4c6b86" opacity="0.85" filter="url(#softPaint)">
        <text x="1030" y="780" font-size="${titleSize}" textLength="${titleLength}" lengthAdjust="spacingAndGlyphs">BeyondSkyBlue</text>
      </g>
      <g transform="translate(2048 0) scale(-1 1)">
        <text x="1030" y="868" text-anchor="middle" font-family="Oxanium, Arial, sans-serif" font-size="52" font-weight="700" letter-spacing="6" fill="#143b63" opacity="0.86">${model}</text>
      </g>

      <path d="M80 760 H1968" stroke="#8fd6ff" stroke-width="4" opacity="0.28"/>
      <path d="M80 786 H1968" stroke="#143b63" stroke-width="2" opacity="0.26"/>
    </svg>
  `;
}

await mkdir(outputDirectory, { recursive: true });
for (const texture of textureSets) {
  const output = resolve(outputDirectory, `${texture.id}-fuselage.png`);
  await sharp(Buffer.from(textureSvg(texture))).png({ compressionLevel: 9 }).toFile(output);
  console.log(`Generated ${output}`);
}
