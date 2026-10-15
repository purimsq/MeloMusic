// Mathematical Organic Scalloped Flower Shapes & Dynamic Progress Morphing for Melo

/**
 * Generates an SVG path data string for an N-lobed organic scalloped flower or morphing progress track
 */
export function generateFlowerPath(cx = 160, cy = 160, baseRadius = 110, amplitude = 14, lobes = 8, samples = 96) {
  const points = [];
  for (let i = 0; i < samples; i++) {
    const angle = (i / samples) * Math.PI * 2 - Math.PI / 2;
    const r = baseRadius + amplitude * Math.cos(lobes * angle);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push({ x, y });
  }

  // Smooth closed path using cubic bezier splines
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length; i++) {
    const p0 = points[(i - 1 + points.length) % points.length];
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const p3 = points[(i + 2) % points.length];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  path += ' Z';
  return path;
}

/**
 * Calculates (x, y) coordinates for progress scrubber dot
 */
export function getScrubberCoords(progress, cx = 160, cy = 160, baseRadius = 138, amplitude = 12, lobes = 8) {
  const angle = progress * 2 * Math.PI - Math.PI / 2;
  const r = baseRadius + amplitude * Math.cos(lobes * angle);
  const x = cx + r * Math.cos(angle);
  const y = cy + r * Math.sin(angle);
  return { x, y, angle };
}

// Pre-computed paths for normal (wavy) and seeking (circle) states
export const PROGRESS_PATHS = {
  wavy: generateFlowerPath(160, 160, 138, 12, 8, 96),
  circle: generateFlowerPath(160, 160, 145, 0, 8, 96)
};

export const SHAPES = {
  playerFlower: generateFlowerPath(160, 160, 112, 14, 8, 96),
  bubbleLarge: generateFlowerPath(80, 80, 60, 9, 8, 72),
  bubbleMedium: generateFlowerPath(60, 60, 44, 7, 7, 64),
  bubbleSmall: generateFlowerPath(40, 40, 28, 5, 6, 48)
};
