/** @param {NS} ns **/

/**
 * Deploys the worker script and all dependencies to a target server.
 * @param {NS} ns
 * @param {string} server - The hostname of the server to deploy to.
 */
export async function deployWorker(ns, server) {
    const files = [
        "/core/worker.js",
        "/data/farm-config.txt",
        "/sys/h.js",
        "/sys/g.js",
        "/sys/w.js",
        "/sys/s.js"
    ];
    // Safety check for empty or invalid hostnames
    if (!server || typeof server !== 'string' || !ns.serverExists(server)) {
        ns.print(`SKIPPING: Invalid or non-existent server name: ${server}`);
        return;
    }
    if (server === "home") {
        // We don't killall home or copy files to it, 
        // but we might want to ensure the worker is running.
        if (!ns.scriptRunning("/core/worker.js", "home")) {
            ns.exec("/core/worker.js", "home", 1);
        }
        return;
    }

    // Stop existing processes to clear RAM
    ns.killall(server);

    // Copy necessary files
    const success = await ns.scp(files, server, "home");

    if (success) {
        // Start the worker
        ns.exec("/core/worker.js", server, 1);
        ns.print(`Successfully deployed worker to ${server}`);
    } else {
        ns.tprint(`ERROR: Failed to copy files to ${server}`);
    }
}

/**
 * Massive deployment helper for multiple servers.
 * @param {NS} ns
 * @param {string[]} serverList
 */
export async function deployToNetwork(ns, serverList) {
    for (const server of serverList) {
        if (ns.hasRootAccess(server) && ns.getServerMaxRam(server) > 0) {
            await deployWorker(ns, server);
        }
    }
}