import { useCallback, useEffect, useRef, useState } from 'react'

// Steps through an array of precomputed frames at a given speed.
// speed = frames per second.
export function usePlayback(frameCount, speed) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef(null)

  const stop = useCallback(() => {
    setPlaying(false)
  }, [])

  useEffect(() => {
    if (!playing) return
    if (frameCount === 0) return
    const interval = Math.max(1000 / speed, 4)
    timerRef.current = setInterval(() => {
      setIndex((i) => {
        if (i >= frameCount - 1) {
          setPlaying(false)
          return i
        }
        return i + 1
      })
    }, interval)
    return () => clearInterval(timerRef.current)
  }, [playing, speed, frameCount])

  const play = useCallback(() => {
    setIndex((i) => (i >= frameCount - 1 ? 0 : i))
    setPlaying(true)
  }, [frameCount])

  const step = useCallback(() => {
    setPlaying(false)
    setIndex((i) => Math.min(i + 1, frameCount - 1))
  }, [frameCount])

  const stepBack = useCallback(() => {
    setPlaying(false)
    setIndex((i) => Math.max(i - 1, 0))
  }, [])

  const reset = useCallback(() => {
    setPlaying(false)
    setIndex(0)
  }, [])

  return { index, playing, play, pause: stop, step, stepBack, reset, setIndex }
}
