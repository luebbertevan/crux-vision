import { useLayoutEffect, useState, type RefObject } from 'react';

export type ReviewStageSize = {
  width: number;
  height: number;
  availableWidth: number;
  availableHeight: number;
};

type ReviewStageSizeOptions = {
  enabled: boolean;
  displayWidth: number;
  displayHeight: number;
  layoutKey: string;
  reviewMainRef: RefObject<HTMLElement | null>;
  stageSlotRef: RefObject<HTMLElement | null>;
  transportRef: RefObject<HTMLElement | null>;
};

const pixelValue = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundToHalfPixel = (value: number) => Math.floor(value * 2) / 2;

export function useReviewStageSize({
  enabled,
  displayWidth,
  displayHeight,
  layoutKey,
  reviewMainRef,
  stageSlotRef,
  transportRef,
}: ReviewStageSizeOptions): ReviewStageSize | null {
  const [stageSize, setStageSize] = useState<ReviewStageSize | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      setStageSize(null);
      return;
    }

    const reviewMain = reviewMainRef.current;
    const stageSlot = stageSlotRef.current;
    const transport = transportRef.current;
    const shell = reviewMain?.closest<HTMLElement>('.app-shell');
    if (!reviewMain || !stageSlot || !transport || !shell) return;

    let animationFrame = 0;

    const measure = () => {
      const availableWidth = reviewMain.clientWidth;
      const stageTop = stageSlot.getBoundingClientRect().top + window.scrollY;
      const transportStyle = window.getComputedStyle(transport);
      const shellStyle = window.getComputedStyle(shell);
      const viewportHeight =
        window.visualViewport?.height ?? document.documentElement.clientHeight;
      const transportIsOverlay = transportStyle.position === 'absolute';
      const reservedBelowStage =
        (transportIsOverlay
          ? 0
          : transport.offsetHeight + pixelValue(transportStyle.marginTop)) +
        pixelValue(shellStyle.paddingBottom);
      const availableHeight = Math.max(
        1,
        viewportHeight - stageTop - reservedBelowStage,
      );
      // iOS changes visualViewport.height as browser chrome expands/collapses.
      // A phone stage must stay full-width instead of visibly resizing during
      // scroll; secondary controls can continue below the initial viewport.
      const isNarrowPhone = window.matchMedia('(max-width: 719px)').matches;
      const scale = isNarrowPhone
        ? availableWidth / displayWidth
        : Math.min(
            availableWidth / displayWidth,
            availableHeight / displayHeight,
          );
      const nextSize = {
        width: roundToHalfPixel(displayWidth * scale),
        height: roundToHalfPixel(displayHeight * scale),
        availableWidth: roundToHalfPixel(availableWidth),
        availableHeight: roundToHalfPixel(availableHeight),
      };

      setStageSize((current) => {
        if (
          current &&
          current.width === nextSize.width &&
          current.height === nextSize.height &&
          current.availableWidth === nextSize.availableWidth &&
          current.availableHeight === nextSize.availableHeight
        ) {
          return current;
        }
        return nextSize;
      });
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measure);
    };

    measure();
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(reviewMain);
    resizeObserver.observe(transport);
    window.addEventListener('resize', scheduleMeasure);
    window.visualViewport?.addEventListener('resize', scheduleMeasure);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.visualViewport?.removeEventListener('resize', scheduleMeasure);
    };
  }, [
    displayHeight,
    displayWidth,
    enabled,
    layoutKey,
    reviewMainRef,
    stageSlotRef,
    transportRef,
  ]);

  return stageSize;
}
