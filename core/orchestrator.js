/** @param {NS} ns **/
export async function main(ns) {
    const logFile = "manager-log.txt";

    // --- Define tasks here ---
    // Each entry: script name, interval in ms, description
    const tasks = {
        "bin/farm.js":        { interval: 600_000, lastRun: 0, desc: "Distribute threads" },
        "bin/upgrade-servers.js":{ interval: 60_000, lastRun: 0, desc: "Try upgrading servers" }
    };

    await ns.write(logFile, `\n=== Manager started at ${new Date().toLocaleTimeString()} ===\n`, "a");

    while (true) {
        const now = Date.now();

        for (const [script, task] of Object.entries(tasks)) {
            if (now - task.lastRun > task.interval) {
                // Kill old instance if running
                ns.kill(script, "home");

                // Launch script
                ns.exec(script, "home");
                await ns.write(logFile, `Ran ${script} (${task.desc}) at ${new Date().toLocaleTimeString()}\n`, "a");

                task.lastRun = now;
            }
        }

        await ns.sleep(1000); // tick every second
    }
}
