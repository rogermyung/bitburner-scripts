# Scripts for Bitburner

Folder Structure:

Prefix	Purpose	Examples
bin/	Primary executables you run manually.	bin/farm.js, bin/target.js
core/	Background daemons and workers.	core/worker.js, core/monitor.js
lib/	Reusable logic (imported by other scripts).	lib/utils.js, lib/network.js
sys/	The tiny "payload" scripts (H/G/W).	sys/h.js, sys/g.js, sys/w.js
data/	JSON config and log files.	data/config.txt, data/targets.txt