import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTypingAnimationOptions {
  /** Characters revealed per tick */
  charsPerTick?: number;
  /** Milliseconds between ticks */
  intervalMs?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
}

export function useTypingAnimation(
  fullText: string | null,
  isActive: boolean,
  options: UseTypingAnimationOptions = {}
) {
  const { charsPerTick = 3, intervalMs = 16, onComplete } = options;
  const [displayedText, setDisplayedText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTextRef = useRef<string | null>(null);

  // Reset when fullText changes
  useEffect(() => {
    if (fullText !== prevTextRef.current) {
      prevTextRef.current = fullText;
      indexRef.current = 0;
      setDisplayedText('');
      setIsComplete(false);

      if (fullText && isActive) {
        setIsAnimating(true);
      } else {
        setIsAnimating(false);
        if (fullText) {
          setDisplayedText(fullText);
          setIsComplete(true);
        }
      }
    }
  }, [fullText, isActive]);

  // Run typing interval
  useEffect(() => {
    if (!isAnimating || !fullText) return;

    intervalRef.current = setInterval(() => {
      indexRef.current += charsPerTick;

      if (indexRef.current >= fullText.length) {
        indexRef.current = fullText.length;
        setDisplayedText(fullText);
        setIsAnimating(false);
        setIsComplete(true);
        onComplete?.();
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        setDisplayedText(fullText.slice(0, indexRef.current));
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAnimating, fullText, charsPerTick, intervalMs, onComplete]);

  const skip = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (fullText) {
      indexRef.current = fullText.length;
      setDisplayedText(fullText);
      setIsAnimating(false);
      setIsComplete(true);
      onComplete?.();
    }
  }, [fullText, onComplete]);

  return { displayedText, isAnimating, isComplete, skip };
}
