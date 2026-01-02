// this script is used to upgrade the servers to the next tier
import { deployWorker } from "/lib/deploy.js";
/** @param {NS} ns **/
export async function main(ns) {
    const maxRam = 2 ** 20; // maximum purchased server RAM
    const serverNamePrefix = "pserv-";
  
      // --- Get costs ---
      const currentHomeRam = ns.getServerMaxRam("home")[0];
      const homeCost = 32000 * (currentHomeRam / 2);
  
  
      // Compute current max RAM among your purchased servers 
      const pservs = ns.getPurchasedServers();
  
      const maxPurchasable = ns.getPurchasedServerMaxRam();
      const currentFleetMax = pservs.length ? Math.max(...pservs.map(s => ns.getServerMaxRam(s))) : 0;
      // Next target tier (double, capped by global max) 
      const startingServerSize = 8
      const nextRam = Math.min(currentFleetMax > 0 ? currentFleetMax * 2 : startingServerSize, 
        maxPurchasable);
      const serverCost = ns.getPurchasedServerCost(nextRam);
  
      // --- Compare ---
      if (homeCost < serverCost) {
        ns.tprint(`💡 Home upgrade is cheaper (${ns.formatNumber(homeCost)} vs ${ns.formatNumber(serverCost)}). Stopping server upgrades.`);
        ns.exec("sys/upgrade-home.js");
      }
  
      // --- Try upgrading servers ---
      for (let i = 0; i < ns.getPurchasedServerLimit(); i++) {
        const name = serverNamePrefix + i;
        if (ns.serverExists(name)) {
          const ram = ns.getServerMaxRam(name);
          if (ram < nextRam) {
            if (ns.getServerMoneyAvailable("home") >= serverCost) {
              ns.deleteServer(name);
              ns.purchaseServer(name, nextRam);
              await deployWorker(ns, name);
              ns.tprint(`Upgraded ${name} to ${nextRam} GB`);
            }
          }
        } else {
          if (ns.getServerMoneyAvailable("home") >= serverCost) {
            ns.purchaseServer(name, nextRam);
            await deployWorker(ns, name);
            ns.tprint(`Purchased ${name} with ${nextRam} GB`);
          }
        }
      }
  
      await ns.sleep(60000); // check every minute
  }
  