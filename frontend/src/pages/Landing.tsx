import { Link } from "react-router-dom";
import {
  ArrowRight,
  Thermometer,
  Droplets,
  Zap,
  CircleDot,
  Waypoints,
  GraduationCap,
} from "lucide-react";

export function Landing() {
  return (
    <div className="min-h-screen bg-ground-950 text-ground-100 overflow-x-hidden">
      {/* ---- Nav ---- */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-10 h-20 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-gradient-to-br from-cool-500 to-hot-500 p-1.5">
            <Thermometer size={16} className="text-ground-950" strokeWidth={2.5} />
          </div>
          <span className="font-display font-semibold text-ground-50">El Niño Cooling Impact</span>
        </div>
        <Link
          to="/dashboard"
          className="text-sm font-medium text-ground-300 hover:text-ground-50 transition-colors flex items-center gap-1.5"
        >
          Open Dashboard <ArrowRight size={15} />
        </Link>
      </nav>

      {/* ---- Hero ---- */}
      <section className="relative px-6 lg:px-10 pt-14 pb-24 max-w-[1400px] mx-auto">
        <div className="absolute inset-0 grid-noise [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)] pointer-events-none" />

        <div className="relative grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ground-800 border border-ground-700 text-xs font-mono-data text-ground-300 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-cool-500 shadow-[0_0_6px_#38bdf8]" />
              TY AI-DS · PBL Project 48 · Clustering Engine
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold leading-[1.08] tracking-tight text-ground-50">
              When the Pacific warms,{" "}
              <span className="thermal-gradient-text">cities heat up too.</span>
            </h1>

            <p className="mt-6 text-ground-300 text-lg leading-relaxed max-w-xl">
              This dashboard analyzes how El Niño–driven temperature and humidity
              shifts reshape urban electricity demand — and uses unsupervised
              clustering to surface where cooling infrastructure is under the
              most strain.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 bg-cool-500 text-ground-950 font-semibold px-6 py-3.5 rounded-lg hover:bg-cool-400 transition-colors shadow-lg shadow-cool-500/20"
              >
                Open Dashboard <ArrowRight size={17} />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-ground-300 hover:text-ground-50 font-medium px-2 py-3.5 transition-colors"
              >
                How the clustering works
              </a>
            </div>
          </div>

          {/* Signature element: thermal instrument readout */}
          <ThermalInstrument />
        </div>
      </section>

      {/* ---- Why El Niño matters ---- */}
      <section className="px-6 lg:px-10 py-20 border-t border-ground-800">
        <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-14 items-start">
          <div>
            <p className="text-cool-500 text-xs font-semibold uppercase tracking-wider mb-3 font-mono-data">
              Why it matters
            </p>
            <h2 className="font-display text-3xl font-semibold text-ground-50 mb-5 leading-tight">
              El Niño doesn't just change the weather — it changes the load on
              the grid.
            </h2>
            <p className="text-ground-300 leading-relaxed">
              El Niño–Southern Oscillation (ENSO) warm phases push Indian
              cities toward longer, more intense heat spells. Warmer, more
              humid air drives sustained cooling demand: air conditioners run
              longer, refrigeration systems work harder, and peak electricity
              load climbs — often faster than infrastructure was sized for.
              Understanding{" "}
              <em className="text-ground-100 not-italic font-medium">where</em>{" "}
              and{" "}
              <em className="text-ground-100 not-italic font-medium">how severely</em>{" "}
              this happens is the first step toward planning for it.
            </p>
          </div>

          <div className="grid gap-4">
            <RelationshipCard
              icon={Thermometer}
              accent="hot"
              title="Temperature"
              body="Rising ambient temperature is the primary driver of cooling demand — the hotter it gets, the harder mechanical cooling has to work."
            />
            <RelationshipCard
              icon={Droplets}
              accent="cool"
              title="Humidity"
              body="High humidity reduces the body's ability to cool itself naturally, pushing dependence onto air conditioning even at moderate temperatures."
            />
            <RelationshipCard
              icon={Zap}
              accent="amber"
              title="Electricity Consumption"
              body="The downstream signal: as temperature and humidity climb together, electricity consumption for cooling rises — this is what the models cluster on."
            />
          </div>
        </div>
      </section>

      {/* ---- How it works: K-Means + DBSCAN ---- */}
      <section id="how-it-works" className="px-6 lg:px-10 py-20 border-t border-ground-800 bg-ground-900/40">
        <div className="max-w-[1400px] mx-auto">
          <p className="text-cool-500 text-xs font-semibold uppercase tracking-wider mb-3 font-mono-data">
            Methodology
          </p>
          <h2 className="font-display text-3xl font-semibold text-ground-50 mb-4 leading-tight max-w-2xl">
            Two clustering lenses on the same data
          </h2>
          <p className="text-ground-300 leading-relaxed max-w-2xl mb-12">
            Rather than committing to a single algorithm, the pipeline trains
            both K-Means and DBSCAN on the same scaled features, then compares
            them with internal validation metrics to recommend the better fit
            for the uploaded dataset.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <MethodCard
              icon={CircleDot}
              accent="cool"
              name="K-Means"
              description="Partitions records into a fixed number of compact, roughly equal-sized groups. The optimal cluster count (k) is chosen automatically using the elbow method on inertia — no manual tuning required."
              points={[
                "Every record is assigned to a cluster",
                "Good at finding evenly-sized demand tiers",
                "Fast, deterministic, easy to interpret",
              ]}
            />
            <MethodCard
              icon={Waypoints}
              accent="hot"
              name="DBSCAN"
              description="Groups records by density, discovering clusters of arbitrary shape while explicitly flagging sparse, atypical records as noise rather than forcing them into a group."
              points={[
                "Automatically separates outliers as noise",
                "No need to pre-specify cluster count",
                "eps / min_samples auto-tuned via grid search",
              ]}
            />
          </div>
        </div>
      </section>

      {/* ---- CTA footer ---- */}
      <section className="px-6 lg:px-10 py-20 border-t border-ground-800">
        <div className="max-w-[1400px] mx-auto flex flex-col items-center text-center">
          <h2 className="font-display text-3xl font-semibold text-ground-50 mb-4">
            Upload a dataset and see where the risk concentrates.
          </h2>
          <p className="text-ground-400 max-w-md mb-8">
            The dashboard walks through upload, preprocessing, EDA, clustering,
            comparison, and prediction — all driven by live backend results.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-cool-500 text-ground-950 font-semibold px-6 py-3.5 rounded-lg hover:bg-cool-400 transition-colors shadow-lg shadow-cool-500/20"
          >
            Open Dashboard <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <footer className="px-6 lg:px-10 py-8 border-t border-ground-800 text-center">
        <p className="text-ground-500 text-xs flex items-center justify-center gap-1.5">
          <GraduationCap size={13} /> TY AI-DS · PBL Practicals · Project 48
        </p>
      </footer>
    </div>
  );
}

function ThermalInstrument() {
  const bars = [38, 52, 46, 68, 58, 74, 61, 82, 70, 90, 76, 64];
  return (
    <div className="relative">
      <div className="card-surface rounded-2xl p-6 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between mb-5">
          <span className="text-xs font-mono-data text-ground-400 uppercase tracking-wide">
            Cooling Demand Index
          </span>
          <span className="text-xs font-mono-data text-hot-400">Live model output</span>
        </div>

        <div className="flex items-end gap-1.5 h-40 mb-4">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm thermal-gradient"
              style={{ height: `${h}%`, opacity: 0.55 + (h / 100) * 0.45 }}
            />
          ))}
        </div>

        <div className="h-px bg-ground-700 mb-4" />

        <div className="grid grid-cols-3 gap-3">
          <ReadoutStat label="Temp" value="38.4" unit="°C" accent="hot" />
          <ReadoutStat label="Humidity" value="61" unit="%" accent="cool" />
          <ReadoutStat label="Risk" value="Extreme" unit="" accent="hot" small />
        </div>
      </div>

      <div className="absolute -bottom-5 -right-5 card-surface rounded-xl px-4 py-3 shadow-xl shadow-black/40 hidden sm:block">
        <p className="text-[10px] text-ground-400 font-mono-data uppercase tracking-wide mb-0.5">
          Clusters found
        </p>
        <p className="font-mono-data text-lg font-semibold text-cool-400">K-Means + DBSCAN</p>
      </div>
    </div>
  );
}

function ReadoutStat({
  label,
  value,
  unit,
  accent,
  small,
}: {
  label: string;
  value: string;
  unit: string;
  accent: "hot" | "cool";
  small?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-ground-500 font-mono-data uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p
        className={`font-mono-data font-semibold tabular-nums ${
          small ? "text-sm" : "text-lg"
        } ${accent === "hot" ? "text-hot-400" : "text-cool-400"}`}
      >
        {value}
        {unit && <span className="text-ground-500 text-xs ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

function RelationshipCard({
  icon: Icon,
  accent,
  title,
  body,
}: {
  icon: typeof Thermometer;
  accent: "hot" | "cool" | "amber";
  title: string;
  body: string;
}) {
  const accentClasses: Record<string, string> = {
    hot: "bg-hot-500/10 text-hot-500",
    cool: "bg-cool-500/10 text-cool-500",
    amber: "bg-amber-500/10 text-amber-500",
  };
  return (
    <div className="card-surface rounded-xl p-5 flex gap-4">
      <div className={`shrink-0 rounded-lg p-2.5 h-fit ${accentClasses[accent]}`}>
        <Icon size={19} strokeWidth={2} />
      </div>
      <div>
        <h3 className="font-display font-semibold text-ground-50 mb-1">{title}</h3>
        <p className="text-ground-400 text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function MethodCard({
  icon: Icon,
  accent,
  name,
  description,
  points,
}: {
  icon: typeof CircleDot;
  accent: "cool" | "hot";
  name: string;
  description: string;
  points: string[];
}) {
  const accentClasses: Record<string, string> = {
    cool: "bg-cool-500/10 text-cool-500 ring-cool-500/20",
    hot: "bg-hot-500/10 text-hot-500 ring-hot-500/20",
  };
  return (
    <div className="card-surface rounded-2xl p-7">
      <div className={`inline-flex rounded-lg p-2.5 mb-4 ring-1 ${accentClasses[accent]}`}>
        <Icon size={22} strokeWidth={2} />
      </div>
      <h3 className="font-display text-xl font-semibold text-ground-50 mb-2.5">{name}</h3>
      <p className="text-ground-400 text-sm leading-relaxed mb-5">{description}</p>
      <ul className="space-y-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-ground-300">
            <span
              className={`mt-1.5 h-1 w-1 rounded-full shrink-0 ${
                accent === "cool" ? "bg-cool-500" : "bg-hot-500"
              }`}
            />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
