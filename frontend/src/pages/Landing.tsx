
import { Link } from "react-router-dom";

import {
  ArrowRight,
  Thermometer,
  Zap,
  Activity,
  CircleDot,
  Waypoints,
  BarChart3,
  MapPin,
} from "lucide-react";

export function Landing() {
  return (
    <div className="min-h-screen bg-ground-950 text-ground-100 overflow-x-hidden">
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-10 h-20 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-gradient-to-br from-cool-500 to-hot-500 p-1.5">
            <Thermometer
              size={18}
              className="text-ground-950"
              strokeWidth={2.5}
            />
          </div>

          <div>
            <span className="font-display font-semibold text-ground-50">
              ThermoScope
            </span>
            <p className="text-ground-400 text-xs">
              Urban Climate Intelligence
            </p>
          </div>
        </div>

        <Link
          to="/dashboard"
          className="text-sm font-medium text-ground-300 hover:text-ground-50 transition-colors flex items-center gap-1.5"
        >
          Explore Dashboard <ArrowRight size={15} />
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative px-6 lg:px-10 pt-14 pb-24 max-w-[1400px] mx-auto">
        <div className="absolute inset-0 grid-noise [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)] pointer-events-none" />

        <div className="relative grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ground-800 border border-ground-700 text-xs font-mono-data text-ground-300 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-cool-500 shadow-[0_0_6px_#38bdf8]" />
              CLIMATE DATA · MACHINE LEARNING · REGIONAL ANALYSIS
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold leading-[1.08] tracking-tight text-ground-50">
              Understanding heat.
              <br />
              <span className="thermal-gradient-text">
                Predicting demand.
              </span>
            </h1>

            <p className="mt-6 text-ground-300 text-lg leading-relaxed max-w-xl">
              Explore how temperature patterns and El Niño conditions relate
              to regional electricity consumption. ThermoScope combines
              climate indicators, data visualization, and machine learning
              to uncover patterns, compare regional profiles, and identify
              unusual observations in climate and energy data.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 bg-cool-500 text-ground-950 font-semibold px-6 py-3.5 rounded-lg hover:bg-cool-400 transition-colors shadow-lg shadow-cool-500/20"
              >
                Explore Dashboard <ArrowRight size={17} />
              </Link>

              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-ground-300 hover:text-ground-50 font-medium px-2 py-3.5 transition-colors"
              >
                Discover the analysis
              </a>
            </div>
          </div>

          <ThermalInstrument />
        </div>
      </section>

      {/* Project overview */}
      <section className="px-6 lg:px-10 py-20 border-t border-ground-800">
        <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-14 items-start">
          <div>
            <p className="text-cool-500 text-xs font-semibold uppercase tracking-wider mb-3 font-mono-data">
              The research focus
            </p>

            <h2 className="font-display text-3xl font-semibold text-ground-50 mb-5 leading-tight">
              Connecting climate patterns with electricity demand.
            </h2>

            <p className="text-ground-300 leading-relaxed">
              Temperature variations can influence the need for cooling
              and place additional pressure on electricity systems.
              El Niño–Southern Oscillation conditions provide an important
              climate indicator for examining broader temperature patterns.
              By studying temperature, the Oceanic Niño Index (ONI), and
              state-level electricity consumption together, this project
              explores how the available observations relate to one another.
              Data analysis and clustering help reveal similarities between
              observations and highlight patterns that deserve further
              investigation. These patterns can support analysis and planning,
              but they do not by themselves prove that one factor causes another.
            </p>
          </div>

          <div className="grid gap-4">
            <RelationshipCard
              icon={Thermometer}
              accent="hot"
              title="Temperature Patterns"
              body="Examine recorded temperatures to understand variations in thermal conditions and compare observations across the available dataset."
            />

            <RelationshipCard
              icon={Activity}
              accent="cool"
              title="El Niño and the ONI Index"
              body="Use the Oceanic Niño Index as a climate indicator to examine ENSO phases alongside the temperature and electricity data."
            />

            <RelationshipCard
              icon={Zap}
              accent="amber"
              title="State-Level Electricity Consumption"
              body="Explore differences in electricity consumption across recorded regions and investigate how demand patterns relate to climate indicators."
            />
          </div>
        </div>
      </section>

      {/* Analytical workflow */}
      <section
        id="how-it-works"
        className="px-6 lg:px-10 py-20 border-t border-ground-800 bg-ground-900/40"
      >
        <div className="max-w-[1400px] mx-auto">
          <p className="text-cool-500 text-xs font-semibold uppercase tracking-wider mb-3 font-mono-data">
            Analytical workflow
          </p>

          <h2 className="font-display text-3xl font-semibold text-ground-50 mb-4 leading-tight max-w-2xl">
            From raw data to meaningful patterns.
          </h2>

          <p className="text-ground-300 leading-relaxed max-w-2xl mb-12">
            The dashboard guides you through dataset preparation,
            exploratory analysis, clustering, model comparison, and
            prediction. Each stage helps examine the available data from
            a different perspective, making the results easier to interpret.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <MethodCard
              icon={CircleDot}
              accent="cool"
              name="K-Means Clustering"
              description="Groups observations into clusters based on similarities in the selected features. The resulting groups can help compare different climate and electricity-consumption profiles."
              points={[
                "Groups similar observations",
                "Helps identify recurring data patterns",
                "Supports comparison between clusters",
              ]}
            />

            <MethodCard
              icon={Waypoints}
              accent="hot"
              name="DBSCAN Analysis"
              description="Identifies dense groups of observations and can flag isolated records as noise. This provides a different perspective from methods that assign every observation to a cluster."
              points={[
                "Finds groups based on data density",
                "Can identify unusual observations",
                "Does not require a predefined cluster count",
              ]}
            />

            <MethodCard
              icon={BarChart3}
              accent="cool"
              name="Exploratory Data Analysis"
              description="Visualizes distributions, relationships, and variations in the available variables before drawing conclusions from the data."
              points={[
                "Explore variable distributions",
                "Compare climate and energy patterns",
                "Identify trends and potential anomalies",
              ]}
            />

            <MethodCard
              icon={MapPin}
              accent="hot"
              name="Regional Analysis"
              description="Use available location and state-level information to explore where observations were recorded and compare regional patterns in the dataset."
              points={[
                "Explore available geographic information",
                "Compare regional observations",
                "Support data-driven interpretation",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="px-6 lg:px-10 py-20 border-t border-ground-800">
        <div className="max-w-[1400px] mx-auto flex flex-col items-center text-center">
          <h2 className="font-display text-3xl font-semibold text-ground-50 mb-4">
            Discover what the data reveals.
          </h2>

          <p className="text-ground-400 max-w-xl mb-8 leading-relaxed">
            Upload a supported dataset, prepare the data, explore
            visualizations, compare clustering results, and investigate
            predictions through one integrated analytical dashboard.
          </p>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-cool-500 text-ground-950 font-semibold px-6 py-3.5 rounded-lg hover:bg-cool-400 transition-colors shadow-lg shadow-cool-500/20"
          >
            Start Exploring <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-10 py-8 border-t border-ground-800 text-center">
        <p className="text-ground-400 text-sm font-medium">
          ThermoScope
        </p>
        <p className="text-ground-500 text-xs mt-1">
          Urban Climate Intelligence · Climate and Energy Data Analysis
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
        <div className="flex items-center justify-between mb-5 gap-3">
          <span className="text-xs font-mono-data text-ground-400 uppercase tracking-wide">
            Climate Data Overview
          </span>

          <span className="text-xs font-mono-data text-cool-400">
            Illustrative
          </span>
        </div>

        <div className="flex items-end gap-1.5 h-40 mb-4">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm thermal-gradient"
              style={{
                height: `${h}%`,
                opacity: 0.55 + (h / 100) * 0.45,
              }}
            />
          ))}
        </div>

        <div className="h-px bg-ground-700 mb-4" />

        <div className="grid grid-cols-3 gap-3">
          <ReadoutStat
            label="Climate"
            value="Temp"
            unit=""
            accent="hot"
            small
          />

          <ReadoutStat
            label="ENSO"
            value="ONI"
            unit=""
            accent="cool"
            small
          />

          <ReadoutStat
            label="Energy"
            value="Power"
            unit=""
            accent="hot"
            small
          />
        </div>

        <p className="mt-4 text-xs text-ground-500 leading-relaxed">
          Conceptual visualization of the project's three analytical
          inputs. The bars are illustrative, not live model results.
        </p>
      </div>

      <div className="absolute -bottom-5 -right-5 card-surface rounded-xl px-4 py-3 shadow-xl shadow-black/40 hidden sm:block">
        <p className="text-[10px] text-ground-400 font-mono-data uppercase tracking-wide mb-0.5">
          Analysis methods
        </p>

        <p className="font-mono-data text-lg font-semibold text-cool-400">
          K-Means + DBSCAN
        </p>
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
        {unit && (
          <span className="text-ground-500 text-xs ml-0.5">{unit}</span>
        )}
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
      <div
        className={`shrink-0 rounded-lg p-2.5 h-fit ${accentClasses[accent]}`}
      >
        <Icon size={19} strokeWidth={2} />
      </div>

      <div>
        <h3 className="font-display font-semibold text-ground-50 mb-1">
          {title}
        </h3>

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
      <div
        className={`inline-flex rounded-lg p-2.5 mb-4 ring-1 ${accentClasses[accent]}`}
      >
        <Icon size={22} strokeWidth={2} />
      </div>

      <h3 className="font-display text-xl font-semibold text-ground-50 mb-2.5">
        {name}
      </h3>

      <p className="text-ground-400 text-sm leading-relaxed mb-5">
        {description}
      </p>

      <ul className="space-y-2">
        {points.map((point) => (
          <li
            key={point}
            className="flex items-start gap-2 text-sm text-ground-300"
          >
            <span
              className={`mt-1.5 h-1 w-1 rounded-full shrink-0 ${
                accent === "cool" ? "bg-cool-500" : "bg-hot-500"
              }`}
            />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}
