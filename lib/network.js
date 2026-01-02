/** @param {NS} ns **/

/** * Returns an array of all server names in the network.
 * @param {NS} ns 
 */
export function getAllServers(ns) {
    const servers = new Set(["home"]);
    const scan = (curr) => {
        for (const next of ns.scan(curr)) {
            if (!servers.has(next)) {
                servers.add(next);
                scan(next);
            }
        }
    };
    scan("home");
    return [...servers];
}

/** * Filters a list of servers to only those you have root access to.
 * @param {NS} ns 
 * @param {string[]} serverList
 */
export function filterRooted(ns, serverList) {
    return serverList.filter(s => ns.hasRootAccess(s));
}