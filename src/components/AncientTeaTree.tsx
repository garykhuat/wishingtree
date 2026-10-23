import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Wish } from '../types';

interface AncientTeaTreeProps {
  wishes: Wish[];
  latestWishId?: string | null;
  onSelectWish?: (wish: Wish) => void;
  selectedWishId?: string | null;
}

interface FlyingLeaf {
  id: string;
  wish: Wish;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  currentX: number;
  currentY: number;
  rotation: number;
  progress: number;
}

export const AncientTeaTree: React.FC<AncientTeaTreeProps> = ({
  wishes,
  latestWishId,
  onSelectWish,
  selectedWishId,
}) => {
  const [flyingLeaves, setFlyingLeaves] = useState<FlyingLeaf[]>([]);
  const [glowingLeafIds, setGlowingLeafIds] = useState<Set<string>>(new Set());
  const [hoveredWishId, setHoveredWishId] = useState<string | null>(null);
  const prevWishesRef = useRef<Map<string, Wish>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Render hovered & selected leaves last so they appear on top without clipping
  const sortedWishes = useMemo(() => {
    return [...wishes].sort((a, b) => {
      if (a.id === selectedWishId) return 2;
      if (b.id === selectedWishId) return -2;
      if (a.id === hoveredWishId) return 1;
      if (b.id === hoveredWishId) return -1;
      return 0;
    });
  }, [wishes, selectedWishId, hoveredWishId]);

  // Coordinates are generated to fit the lush wide dome canopy of the ancient tea tree
  // (spanning X: 26.5% to 89.5% and Y: 7.2% to 55.5% across the panoramic background)
  const getMappedCoordinates = (rawX: number, rawY: number) => {
    return {
      x: Math.min(89.5, Math.max(26.5, rawX)),
      y: Math.min(55.5, Math.max(7.2, rawY)),
    };
  };

  // Flying animation trigger when new wishes arrive
  useEffect(() => {
    const prevMap = prevWishesRef.current;
    const newWishes = wishes.filter((w) => !prevMap.has(w.id));

    const newMap = new Map<string, Wish>();
    wishes.forEach((w) => newMap.set(w.id, w));
    prevWishesRef.current = newMap;

    if (prevMap.size > 0 && newWishes.length > 0) {
      newWishes.forEach((w) => {
        const mapped = getMappedCoordinates(w.leaf_x, w.leaf_y);
        // Start from pedestal base of the glowing tea terraces under the tree trunk
        const startX = 58.0 + (Math.random() * 8 - 4);
        const startY = 87 + Math.random() * 4;

        const newFlyer: FlyingLeaf = {
          id: `fly-${w.id}-${Date.now()}`,
          wish: w,
          fromX: startX,
          fromY: startY,
          toX: mapped.x,
          toY: mapped.y,
          currentX: startX,
          currentY: startY,
          rotation: -180,
          progress: 0,
        };

        setFlyingLeaves((prev) => [...prev, newFlyer]);
      });
    }
  }, [wishes]);

  // Handle latestWishId highlighting
  useEffect(() => {
    if (latestWishId) {
      setGlowingLeafIds((prev) => new Set(prev).add(latestWishId));
      const timer = setTimeout(() => {
        setGlowingLeafIds((prev) => {
          const next = new Set(prev);
          next.delete(latestWishId);
          return next;
        });
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [latestWishId]);

  // Flying leaf bezier animation
  useEffect(() => {
    if (flyingLeaves.length === 0) return;

    let animId: number;
    const duration = 2400; // 2.4s float
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);

      setFlyingLeaves((current) =>
        current
          .map((leaf) => {
            const midX = (leaf.fromX + leaf.toX) / 2 + (leaf.fromX > leaf.toX ? 8 : -8);
            const midY = Math.min(leaf.fromY, leaf.toY) - 15;
            const t = ease;

            const curX =
              (1 - t) * (1 - t) * leaf.fromX +
              2 * (1 - t) * t * midX +
              t * t * leaf.toX;
            const curY =
              (1 - t) * (1 - t) * leaf.fromY +
              2 * (1 - t) * t * midY +
              t * t * leaf.toY;
            const curRot =
              -180 +
              (leaf.wish.leaf_rotation + 180) * t +
              Math.sin(t * Math.PI * 4) * 12;

            return {
              ...leaf,
              currentX: curX,
              currentY: curY,
              rotation: curRot,
              progress: t,
            };
          })
          .filter((leaf) => {
            if (leaf.progress >= 1) {
              setGlowingLeafIds((prev) => new Set(prev).add(leaf.wish.id));
              setTimeout(() => {
                setGlowingLeafIds((prev) => {
                  const next = new Set(prev);
                  next.delete(leaf.wish.id);
                  return next;
                });
              }, 4500);
              return false;
            }
            return true;
          })
      );

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [flyingLeaves.length]);

  // Ambient particles: mix of luminous tea-green fireflies and warm champagne sparkles
  const ambientParticles = useMemo(() => {
    return Array.from({ length: 36 }, (_, i) => ({
      id: i,
      x: 24 + ((i * 37) % 52),
      y: 10 + ((i * 41) % 68),
      size: 1.6 + (i % 4) * 1.0,
      duration: 5.5 + (i % 6) * 1.8,
      delay: (i % 7) * 1.0,
      opacity: 0.4 + (i % 4) * 0.18,
      color: i % 2 === 0 ? '#4ADE80' : '#F6CF77',
    }));
  }, []);

  // Leaf color helper with fresh, vibrant, brighter tea greens ("tươi sáng hơn")
  const getLeafColors = (shade: number, isGlowing: boolean, isSelected: boolean, isHovered: boolean = false) => {
    if (isSelected) {
      return {
        fill: '#FFFDE7', // Brilliant radiant golden ivory for standout selection
        stroke: '#F59E0B', // Bright Nam A Bank gold border
        glow: 'rgba(245, 158, 11, 1)',
        midrib: '#D97706',
        vein: '#B45309',
      };
    }
    if (isHovered) {
      return {
        fill: '#FEF9C3', // Warm luminous golden-ivory tint on hover
        stroke: '#FBBF24',
        glow: 'rgba(251, 191, 36, 0.95)',
        midrib: '#D97706',
        vein: '#F59E0B',
      };
    }
    if (isGlowing) {
      return {
        fill: '#BBF7D0',
        stroke: '#22C55E',
        glow: 'rgba(34, 197, 94, 0.95)',
        midrib: '#15803D',
        vein: '#16A34A',
      };
    }
    switch (shade % 4) {
      case 0: // Bright Fresh Tea Sprout (Xanh búp trà non tươi sáng)
        return {
          fill: '#4ADE80',
          stroke: '#15803D',
          glow: 'rgba(74, 222, 128, 0.5)',
          midrib: '#14532D',
          vein: '#166534',
        };
      case 1: // Radiant Emerald Tea Leaf (Xanh ngọc lục bảo tươi rực rỡ)
        return {
          fill: '#22C55E',
          stroke: '#FDE047',
          glow: 'rgba(34, 197, 94, 0.45)',
          midrib: '#FACC15',
          vein: '#86EFAC',
        };
      case 2: // Vibrant Mountain Jade (Xanh ngọc bích miền núi tươi sáng)
        return {
          fill: '#10B981',
          stroke: '#34D399',
          glow: 'rgba(52, 211, 153, 0.45)',
          midrib: '#064E3B',
          vein: '#6EE7B7',
        };
      case 3: // Sunlit Golden-Green Bud (Búp chè Shan tuyết ánh kim)
      default:
        return {
          fill: '#86EFAC',
          stroke: '#15803D',
          glow: 'rgba(134, 239, 172, 0.5)',
          midrib: '#166534',
          vein: '#15803D',
        };
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none bg-transparent"
    >
      {/* Interactive SVG Layer for Large Wish Leaves & Animations */}
      <svg
        viewBox="0 0 1000 650"
        className="absolute inset-0 w-full h-full pointer-events-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Glow Filters */}
          <filter id="leaf-green-aura" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="leaf-hover-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="soft-firefly-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Intense Radiant Beacon Filter for Selected Wish Leaf */}
          <filter id="selected-beacon-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* 
            ENLARGED PROMINENT TEA LEAF SYMBOL (LÁ TRÀ LỚN RÕ NÉT & TƯƠI SÁNG)
            Size: Height 56px, Width 28px in SVG canvas
            Distinct natural pointed tea leaf shape, illuminated midrib, and lateral veins
          */}
          <g id="enlarged-tea-leaf">
            {/* Outer soft shadow contour */}
            <path
              d="M 0,-28 C 11,-16 13,14 0,28 C -13,14 -11,-16 0,-28 Z"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            {/* Prominent Golden Midrib Vein */}
            <path
              d="M 0,-24 L 0,24"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
            />
            {/* Lateral Secondary Veins */}
            <path
              d="M 0,-13 L 5.5,-18 M 0,-2 L 7,-7 M 0,9 L 5.5,4 M 0,18 L 4,14
                 M 0,-13 L -5.5,-18 M 0,-2 L -7,-7 M 0,9 L -5.5,4 M 0,18 L -4,14"
              strokeWidth="1.1"
              fill="none"
              strokeLinecap="round"
              opacity="0.9"
            />
            {/* Dewdrop / Golden Sprout Sparkle at Tip */}
            <circle cx="0" cy="-26" r="2.2" fill="#FFF" opacity="0.95" />
          </g>
        </defs>

        {/* Ambient floating green fireflies & champagne particles drifting upward */}
        <g id="layer-ambient-particles" pointerEvents="none">
          {ambientParticles.map((p) => (
            <circle
              key={p.id}
              cx={p.x * 10}
              cy={p.y * 6.5}
              r={p.size}
              fill={p.color}
              opacity={p.opacity}
              filter="url(#soft-firefly-glow)"
            >
              <animate
                attributeName="cy"
                values={`${p.y * 6.5};${p.y * 6.5 - 38};${p.y * 6.5}`}
                dur={`${p.duration}s`}
                repeatCount="indefinite"
                begin={`${p.delay}s`}
              />
              <animate
                attributeName="opacity"
                values={`${p.opacity};${Math.min(0.95, p.opacity * 2.2)};${p.opacity}`}
                dur={`${p.duration * 0.65}s`}
                repeatCount="indefinite"
                begin={`${p.delay}s`}
              />
            </circle>
          ))}
        </g>

        {/* Wish Leaves Layer: Distinct, prominent tea leaves blooming on the ancient tree */}
        <g id="layer-wish-leaves">
          {sortedWishes.map((w) => {
            const mapped = getMappedCoordinates(w.leaf_x, w.leaf_y);
            const isGlowing = glowingLeafIds.has(w.id);
            const isSelected = selectedWishId === w.id;
            const isHovered = hoveredWishId === w.id;
            const colors = getLeafColors(w.leaf_shade, isGlowing, isSelected, isHovered);

            const cx = (mapped.x / 100) * 1000;
            const cy = (mapped.y / 100) * 650;
            const baseScale = w.leaf_scale || 1.0;
            const currentScale = isSelected
              ? baseScale * 2.2
              : isHovered
              ? baseScale * 1.45
              : isGlowing
              ? baseScale * 1.35
              : baseScale * 1.02;

            return (
              <g
                key={w.id}
                transform={`translate(${cx}, ${cy}) rotate(${w.leaf_rotation}) scale(${currentScale})`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredWishId(w.id)}
                onMouseLeave={() => setHoveredWishId((cur) => (cur === w.id ? null : cur))}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectWish?.(w);
                }}
                filter={
                  isSelected
                    ? 'url(#selected-beacon-glow)'
                    : isHovered
                    ? 'url(#leaf-hover-glow)'
                    : 'url(#leaf-green-aura)'
                }
                style={{
                  transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                {/* Generous stable hit area preventing any edge hover jitter */}
                <circle r="30" fill="transparent" pointerEvents="all" />

                {/* PROMINENT GOLDEN LOCATOR BEACON WHEN SELECTED */}
                {isSelected && (
                  <g pointerEvents="none">
                    {/* Outer expanding radar ripples */}
                    <circle r="26" fill="none" stroke="#F59E0B" strokeWidth="3" opacity="0.95">
                      <animate attributeName="r" values="16;78" dur="1.8s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0" dur="1.8s" repeatCount="indefinite" />
                    </circle>
                    <circle r="18" fill="none" stroke="#FEF08A" strokeWidth="2.5" opacity="0.95">
                      <animate attributeName="r" values="10;56" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                    </circle>

                    {/* Golden core aura halo */}
                    <circle r="36" fill="#F59E0B" opacity="0.38" filter="url(#soft-firefly-glow)" />

                    {/* Orbiting dashed celestial ring */}
                    <circle
                      r="40"
                      fill="none"
                      stroke="#FEF08A"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      opacity="0.95"
                    >
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0"
                        to="360"
                        dur="6s"
                        repeatCount="indefinite"
                      />
                    </circle>

                    {/* Shimmering Golden Star Marker pointing directly to the leaf */}
                    <g transform="translate(0, -48)">
                      <path
                        d="M 0,-15 L 4,-4 L 15,0 L 4,4 L 0,15 L -4,4 L -15,0 L -4,-4 Z"
                        fill="#FFFDF0"
                        stroke="#F59E0B"
                        strokeWidth="1.8"
                        filter="url(#soft-firefly-glow)"
                      >
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="0"
                          to="360"
                          dur="4s"
                          repeatCount="indefinite"
                        />
                      </path>
                    </g>
                  </g>
                )}

                {/* Large expanding green & gold pulse ripple when newly arrived */}
                {isGlowing && !isSelected && (
                  <circle
                    r="24"
                    fill="none"
                    stroke="#4ADE80"
                    strokeWidth="2.2"
                    opacity="0.9"
                  >
                    <animate
                      attributeName="r"
                      values="14;48"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.95;0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Render tea leaf cleanly with custom stroke & vein colors */}
                <g>
                  <use
                    href="#enlarged-tea-leaf"
                    fill={colors.fill}
                    stroke={colors.stroke}
                  />
                  {/* Highlighted midrib overlay */}
                  <path
                    d="M 0,-24 L 0,24"
                    stroke={colors.midrib}
                    strokeWidth={isSelected ? '2.2' : isHovered ? '2.0' : '1.6'}
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Highlighted lateral veins */}
                  <path
                    d="M 0,-13 L 5.5,-18 M 0,-2 L 7,-7 M 0,9 L 5.5,4 M 0,18 L 4,14
                       M 0,-13 L -5.5,-18 M 0,-2 L -7,-7 M 0,9 L -5.5,4 M 0,18 L -4,14"
                    stroke={colors.vein}
                    strokeWidth={isSelected ? '1.5' : isHovered ? '1.3' : '1.1'}
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.95"
                  />
                </g>
              </g>
            );
          })}
        </g>

        {/* Active Flying Leaves (Soaring from glowing terraces up to tree canopy) */}
        {flyingLeaves.map((flyer) => {
          const cx = (flyer.currentX / 100) * 1000;
          const cy = (flyer.currentY / 100) * 650;

          return (
            <g
              key={flyer.id}
              transform={`translate(${cx}, ${cy}) rotate(${flyer.rotation}) scale(${1.6})`}
              filter="url(#leaf-green-aura)"
            >
              {/* Particle trail glow */}
              <circle r="22" fill="#4ADE80" opacity="0.45" filter="url(#soft-firefly-glow)" />
              <use
                href="#enlarged-tea-leaf"
                fill="#86EFAC"
                stroke="#15803D"
              />
              <path
                d="M 0,-24 L 0,24"
                stroke="#14532D"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
