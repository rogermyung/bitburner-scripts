/** @param {NS} ns */
export async function main(ns) {
    await ns.write("/data/share-flag.txt", "false", "w");
  }