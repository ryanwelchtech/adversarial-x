import { useCallback, useRef, useEffect } from 'react'

// Apple-style 60fps animation hook using RAF
export const useAnimationFrame = (callback, deps = []) => {
  const requestRef = useRef()
  const previousTimeRef = useRef()

  const animate = useCallback((time) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current
      callback(deltaTime, time)
    }
    previousTimeRef.current = time
    requestRef.current = requestAnimationFrame(animate)
  }, [callback])

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(requestRef.current)
  }, deps)
}

// Throttle updates for performance (Apple uses 16ms minimum)
export const useThrottledValue = (value, delay = 16) => {
  const lastUpdate = useRef(Date.now())
  const lastValue = useRef(value)

  if (Date.now() - lastUpdate.current >= delay) {
    lastValue.current = value
    lastUpdate.current = Date.now()
  }

  return lastValue.current
}

// Debounced callback for expensive operations
export const useDebouncedCallback = (callback, delay = 100) => {
  const timeoutRef = useRef()

  return useCallback((...args) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => callback(...args), delay)
  }, [callback, delay])
}

// Intersection observer for lazy loading (Apple-style progressive loading)
export const useLazyLoad = (ref, options = {}) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!ref.current) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.1, ...options })

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref])

  return isVisible
}

// Preload critical assets
export const preloadAssets = (urls) => {
  urls.forEach(url => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = url
    link.as = url.endsWith('.js') ? 'script' : 'fetch'
    document.head.appendChild(link)
  })
}
