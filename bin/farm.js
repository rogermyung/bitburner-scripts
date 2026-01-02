// this script is used to create the farm config and deploy the worker to the servers   
/** @param {NS} ns **/
import { getAllServers, filterRooted } from "/lib/network.js";
import { findBestTarget, calculateRatios, updateConfig } from "/lib/analyze.js";

export async function main(ns) {
    // 1. Gather network data
    const allServers = getAllServers(ns);
    const rootedServers = filterRooted(ns, allServers);

    // 2. Determine best target and calculate thread ratios
    const target = findBestTarget(ns, rootedServers);
    const ratios = calculateRatios(ns, target);

    // 3. Save configuration for workers
    await updateConfig(ns, target, ratios);
    
    ns.tprint(`--- Farm Manager ---`);
    ns.tprint(`Target: ${target}`);
    ns.tprint(`Ratios: H:${ratios.h} G:${ratios.g} W:${ratios.w}`);
    ns.tprint(`Config saved to /data/farm-config.txt`);

    // 4. Deploy to workers
    const workerPath = "/core/worker.js";
    const payloads = ["/sys/h.js", "/sys/g.js", "/sys/w.js", "sys/s.js"];
    const configPath = "/data/farm-config.txt";

    for (const server of rootedServers) {
        if (server === "home") continue;
        // Clean slate and deploy
        ns.killall(server);
        await ns.scp([workerPath, configPath, ...payloads], server);
        
        // Start worker with 1 thread
        ns.exec(workerPath, server, 1);
    }
    
    ns.tprint(`Deployment complete to ${rootedServers.length - 1} servers.`);
}