// app/last-week/page.tsx
import axios from "axios";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

// --- Brand / shared bits to match the main page ---
const BRAND = {
  bg: "bg-black",
  panelFrom: "from-rose-900/20",
  panelTo: "to-black/60",
  accent: "text-rose-400",
  ring: "ring-rose-700/40",
  btn: "bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-400",
};
const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black w-56";

const KICK_GREEN = "#53FC18";
const RAINBET_BLUE = "#10216E";

// ------------ Types ------------
type Affiliate = {
  username?: string;
  id?: string;
  wagered_amount?: string;
};
type AffiliatesResponse = {
  affiliates?: Affiliate[];
  cache_updated_at?: string;
};

// ------------ Helpers ------------
function parseAmount(x?: string) {
  const n = parseFloat(x || "0");
  return Number.isFinite(n) ? n : 0;
}
function formatMoney(amount: number) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function maskUsername(username: string) {
  if (!username) return "—";
  if (username.length <= 4) return username;
  return username.slice(0, 2) + "*".repeat(username.length - 3) + username[username.length - 1];
}
const PRIZES: Record<number, number> = { 1: 100, 2: 60, 3: 40, 4: 30, 5: 20 };

async function fetchAffiliates(start_at: string, end_at: string): Promise<AffiliatesResponse> {
  const base = process.env.RAINBET_API_BASE || "https://services.rainbet.com/v1";
  const key = process.env.RAINBET_API_KEY || "";
  const url = `${base}/external/affiliates`;
  const res = await axios.get(url, {
    params: { start_at, end_at, key },
    headers: { Accept: "application/json" },
    validateStatus: () => true,
  });
  if (res.status !== 200) {
    throw new Error(`Rainbet API ${res.status}: ${JSON.stringify(res.data)}`);
  }
  return res.data;
}

// UTC: get last week's Sun→Sat (dates as YYYY-MM-DD for API)
function getLastWeekRangeUTC() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const thisSundayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day, 0, 0, 0, 0));
  const prevSundayUTC = new Date(thisSundayUTC);
  prevSundayUTC.setUTCDate(prevSundayUTC.getUTCDate() - 7);
  const prevSaturdayUTC = new Date(prevSundayUTC);
  prevSaturdayUTC.setUTCDate(prevSaturdayUTC.getUTCDate() + 6);
  prevSaturdayUTC.setUTCHours(23, 59, 59, 999);

  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  return {
    startDate: fmt(prevSundayUTC),
    endDate: fmt(prevSaturdayUTC),
    _prevSundayUTC: prevSundayUTC,
    _prevSaturdayUTC: prevSaturdayUTC,
  };
}

// NY display for last week (Sun→Sat)
function pad2(n: number) { return String(n).padStart(2, "0"); }
function getPrevNYWeekDisplay() {
  const now = new Date();
  const nyParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(now).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  // "NY today" (just Y/M/D)
  const nyTodayLocal = new Date(Number(nyParts.year), Number(nyParts.month) - 1, Number(nyParts.day));
  const weekdayShort = (new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(nyTodayLocal)) as
    "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";
  const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  // This week’s NY Sunday, then step back 7 days for previous Sunday
  const thisSundayNY = new Date(nyTodayLocal);
  thisSundayNY.setDate(thisSundayNY.getDate() - WEEKDAY_INDEX[weekdayShort]);
  const prevSundayNY = new Date(thisSundayNY);
  prevSundayNY.setDate(prevSundayNY.getDate() - 7);
  const prevSaturdayNY = new Date(prevSundayNY);
  prevSaturdayNY.setDate(prevSaturdayNY.getDate() + 6);

  const displayStart = `${prevSundayNY.getFullYear()}-${pad2(prevSundayNY.getMonth() + 1)}-${pad2(prevSundayNY.getDate())}`;
  const displayEnd   = `${prevSaturdayNY.getFullYear()}-${pad2(prevSaturdayNY.getMonth() + 1)}-${pad2(prevSaturdayNY.getDate())}`;
  return { displayStart, displayEnd };
}

// --- Small UI bits to match the main page ---
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-100">{value}</p>
    </div>
  );
}
function StickyHeader() {
  return (
    <div className="sticky top-0 z-50 border-b border-zinc-800 bg-black/70 backdrop-blur supports-[backdrop-filter]:bg-black/50">
      <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-2">
        <div className="relative h-12 w-40 sm:h-16 sm:w-56 md:h-20 md:w-72">
          <Image src="/logo.png" alt="Logo" fill className="object-contain" priority />
        </div>
      </div>
    </div>
  );
}
function BackgroundArt() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-black" />
      <Image src="/blood-overlay.png" alt="" fill priority className="object-contain md:object-cover opacity-[0.35]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
    </div>
  );
}
function DiscordButton({ className = "" }: { className?: string }) {
  const href = process.env.DISCORD_INVITE_URL || "#";
  return (
    <Link href={href} className={`${BTN_BASE} ${BRAND.btn} text-white ${className}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.211.375-.444.864-.608 1.249-1.844-.276-3.68-.276-5.486 0-.164-.398-.418-.874-.63-1.249a.077.077 0 00-.079-.037 19.736 19.736 0 00-4.885 1.515.07.07 0 00-.032.027C.533 9.045-.32 13.58.099 18.06a.082.082 0 00.031.056 19.9 19.9 0 006.01 3.049.078.078 0 00.084-.027c.462-.63.874-1.295 1.226-1.994a.078.078 0 00-.042-.109 12.98 12.98 0 01-1.852-.882.078.078 0 01-.008-.131c.125-.094.25-.192.369-.291a.076.076 0 01-.079-.01c3.89 1.793 8.105 1.793 11.95 0a.076.076 0 01.08.01c.12.099.244.197.37.291a.078.078 0 01-.006.131 12.64 12.64 0 01-1.853.882.078.078 0 00-.041.11c.36.698.772 1.363 1.225 1.993a.078.078 0 00.084.028 19.9 19.9 0 006.011-3.049.079.079 0 00.031-.055zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.957-2.419 2.157-2.419s2.184 1.097 2.157 2.419c0 1.334-.957 2.419-2.157 2.419zm7.975 0c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.957-2.419 2.157-2.419s2.184 1.097 2.157 2.419c0 1.334-.957 2.419-2.157 2.419z"/>
      </svg>
      Join Discord
    </Link>
  );
}

// --- Podium UI (same as home) ---
function Podium({ top }: { top: Affiliate[] }) {
  const [first, second, third] = top;
  const medalSrc: Record<number, string> = { 1: "/medal-gold.png", 2: "/medal-silver.png", 3: "/medal-bronze.png" };
  const glowByRank: Record<1 | 2 | 3, string> = {
    1: "drop-shadow(0 0 30px rgba(251,191,36,0.8))",
    2: "drop-shadow(0 0 30px rgba(212,212,212,0.8))",
    3: "drop-shadow(0 0 30px rgba(205,127,50,0.8))",
  };
  const Medal = ({ rank }: { rank: 1 | 2 | 3 }) => (
    <div className={`w-40 h-40 shrink-0 flex items-center justify-center rounded-full ring-2 ${BRAND.ring} bg-zinc-900/60 backdrop-blur-sm`}>
      <Image src={medalSrc[rank]} alt={`Rank ${rank}`} width={150} height={150} className="block object-contain" style={{ filter: glowByRank[rank] }} priority />
    </div>
  );
  const card = (a: Affiliate | undefined, rank: 1 | 2 | 3) => {
    const prize = PRIZES[rank];
    return (
      <div className="flex flex-col items-center justify-start rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm min-h-[18rem] w-full p-3">
        <Medal rank={rank} />
        <div className="mt-2 text-xs text-zinc-400">#{rank}</div>
        <div className="mt-1 min-h-[2.25rem] w-full">
          <div className="mx-auto max-w-[22ch] break-words text-center text-lg font-bold leading-snug text-zinc-100">
            {maskUsername(a?.username ?? "")}
          </div>
        </div>
        <div className="mt-1 flex min-h-[2.25rem] items-center">
          <div className={`text-2xl font-extrabold ${BRAND.accent}`}>{formatMoney(parseAmount(a?.wagered_amount))}</div>
        </div>
        {prize ? (
          <div className="mt-2 rounded-full border border-rose-700/40 bg-rose-900/30 px-3 py-1 text-sm text-rose-200">
            Prize: C${prize}
          </div>
        ) : null}
      </div>
    );
  };
  return (
    <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:items-end">
      <div className="order-2 sm:order-1">{card(second, 2)}</div>
      <div className="order-1 sm:order-2">{card(first, 1)}</div>
      <div className="order-3 sm:order-3">{card(third, 3)}</div>
    </div>
  );
}

// --- Page ---
export default async function Page() {
  const { startDate, endDate } = getLastWeekRangeUTC();
  const { displayStart, displayEnd } = getPrevNYWeekDisplay();

  let rows: Affiliate[] = [];
  let error: string | null = null;

  try {
    const resp = await fetchAffiliates(startDate, endDate);
    rows = resp.affiliates || [];
  } catch (e: any) {
    error = e?.message || "Failed to load last week";
  }

  const sorted = [...rows].sort((a, b) => parseAmount(b.wagered_amount) - parseAmount(a.wagered_amount));
  const participants = sorted.length;
  const totalWagered = sorted.reduce((acc, r) => acc + parseAmount(r.wagered_amount), 0);
  const top3 = sorted.slice(0, 3);
  const top10 = sorted.slice(0, 10);

  const referralUrl = process.env.RAINBET_REFERRAL_URL || "#";
  const kickUrl = process.env.KICK_URL || "#";

  return (
    <main className="relative z-10 mx-auto max-w-none bg-transparent p-0 text-zinc-100">
      <BackgroundArt />
      <StickyHeader />

      {/* HERO */}
      <section className={`mx-auto mt-4 max-w-6xl rounded-3xl border border-zinc-800 bg-gradient-to-b ${BRAND.panelFrom} ${BRAND.panelTo} p-6 backdrop-blur-sm`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative h-16 w-48 sm:h-20 sm:w-64">
              <Image src="/logo.png" alt="Logo" fill className="object-contain" priority />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Last Week Results</h1>
              <p className="text-sm text-zinc-300">Sunday → Saturday · {displayStart} → {displayEnd}</p>
              <p className="mt-1 text-sm text-zinc-400">
                <Link href="/" className="underline decoration-zinc-600 underline-offset-4 hover:text-zinc-200">← Back to current week</Link>
              </p>
            </div>
          </div>

          {/* Right column buttons (optional mirror of home) */}
          <div className="flex flex-col items-end gap-2">
            <DiscordButton />
            <Link href={referralUrl} target="_blank" rel="noopener noreferrer" className={`${BTN_BASE} text-white hover:brightness-110`} style={{ backgroundColor: RAINBET_BLUE }}>
              Join Rainbet
            </Link>
            <Link href={kickUrl} target="_blank" rel="noopener noreferrer" className={`${BTN_BASE} text-black hover:brightness-110`} style={{ backgroundColor: KICK_GREEN }}>
              Watch on Kick
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Participants" value={participants.toString()} />
          <StatCard label="Total Wagered" value={formatMoney(totalWagered)} />
          <StatCard label="Total Prize Pool" value={`C$${Object.values(PRIZES).reduce((a, b) => a + b, 0)}`} />
        </div>

        {/* Podium */}
        <div className="mt-6">
          <h2 className="mb-8 text-lg font-semibold">Champions Podium (Last Week)</h2>
          {top3.length ? (
            <Podium top={top3} />
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-6 text-zinc-400">No data available</div>
          )}
        </div>
      </section>

      {/* TABLE (Top 10) */}
      <section className="mx-auto mt-6 max-w-6xl rounded-3xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-sm p-6">
        <h3 className="mb-4 text-lg font-semibold">Participants (Top 10 — Last Week)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-zinc-300">
                <th className="p-3">#</th>
                <th className="p-3">Affiliate</th>
                <th className="p-3">Wagered</th>
                <th className="p-3">Prize</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((r, i) => {
                const rank = i + 1;
                const prize = PRIZES[rank];
                const name = r.username ?? r.id ?? "—";
                return (
                  <tr key={String(r.id ?? r.username ?? i)} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                    <td className="p-3 text-zinc-400">{rank}</td>
                    <td className="p-3 font-medium text-zinc-100">{maskUsername(name)}</td>
                    <td className={`p-3 font-semibold ${BRAND.accent}`}>{formatMoney(parseAmount(r.wagered_amount))}</td>
                    <td className="p-3">
                      {prize ? (
                        <span className="inline-block rounded-full border border-rose-700/40 bg-rose-900/30 px-2 py-0.5 text-rose-200 text-xs">
                          C${prize}
                        </span>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!top10.length && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-zinc-500">No warriors match your search</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {error && <p className="mx-auto mt-4 max-w-6xl p-6 text-sm text-red-400">Error: {error}</p>}
    </main>
  );
}
