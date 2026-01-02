/** @param {NS} ns **/

/**
 * Finds the most profitable server currently hackable.
 * Logic: Filters servers by hacking level and root access, then calculates
 * potential profit based on (MaxMoney * GrowthRate / MinSecurity).
 */
export function findBestTarget(ns, serverList) {
    let bestTarget = "n00dles";
    let maxScore = 0;

    const playerLevel = ns.getHackingLevel();

    for (const server of serverList) {
        if (server === "home") continue;
        
        const reqLevel = ns.getServerRequiredHackingLevel(server);
        const hasRoot = ns.hasRootAccess(server);
        
        if (hasRoot && reqLevel <= playerLevel) {
            const maxMoney = ns.getServerMaxMoney(server);
            const minSec = ns.getServerMinSecurityLevel(server);
            const growth = ns.getServerGrowth(server);
            
            // Basic scoring algorithm: 
            // We want high money, high growth, but low minimum security.
            const score = (maxMoney * growth) / minSec;
            
            if (score > maxScore) {
                maxScore = score;
                bestTarget = server;
            }
        }
    }
    return bestTarget;
}

/**
 * Calculates the ratio of threads needed to maintain a server.
 * Strategy: Assume we hack 50% of the server. We then calculate how many 
 * grows are needed to replace that 50%, and how many weakens are 
 * needed to offset the security increase of both the hack and the grow.
 */
export function calculateRatios(ns, target) {
    // 1. Define the Hack unit (we use 100 threads as a base for the ratio)
    const hThreads = 100;
    
    // 2. Calculate Grow needed to replace what 100 hack threads take
    // hackAnalyze returns the decimal percentage one thread takes (e.g., 0.002)
    const hackPercentPerThread = ns.hackAnalyze(target);
    const totalHackedPercent = hackPercentPerThread * hThreads;
    
    // We need to grow back from (1 - hackedPercent) to 1.0
    // If we hack 50%, we need a growth factor of 2.0 (1 / 0.5)
    const growthFactor = 1 / Math.max(0.01, (1 - totalHackedPercent));
    const gThreads = Math.ceil(ns.growthAnalyze(target, growthFactor));

    // 3. Calculate Weaken needed to offset security
    // Hack security increase: 0.002 per thread
    // Grow security increase: 0.004 per thread
    const secIncrease = ns.hackAnalyzeSecurity(hThreads, target) + 
                        ns.growthAnalyzeSecurity(gThreads, target);
    
    // Weaken security decrease: 0.05 per thread
    const wThreads = Math.ceil(secIncrease / ns.weakenAnalyze(1));

    return {
        h: hThreads,
        g: gThreads,
        w: wThreads
    };
}

/**
 * Writes the configuration to a JSON file.
 */
export async function updateConfig(ns, target, ratios) {
    const config = {
        target: target,
        ratios: ratios,
        paths: {
            h: "/sys/h.js",
            g: "/sys/g.js",
            w: "/sys/w.js"
        },
        lastUpdate: new Date().toISOString()
    };
    
    await ns.write("/data/farm-config.txt", JSON.stringify(config, null, 2), "w");
}