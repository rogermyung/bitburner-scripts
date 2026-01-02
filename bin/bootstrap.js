/** @param {NS} ns **/
export async function main(ns) {
    // 1. Configuration: Change this URL to your hosted script location
    const baseUrl = "https://raw.githubusercontent.com/rogermyung/bitburner-scripts/main/";
    
    const folders = ["/bin", "/core", "/lib", "/sys", "/data"];
    const manifest = [
        { remote: "bin/farm.js", local: "/bin/farm.js" },
        { remote: "core/worker.js", local: "/core/worker.js" },
        { remote: "lib/network.js", local: "/lib/network.js" },
        { remote: "lib/analyze.js", local: "/lib/analyze.js" },
        { remote: "lib/deploy.js", local: "/lib/deploy.js" },
        { remote: "bin/upgrade-servers.js", local: "/bin/upgrade-servers.js" },
        { remote: "core/orchestrator.js", local: "/core/orchestrator.js" }
    ];

    ns.tprint("🚀 Starting Bootstrap Process...");

    // 2. Create System Payloads (Save RAM/Time by generating these locally)
    const sysFiles = [
        { path: "/sys/h.js", content: "/** @param {NS} ns **/ export async function main(ns) { await ns.hack(ns.args[0]); }" },
        { path: "/sys/g.js", content: "/** @param {NS} ns **/ export async function main(ns) { await ns.grow(ns.args[0]); }" },
        { path: "/sys/w.js", content: "/** @param {NS} ns **/ export async function main(ns) { await ns.weaken(ns.args[0]); }" },
        { path: "/sys/s.js", content: "/** @param {NS} ns **/ export async function main(ns) { await ns.share(); }" }
    ];

    for (const file of sysFiles) {
        await ns.write(file.path, file.content, "w");
        ns.tprint(`✅ Created local payload: ${file.path}`);
    }

    // 3. Download the logic files
    ns.tprint("📡 Downloading core logic files...");
    for (const file of manifest) {
        const url = baseUrl + file.remote;
        const success = await ns.wget(url, file.local);
        if (success) {
            ns.tprint(`✅ Downloaded: ${file.local}`);
        } else {
            ns.tprint(`❌ FAILED: ${url}`);
        }
    }



    ns.tprint("🎉 Setup complete!");
    ns.tprint("Usage: 1. Run 'run /bin/farm.js'");
}