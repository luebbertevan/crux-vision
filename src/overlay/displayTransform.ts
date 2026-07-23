export type ContentRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DisplayTransform = {
  contentRect: ContentRect;
  scale: number;
};

export function computeContainTransform(
  containerWidth: number,
  containerHeight: number,
  contentWidth: number,
  contentHeight: number,
): DisplayTransform {
  if (contentWidth <= 0 || contentHeight <= 0) {
    return {
      contentRect: { x: 0, y: 0, width: containerWidth, height: containerHeight },
      scale: 1,
    };
  }

  const scale = Math.min(containerWidth / contentWidth, containerHeight / contentHeight);
  const width = contentWidth * scale;
  const height = contentHeight * scale;
  return {
    contentRect: {
      x: (containerWidth - width) / 2,
      y: (containerHeight - height) / 2,
      width,
      height,
    },
    scale,
  };
}

export function mapNormalizedPoint(
  transform: DisplayTransform,
  point: { x: number; y: number },
): { x: number; y: number } {
  const { contentRect } = transform;
  return {
    x: contentRect.x + point.x * contentRect.width,
    y: contentRect.y + point.y * contentRect.height,
  };
}
