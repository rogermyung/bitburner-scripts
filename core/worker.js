/** @param {NS} ns **/
export async function main(ns) {
    const configPath = "/data/farm-config.txt";
    const hostname = ns.getHostname();
    const sharePath = "/sys/s.js"; // System file for ns.share()

    ns.disableLog("ALL"); // Clean up the script's log window

    while (true) {
        if (!ns.fileExists(configPath)) {
            ns.print("Waiting for config file...");
            await ns.sleep(5000);
            continue;
        }

        const config = JSON.parse(ns.read(configPath));
        const { target, ratios, paths } = config;

        // 1. Check if payload files exist locally
        const filesExist = ns.fileExists(paths.h) && ns.fileExists(paths.g) && ns.fileExists(paths.w);
        if (!filesExist) {
            ns.print(`ERROR: Missing payload files (${paths.h}, etc.)`);
            await ns.sleep(5000);
            continue;
        }

        // 2. RAM Math
        const maxRam = ns.getServerMaxRam(hostname);
        let freeRam = maxRam - ns.getServerUsedRam(hostname);
        if (hostname === "home") freeRam = Math.max(0, freeRam - 32); // Home needs a bigger buffer

        const hRam = ns.getScriptRam(paths.h);
        const gRam = ns.getScriptRam(paths.g);
        const wRam = ns.getScriptRam(paths.w);
        const sRam = ns.fileExists(sharePath) ? ns.getScriptRam(sharePath) : 4.0;

        const costPerSet = (ratios.h * hRam) + (ratios.g * gRam) + (ratios.w * wRam);
        
        // 3. Execution Logic
        let numSets = Math.floor(freeRam / costPerSet);

        // Optimization: If the server is too small for 1 full set, 
        // try to scale the ratios down to fit at least something.
        if (numSets === 0 && freeRam > 4) {
            ns.print("Server too small for full ratio set. Scaling down...");
            const scale = freeRam / costPerSet; 
            const sH = Math.floor(ratios.h * scale);
            const sG = Math.floor(ratios.g * scale);
            const sW = Math.ceil(ratios.w * scale); // Always round weaken UP

            if (sH + sG + sW > 0) {
                if (sW > 0) ns.exec(paths.w, hostname, sW, target, Math.random());
                if (sG > 0) ns.exec(paths.g, hostname, sG, target, Math.random());
                if (sH > 0) ns.exec(paths.h, hostname, sH, target, Math.random());
                ns.print(`Spawned scaled set: H:${sH} G:${sG} W:${sW}`);
            }
        } else if (numSets > 0) {
            const tH = ratios.h * numSets;
            const tG = ratios.g * numSets;
            const tW = ratios.w * numSets;

            ns.exec(paths.w, hostname, tW, target, Math.random());
            ns.exec(paths.g, hostname, tG, target, Math.random());
            ns.exec(paths.h, hostname, tH, target, Math.random());
            ns.print(`Spawned ${numSets} sets (Total threads: ${tH+tG+tW})`);
        } else {
            ns.print("Not enough RAM to run any threads.");
        }


        // 4. Smart Wait Loop with Share Refreshing
        const batchEndTime = Date.now() + ns.getWeakenTime(target) + 500;
        
        while (Date.now() < batchEndTime) {
            // Calculate remaining RAM for sharing
            let remainingRam = maxRam - ns.getServerUsedRam(hostname);
            if (hostname === "home") remainingRam = Math.max(0, remainingRam - 32);

            if (remainingRam >= sRam && ns.fileExists(sharePath)) {
                const shareThreads = Math.floor(remainingRam / sRam);
                if (shareThreads > 0) {
                    // Start share (runs for 10s)
                    ns.exec(sharePath, hostname, shareThreads, Math.random());
                }
            }

            // Sleep for 10 seconds (the duration of ns.share) or until the batch is done
            const timeLeft = batchEndTime - Date.now();
            const sleepTime = Math.min(10000, timeLeft);
            
            if (sleepTime > 0) {
                ns.print(`Waiting for batch: ${Math.round(timeLeft/1000)}s left... (Sharing RAM)`);
                await ns.sleep(sleepTime);
            }
        }
    }
}