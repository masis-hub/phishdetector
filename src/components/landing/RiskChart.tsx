import { motion } from "framer-motion";
import { Info } from "lucide-react";

/**
 * Stylized SOC-style risk index chart. Pure SVG so it renders crisply at any
 * scale and animates smoothly on mount.
 */
// Score values (0 = sin exposición, 100 = riesgo crítico). The earliest month
// shows the baseline (78) and the latest shows the current score (28),
// reflecting a sustained reduction of exposure.
const scores = [
  { x: 0, score: 78 },
  { x: 15, score: 72 },
  { x: 30, score: 68 },
  { x: 45, score: 55 },
  { x: 60, score: 48 },
  { x: 75, score: 36 },
  { x: 90, score: 28 },
  { x: 100, score: 22 },
];

// In SVG y grows downward, so to make a falling score draw as a descending
// line we plot y = score directly (high score = high on the chart, near the
// top; low score = low on the chart, near the bottom).
const points = scores.map((p) => ({ x: p.x, y: 100 - p.score }));

const path = points
  .map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`)
  .join(" ");

const areaPath = `${path} L100 100 L0 100 Z`;

interface Props {
  title: string;
  subtitle: string;
  currentLabel: string;
  deltaLabel: string;
}

export function RiskChart({ title, subtitle, currentLabel, deltaLabel }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl p-5 shadow-[0_20px_80px_-20px_hsl(var(--primary)/0.35)]"
    >
      {/* glow */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
              {subtitle}
            </p>
            <h3 className="mt-1 text-sm font-semibold text-foreground">{title}</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-success/80">
              live
            </span>
          </div>
        </div>

        <div className="flex items-end gap-3 mb-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
              {currentLabel}
            </p>
            <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
              28
              <span className="text-base text-muted-foreground/60">/100</span>
            </p>
          </div>
          <div className="rounded-md bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success mb-1.5">
            ▼ 64% {deltaLabel}
          </div>
        </div>
        <p className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
          <Info className="h-3 w-3 text-primary" />
          Índice de exposición al phishing · menor es mejor (0 sin exposición · 100 riesgo crítico)
        </p>

        <div className="relative h-32 w-full pl-8">
          <div className="pointer-events-none absolute left-0 top-0 flex h-full w-7 flex-col justify-between py-1 text-right text-[9px] uppercase tracking-widest text-muted-foreground/60">
            <span>100<br/><span className="normal-case tracking-normal text-destructive/80">alto</span></span>
            <span>50</span>
            <span>0<br/><span className="normal-case tracking-normal text-success/80">bajo</span></span>
          </div>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            <defs>
              <linearGradient id="riskArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.45" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="riskLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--accent))" />
                <stop offset="100%" stopColor="hsl(187 92% 60%)" />
              </linearGradient>
            </defs>
            {/* grid */}
            {[25, 50, 75].map((y) => (
              <line
                key={y}
                x1="0"
                x2="100"
                y1={y}
                y2={y}
                stroke="hsl(var(--muted-foreground))"
                strokeOpacity="0.1"
                strokeDasharray="0.6 1"
              />
            ))}
            <motion.path
              d={areaPath}
              fill="url(#riskArea)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.8 }}
            />
            <motion.path
              d={path}
              fill="none"
              stroke="url(#riskLine)"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.6, delay: 0.5, ease: "easeOut" }}
            />
            {points.map((p) => (
              <circle
                key={`${p.x}-${p.y}`}
                cx={p.x}
                cy={p.y}
                r="0.9"
                fill="hsl(var(--foreground))"
              />
            ))}
          </svg>
        </div>

        <div className="mt-3 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground/50">
          <span>Ene</span>
          <span>Feb</span>
          <span>Mar</span>
          <span>Abr</span>
          <span>May</span>
          <span>Jun</span>
        </div>
      </div>
    </motion.div>
  );
}
