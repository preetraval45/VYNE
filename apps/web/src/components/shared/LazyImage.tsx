"use client";

import {
  CSSProperties,
  useEffect,
  useRef,
  useState,
  type ImgHTMLAttributes,
} from "react";

/**
 * LazyImage — IntersectionObserver-backed image that defers fetching
 * until ~200 px before it scrolls into view. Renders a blurred LQIP
 * (low-quality image placeholder) or a colour swatch underneath so
 * the layout never jumps.
 *
 *   <LazyImage
 *     src="https://cdn/logo.png"
 *     alt="Acme Corp logo"
 *     width={48}
 *     height={48}
 *     placeholder="data:image/png;base64,…"   // optional LQIP
 *   />
 *
 * Falls back to native `loading="lazy"` when IntersectionObserver
 * isn't available (older browsers / SSR). Always reserves the
 * declared width × height so CLS stays at zero.
 */

export interface LazyImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "loading"> {
  src: string;
  /** Required for layout reservation — px. */
  width: number;
  /** Required for layout reservation — px. */
  height: number;
  /** Optional LQIP base64 / URL shown blurred until the real image loads. */
  placeholder?: string;
  /** Solid colour fill behind the placeholder. Default: a neutral grey. */
  bgColor?: string;
  /** Pixels before the viewport at which to start fetching. Default 200. */
  rootMargin?: string;
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  placeholder,
  bgColor = "var(--content-secondary, #e5e7eb)",
  rootMargin = "200px",
  style,
  className,
  ...rest
}: LazyImageProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Detect IntersectionObserver support; fall back to immediately
  // visible (browser will still honour `loading="lazy"`).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);

  const wrapStyle: CSSProperties = {
    display: "inline-block",
    width,
    height,
    background: bgColor,
    overflow: "hidden",
    position: "relative",
    flexShrink: 0,
    ...style,
  };

  const placeholderStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    filter: "blur(12px)",
    transform: "scale(1.1)",
    opacity: loaded ? 0 : 1,
    transition: "opacity 200ms ease",
  };

  const imageStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    opacity: loaded ? 1 : 0,
    transition: "opacity 220ms ease",
  };

  return (
    <span ref={wrapRef} className={className} style={wrapStyle}>
      {placeholder && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          width={width}
          height={height}
          style={placeholderStyle}
        />
      )}
      {visible && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          {...rest}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={imageStyle}
        />
      )}
    </span>
  );
}
