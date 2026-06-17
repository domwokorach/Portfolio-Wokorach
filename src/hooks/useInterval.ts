type IntervalCallback = () => void;

export function useInterval(callback: IntervalCallback, delay?: number | null) {
  const savedCallback = useRef<IntervalCallback>(() => {});

  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    if (delay !== null) {
      const interval = setInterval(() => savedCallback.current(), delay || 0);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [delay]);
}
