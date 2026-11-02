import type maplibregl from 'maplibre-gl';
import type { ConfidenceTier } from '@/lib/types';
import type { Theme } from '@/lib/palette';

type Glyph = 'check' | 'dot' | 'question';

const GLYPH: Record<ConfidenceTier, Glyph> = { HIGH: 'check', MEDIUM: 'dot', LOW: 'question' };

/**
 * Draws one map pin. The tier is carried by three things at once, so colour is never the only signal:
 * the colour, the size (set on the layer), and the mark inside: a tick for field-verified, a dot for
 * corroborated and a question mark for reported.
 */
function drawPin(color: string, halo: string, glyph: Glyph, ratio = 2) {
  const w = 36;
  const h = 46;
  const canvas = document.createElement('canvas');
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(ratio, ratio);

  ctx.beginPath();
  ctx.arc(18, 17, 15, Math.PI * 0.8, Math.PI * 2.2, false);
  ctx.lineTo(18, 44);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = halo;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(18, 17, 9, 0, Math.PI * 2);
  ctx.fillStyle = halo;
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (glyph === 'check') {
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(13.2, 17.4);
    ctx.lineTo(16.4, 20.6);
    ctx.lineTo(22.8, 13.4);
    ctx.stroke();
  } else if (glyph === 'dot') {
    ctx.beginPath();
    ctx.arc(18, 17, 3.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.font = '600 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 18, 18);
  }
  const image = ctx.getImageData(0, 0, w * ratio, h * ratio);
  return { width: w * ratio, height: h * ratio, data: image.data };
}

/** Adds the three tier pins to the map's image set. Safe to call again after the style changes. */
export function registerPins(map: maplibregl.Map, colors: Theme) {
  const color: Record<ConfidenceTier, string> = { HIGH: colors.tierHigh, MEDIUM: colors.tierMedium, LOW: colors.tierLow };
  (Object.keys(color) as ConfidenceTier[]).forEach((tier) => {
    const id = `pin-${tier}`;
    if (map.hasImage(id)) map.removeImage(id);
    map.addImage(id, drawPin(color[tier], colors.mapHalo, GLYPH[tier]), { pixelRatio: 2 });
  });
}
