/** @param {NS} ns **/
import { deployWorker } from "/lib/deploy.js";

export async function main(ns) {
    const serverNamePrefix = "pserv-";
    const pservLimit = ns.getPurchasedServerLimit();
    const maxPurchasable = ns.getPurchasedServerMaxRam();

    // --- Program & Darkweb Status ---
    const programs = [
        "BruteSSH.exe",
        "FTPCrack.exe",
        "relaySMTP.exe",
        "HTTPWorm.exe",
        "SQLInject.exe"
    ];
    
    // Check status
    const missingPrograms = programs.filter(p => !ns.fileExists(p, "home"));
    const hasTor = ns.getPlayer().tor;
    const currentMoney = ns.getServerMoneyAvailable("home");

    // --- Dynamic Phase Logic ---
    const hackLevelTrigger = 500;
    const currentHackLevel = ns.getHackingLevel();
    
    // Switch to savings if:
    // 1. High Hacking Level (Saving for Augments)
    // 2. We have TOR + >200k + missing programs (Saving for Darkweb software)
    const isSavingForAugs = currentHackLevel > hackLevelTrigger;
    const isSavingForSoftware = hasTor || currentMoney > 200000 && missingPrograms.length > 0;

    let reservePercent = 0.00;
    if (isSavingForAugs) {
        reservePercent = 0.80;
        ns.tprint(`💰 Phase: SAVING (Hacking Level: ${currentHackLevel}).`);
    } else if (isSavingForSoftware) {
        reservePercent = 0.50; 
        ns.tprint(`🛠️ Phase: PREPARING (Tor active, saving for missing programs).`);
    } else {
        ns.tprint(`🚀 Phase: GROWTH (Infrastructure focus).`);
    }
    
    const spendableMoney = currentMoney * (1 - reservePercent);

    /**
     * Helper to find the highest power of 2 RAM we can afford.
     */
    function getAffordableRam(money) {
        let ram = maxPurchasable;
        while (ram >= 8) {
            if (ns.getPurchasedServerCost(ram) <= money) return ram;
            ram /= 2;
        }
        return 0;
    }

    // --- Upgrade Logic ---
    let remainingBudget = spendableMoney;

    // 1. Home Upgrade Check (Manual calc to save RAM)
    const currentHomeRam = ns.getServerMaxRam("home");
    if (currentHomeRam < maxPurchasable) {
        const homeUpgradeCost = currentHomeRam*32000 * Math.pow(1.58, Math.log2(currentHomeRam));
        if (remainingBudget >= homeUpgradeCost) {
            if (ns.fileExists("sys/upgrade-home.js")) {
                ns.tprint(`Upgrade Home RAM: ${currentHomeRam} Est Cost: ${ns.formatNumber(homeUpgradeCost)}`)
                ns.exec("sys/upgrade-home.js", "home");
            }
        }
    }

    // 2. Identify and Sort Slots (Empty first, then smallest RAM)
    const allSlots = [];
    for (let i = 0; i < pservLimit; i++) {
        const name = serverNamePrefix + i;
        if (ns.serverExists(name)) {
            allSlots.push({ name, ram: ns.getServerMaxRam(name), exists: true });
        } else {
            allSlots.push({ name, ram: 0, exists: false });
        }
    }

    allSlots.sort((a, b) => {
        if (a.exists !== b.exists) return a.exists ? 1 : -1;
        return a.ram - b.ram;
    });

    // 3. Execution Loop for Servers
    for (const slot of allSlots) {
        const targetRam = getAffordableRam(remainingBudget);
        if (targetRam <= slot.ram) continue; 

        const cost = ns.getPurchasedServerCost(targetRam);
        if (remainingBudget >= cost) {
            if (slot.exists) {
                ns.killall(slot.name);
                ns.deleteServer(slot.name);
            }
            
            if (ns.purchaseServer(slot.name, targetRam)) {
 //               await deployWorker(ns, slot.name);
                ns.tprint(`✅ ${slot.name}: ${ns.formatRam(slot.ram)} -> ${ns.formatRam(targetRam)}`);
                remainingBudget -= cost;
            }
        }
    }
}