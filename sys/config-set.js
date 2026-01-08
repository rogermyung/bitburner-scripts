/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog('ALL');
    ns.ui.openTail()
    const configPath = "/data/config.txt";
    const manualShare = ns.read("/data/share-flag.txt") === "true";
  
    // while (true) {
    const player = ns.getPlayer();
    const hackLevel = ns.getHackingLevel();
    const totalRam = ns.getPurchasedServers().reduce((a, b) => a + ns.getServerMaxRam(b), 0);
  
    // 1. PHASE LOGIC
    let phase = "EARLY";
    if (hackLevel > 1000 || totalRam > 1024) phase = "LATE";
    else if (hackLevel > 300 || totalRam > 128) phase = "MID";
  
    // 2. GOAL LOGIC
    let isWorkingForFaction = false;
  
    // Check if the player is actually performing an action
    if (player.isWorking) {
      // Look at where the player is or what they are doing
      // Most faction work happens at a specific location or has a specific 'className'
      const workType = player.workType || "";
      const location = player.location || "";
  
      // This catches Faction work across different BitNodes
      if (workType.toLowerCase().includes("faction") ||
        location.toLowerCase().includes("factions")) {
        isWorkingForFaction = true;
      }
    }
    // Focus on XP early to unlock bigger servers, then switch to Money.
    let goal = "XP";
    if (hackLevel > 500) goal = "MONEY";
  
    // Manual Override: If you are working for a faction and need rep, 
    // you might want XP to increase your hack power.
    if (isWorkingForFaction && hackLevel < 1500) goal = "XP";
  
    // 3. SHARE RATIO
    let shareRatio = 0;
    if (isWorkingForFaction || manualShare) {
      shareRatio = (phase === "LATE") ? 0.6 : (phase === "MID") ? 0.4 : 0.2;
    }
  
    const config = {
      phase: phase,
      goal: goal,
      shareRatio: shareRatio,
      targets: (totalRam > 2048) ? 5 : (totalRam > 512) ? 3 : 1,
      reserveHome: (phase === "EARLY") ? 16 : 64,
      lastUpdate: new Date().toLocaleTimeString()
    };
  
    await ns.write(configPath, JSON.stringify(config), "w");
  
    ns.clearLog();
    ns.print(`--- MISSION CONTROL ---`);
    ns.print(`Phase:   ${phase}`);
    ns.print(`Goal:    ${goal}`);
    ns.print(`Sharing: ${(shareRatio * 100).toFixed(0)}%`);
    ns.print(`Updated: ${config.lastUpdate}`);
  
    await ns.sleep(10000);
    // }
  }