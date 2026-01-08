/** @param {NS} ns */
import { getAllServers } from "/lib/network.js";
import { getTopTargets } from "/lib/analyze.js";
// this script should be run regularly from orchestrator
// suggested timer 2000
export async function main(ns) {
  ns.disableLog('ALL');
  // ns.ui.openTail()

  const CONFIG_PATH = "/data/config.txt";
  const LEAN_RAM = 1.75; // Path for 1.75GB scripts
  const MS_GAP = 100;

  // Ensure worker scripts exist on Home
  const workers = ["/sys/w.js", "/sys/g.js", "/sys/h.js"];

  // 1. Check for Config
  if (!ns.fileExists(CONFIG_PATH)) {
    ns.print("WAITING FOR CONFIG...");
    return;
  }
  const cfg = JSON.parse(ns.read(CONFIG_PATH));

  // 2. Identify and Split Workers
  const allRooted = getAllServers(ns).filter(s => ns.hasRootAccess(s) && ns.getServerMaxRam(s) > 0);
  const otherServers = allRooted.filter(s => s !== "home");

  // We split the network based on the shareRatio in config
  const shareCount = Math.floor(allRooted.length * cfg.shareRatio);
  const shareWorkers = otherServers.slice(0, shareCount);
  const hackWorkers = ["home", ...otherServers.slice(shareCount)];

  const targets = getTopTargets(ns);
  let totalIncome = 0;

  // 3. Manage Dedicated Sharing 
  for (const host of shareWorkers) {
    if (!ns.isRunning("/sys/s.js", host)) {
      if (host != "home") {
        ns.killall(host);
      }
      await ns.scp("/sys/s.js", host, "home");
      const t = Math.floor(ns.getServerMaxRam(host) / 4);
      if (t > 0) ns.exec("/sys/s.js", host, t);
    }
  }

  // 4. Manage Hacking (Hybrid Batching)
  for (let i = 0; i < hackWorkers.length; i++) {
    const host = hackWorkers[i];
    const target = targets[i % targets.length];

    // Track income for the HUD
    totalIncome += ns.getScriptIncome("/sys/h.js", host);

    // Skip if the worker is already busy with a batch
    if (ns.isRunning("/sys/w.js", host, target) ||
      ns.isRunning("/sys/g.js", host, target)) continue;

    let ramAvail = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
    if (host === "home") ramAvail -= cfg.reserveHome;

    const threads = Math.floor(ramAvail / LEAN_RAM);
    if (threads < 1) continue;

    await ns.scp(workers, host, "home");

    // Server Stats
    const curMoney = ns.getServerMoneyAvailable(target);
    const maxMoney = ns.getServerMaxMoney(target);
    const curSec = ns.getServerSecurityLevel(target);
    const minSec = ns.getServerMinSecurityLevel(target);

    // --- STRATEGY EXECUTION ---
    if (curSec > minSec + 0.5) {
      // STAGE: WEAKEN
      ns.exec("/sys/w.js", host, threads, target);
    } else if (curMoney < maxMoney * 0.9) {
      // STAGE: GROW
      const gThreads = Math.floor(threads * 0.8);
      const wThreads = Math.max(1, threads - gThreads);
      if (gThreads > 0) ns.exec("/sys/g.js", host, gThreads, target);
      if (wThreads > 0) ns.exec("/sys/w.js", host, wThreads, target);
    } else {
      // STAGE: BATCHING
      const hTime = ns.getHackTime(target);
      const gTime = ns.getGrowTime(target);
      const wTime = ns.getWeakenTime(target);

      const hT = Math.max(1, Math.floor(threads * 0.1));
      const w1T = Math.max(1, Math.floor(threads * 0.1));
      const gT = Math.max(1, Math.floor(threads * 0.6));
      const w2T = Math.max(1, Math.floor(threads * 0.2));

      // Timing: Land order: Hack -> Weaken1 -> Grow -> Weaken2
      ns.exec("/sys/h.js", host, hT, target, wTime - hTime - MS_GAP);
      ns.exec("/sys/w.js", host, w1T, target, 0);
      ns.exec("/sys/g.js", host, gT, target, wTime - gTime + MS_GAP);
      ns.exec("/sys/w.js", host, w2T, target, MS_GAP * 2);
    }
  }

  // 5. HUD Display
  updateHUD(ns, cfg, totalIncome, targets, shareWorkers.length, hackWorkers.length);

}

function updateHUD(ns, cfg, income, targets, sCount, hCount) {
  ns.clearLog();
  ns.print(`╔════════════ MISSION CONTROL HUD ════════════╗`);
  ns.print(`║ PHASE: ${cfg.phase.padEnd(6)} | GOAL: ${cfg.goal.padEnd(6)} | SH: ${(cfg.shareRatio * 100).toFixed(0)}% ║`);
  ns.print(`╠══════════════════════════════════════════════╣`);
  ns.print(`  INCOME: ${ns.formatNumber(income)}/sec`);
  ns.print(`  WORKERS: ${hCount} Hackers | ${sCount} Sharers`);
  ns.print(`  TARGETS: ${targets.join(", ")}`);
  ns.print(`╚══════════════════════════════════════════════╝`);
}