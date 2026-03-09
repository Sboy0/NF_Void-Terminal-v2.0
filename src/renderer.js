const outputDiv = document.getElementById('output');
const inputField = document.getElementById('cmd-input');
const pathDisplay = document.getElementById('path-display');
const promptUser = document.getElementById('prompt-user');
const promptHost = document.getElementById('prompt-host');

let currentPath = '';
let commandHistory = [];
let historyIndex = -1;
let homeDir = '';

async function init() {
    try {
        const info = await window.terminalAPI.getSystemInfo();
        promptUser.textContent = info.user;
        promptHost.textContent = info.hostname;
        homeDir = info.homeDir;
        currentPath = await window.terminalAPI.getCurrentDir();
        updatePrompt();
        print(`NF_Void Terminal v2.0`, 'info');
        print(`System: ${info.platform} (${info.arch})`, 'dim');
        print(`User: ${info.user} | Home: ${info.homeDir}`, 'dim');
        print(`Type 'help' for available commands.`, 'info');
        print(``, '');
    } catch (e) {
        print(`Initialization error: ${e.message}`, 'error');
    }
}

function focusInput() { inputField.focus(); }

function updatePrompt() {
    let displayPath = currentPath;
    if (homeDir && displayPath.startsWith(homeDir)) {
        displayPath = '~' + displayPath.substring(homeDir.length);
    }
    if (displayPath === '') displayPath = '~';
    pathDisplay.textContent = displayPath;
}

function print(text, className = '') {
    const div = document.createElement('div');
    div.className = `line ${className}`;
    div.textContent = text;
    outputDiv.appendChild(div);
    const terminal = document.getElementById('terminal');
    terminal.scrollTop = terminal.scrollHeight;
}

async function executeCommand(input) {
    const args = input.split(/\s+/);
    const cmd = args[0].toLowerCase();
    const params = args.slice(1);

    switch (cmd) {
        case 'help':
            print(`=== NF_Void Terminal v2.0 ===`, 'info');
            print(``, '');
            print(`NAVIGATION: ls, cd, pwd`, 'exec');
            print(`FILES: cat, touch, mkdir, rm, cp, mv, echo`, 'exec');
            print(`SYSTEM: clear, date, whoami, hostname, uname, sysinfo, top, history`, 'exec');
            print(`NETWORK: port, nmap/scan, netinfo, dns, traceroute`, 'exec');
            print(`SECURITY: hash, passwd, secscan/audit, base64, verify, logs`, 'exec');
            print(`PROCESS: ps, kill`, 'exec');
            print(`SHELL: exec, run, open, exit`, 'exec');
            print(``, '');
            print(`Type 'man <command>' for detailed help`, 'info');
            break;

        case 'clear':
            outputDiv.innerHTML = '';
            break;

        case 'exit':
            await window.terminalAPI.closeApp();
            break;

        case 'pwd':
            print(currentPath);
            break;

        case 'ls':
            const listPath = params[0] || '';
            const items = await window.terminalAPI.listDir(listPath);
            if (items.error) print(`ls: ${items.error}`, 'error');
            else if (items.length === 0) print(`(empty directory)`);
            else {
                items.forEach(item => {
                    const className = item.isDirectory ? 'dir' : 'file';
                    const suffix = item.isDirectory ? '/' : '';
                    print(`${item.name}${suffix}`, className);
                });
            }
            break;

        case 'cd':
            if (!params[0] || params[0] === '~') {
                const result = await window.terminalAPI.changeDir(homeDir);
                if (result.success) currentPath = result.path;
            } else if (params[0] === '..') {
                const result = await window.terminalAPI.changeDir('..');
                if (result.success) currentPath = result.path;
                else print(`cd: ${result.error}`, 'error');
            } else if (params[0] === '/') {
                const root = process.platform === 'win32' ? 'C:\\' : '/';
                const result = await window.terminalAPI.changeDir(root);
                if (result.success) currentPath = result.path;
            } else {
                const result = await window.terminalAPI.changeDir(params[0]);
                if (result.success) currentPath = result.path;
                else print(`cd: ${result.error}`, 'error');
            }
            updatePrompt();
            break;

        case 'cat':
            if (!params[0]) { print(`Usage: cat <filename>`, 'error'); break; }
            const fileResult = await window.terminalAPI.readFile(params[0]);
            if (fileResult.success) print(fileResult.content);
            else print(`cat: ${fileResult.error}`, 'error');
            break;

        case 'touch':
            if (!params[0]) { print(`Usage: touch <filename>`, 'error'); break; }
            const touchResult = await window.terminalAPI.createFile(params[0], '');
            if (touchResult.success) print(`Created: ${params[0]}`, 'info');
            else print(`touch: ${touchResult.error}`, 'error');
            break;

        case 'mkdir':
            if (!params[0]) { print(`Usage: mkdir <dirname>`, 'error'); break; }
            const mkdirResult = await window.terminalAPI.createDir(params[0]);
            if (mkdirResult.success) print(`Created directory: ${params[0]}`, 'info');
            else print(`mkdir: ${mkdirResult.error}`, 'error');
            break;

        case 'rm':
            if (!params[0]) { print(`Usage: rm [-r] <name>`, 'error'); break; }
            const recursive = params.includes('-r') || params.includes('-R');
            const name = params.find(p => p !== '-r' && p !== '-R');
            const rmResult = await window.terminalAPI.delete(name, recursive);
            if (rmResult.success) print(`Removed: ${name}`, 'info');
            else print(`rm: ${rmResult.error}`, 'error');
            break;

        case 'cp':
            if (params.length < 2) { print(`Usage: cp <source> <destination>`, 'error'); break; }
            const cpResult = await window.terminalAPI.copyFile(params[0], params[1]);
            if (cpResult.success) print(`Copied: ${params[0]} -> ${params[1]}`, 'info');
            else print(`cp: ${cpResult.error}`, 'error');
            break;

        case 'mv':
            if (params.length < 2) { print(`Usage: mv <source> <destination>`, 'error'); break; }
            const mvResult = await window.terminalAPI.moveFile(params[0], params[1]);
            if (mvResult.success) print(`Moved: ${params[0]} -> ${params[1]}`, 'info');
            else print(`mv: ${mvResult.error}`, 'error');
            break;

        case 'echo':
            print(params.join(' '));
            break;

        case 'date':
            print(new Date().toString());
            break;

        case 'whoami':
            const whoInfo = await window.terminalAPI.getSystemInfo();
            print(whoInfo.user);
            break;

        case 'hostname':
            const hostInfo = await window.terminalAPI.getSystemInfo();
            print(hostInfo.hostname);
            break;

        case 'uname':
            const unameInfo = await window.terminalAPI.getSystemInfo();
            if (params[0] === '-a') print(`${unameInfo.platform} ${unameInfo.arch} ${unameInfo.hostname}`);
            else print(unameInfo.platform);
            break;

        case 'sysinfo':
            const info = await window.terminalAPI.getSystemInfo();
            print(`=== System Information ===`, 'info');
            print(`Platform: ${info.platform}`);
            print(`Architecture: ${info.arch}`);
            print(`CPU Cores: ${info.cpus}`);
            print(`Total Memory: ${info.totalMem}`);
            print(`Free Memory: ${info.freeMem}`);
            print(`Hostname: ${info.hostname}`);
            print(`User: ${info.user}`);
            print(`Uptime: ${(info.uptime / 3600).toFixed(2)} hours`);
            break;

        case 'top':
            const topInfo = await window.terminalAPI.getSystemInfo();
            print(`=== System Resources ===`, 'info');
            print(`CPU Cores: ${topInfo.cpus}`);
            print(`Memory: ${topInfo.freeMem} / ${topInfo.totalMem} GB free`);
            print(`Uptime: ${(topInfo.uptime / 60).toFixed(0)} minutes`);
            break;

        case 'history':
            commandHistory.forEach((h, i) => print(` ${i + 1}  ${h}`));
            break;

        case 'exec':
        case 'run':
            if (!params[0]) { print(`Usage: exec <command>`, 'error'); break; }
            const command = params.join(' ');
            print(`Executing: ${command}`, 'dim');
            const execResult = await window.terminalAPI.execCommand(command);
            if (execResult.stdout) print(execResult.stdout);
            if (execResult.stderr) print(execResult.stderr, 'error');
            if (execResult.error) print(`Error: ${execResult.error}`, 'error');
            break;

        case 'open':
            if (!params[0]) { print(`Usage: open <path>`, 'error'); break; }
            await window.terminalAPI.execCommand(
                process.platform === 'win32' ? `start "" "${params[0]}"` : 
                process.platform === 'darwin' ? `open "${params[0]}"` : 
                `xdg-open "${params[0]}"`
            );
            break;

        // === CYBERSECURITY COMMANDS ===

        case 'hash':
            if (params.length < 2) { print(`Usage: hash <algorithm> <data>`, 'error'); break; }
            const algorithm = params[0].toLowerCase();
            const hashData = params.slice(1).join(' ');
            const hashResult = await window.terminalAPI.generateHash(algorithm, hashData);
            if (hashResult.success) {
                print(`Algorithm: ${algorithm.toUpperCase()}`, 'info');
                print(`Hash: ${hashResult.hash}`, 'exec');
            } else print(`hash: ${hashResult.error}`, 'error');
            break;

        case 'passwd':
        case 'password':
            const length = parseInt(params[0]) || 16;
            const includeSymbols = params.includes('-s');
            const passResult = await window.terminalAPI.generatePassword(length, { includeSymbols });
            if (passResult.success) {
                print(`Generated Password (${length} chars):`, 'info');
                print(passResult.password, 'exec');
                await window.terminalAPI.securityLog('PASSWORD_GENERATED', `Length: ${length}`);
            } else print(`passwd: ${passResult.error}`, 'error');
            break;

        case 'port':
        case 'checkport':
            if (params.length < 2) { print(`Usage: port <host> <port>`, 'error'); break; }
            const pHost = params[0];
            const pPort = parseInt(params[1]);
            print(`Checking port ${pPort} on ${pHost}...`, 'dim');
            const portResult = await window.terminalAPI.checkPort(pHost, pPort);
            if (portResult.success) print(portResult.message, portResult.open ? 'info' : 'error');
            break;

        case 'nmap':
        case 'scan':
            const sHost = params[0] || 'localhost';
            const sStart = parseInt(params[1]) || 1;
            const sEnd = parseInt(params[2]) || 1024;
            print(`Scanning ${sHost} ports ${sStart}-${sEnd}...`, 'dim');
            const scanResult = await window.terminalAPI.scanPorts(sHost, sStart, sEnd);
            if (scanResult.success) {
                const openPorts = scanResult.results.filter(r => r.status === 'OPEN');
                print(`\n=== Scan Results ===`, 'info');
                print(`Open Ports: ${openPorts.length}`, openPorts.length > 0 ? 'info' : 'error');
                if (openPorts.length > 0) {
                    openPorts.forEach(r => print(`${r.port}: ${r.status}`, 'info'));
                }
            }
            break;

        case 'netinfo':
        case 'ifconfig':
        case 'ipconfig':
            const netResult = await window.terminalAPI.getNetworkInfo();
            if (netResult.success) {
                print(`=== Network Information ===`, 'info');
                netResult.interfaces.forEach(iface => {
                    print(`${iface.name}: ${iface.address} (${iface.mac})`, 'info');
                });
            }
            break;

        case 'dns':
            if (!params[0]) { print(`Usage: dns <hostname>`, 'error'); break; }
            print(`Looking up ${params[0]}...`, 'dim');
            const dnsResult = await window.terminalAPI.dnsLookup(params[0]);
            if (dnsResult.output) print(dnsResult.output);
            else print(`dns: ${dnsResult.error}`, 'error');
            break;

        case 'traceroute':
        case 'tracert':
            if (!params[0]) { print(`Usage: traceroute <hostname>`, 'error'); break; }
            print(`Tracing route to ${params[0]}...`, 'dim');
            const traceResult = await window.terminalAPI.traceroute(params[0]);
            if (traceResult.output) print(traceResult.output);
            else print(`traceroute: ${traceResult.error}`, 'error');
            break;

        case 'secscan':
        case 'audit':
            if (!params[0]) { print(`Usage: secscan <file>`, 'error'); break; }
            print(`Scanning ${params[0]} for security issues...`, 'dim');
            const secResult = await window.terminalAPI.securityScan(params[0]);
            if (secResult.success) {
                print(`\n=== Security Audit Report ===`, 'info');
                print(`Risk Level: ${secResult.riskLevel}`, secResult.riskLevel === 'HIGH' ? 'error' : 'info');
                if (secResult.findings.length > 0) {
                    secResult.findings.forEach(f => print(`[${f.type}] - ${f.count} occurrence(s)`, 'warning'));
                } else print(`✓ No sensitive patterns detected`, 'info');
            } else print(`secscan: ${secResult.error}`, 'error');
            break;

        case 'logs':
        case 'seclog':
            const date = params[0] || new Date().toISOString().split('T')[0];
            print(`Reading security logs for ${date}...`, 'dim');
            const logResult = await window.terminalAPI.readSecurityLogs(date);
            if (logResult.success) print(logResult.content);
            else print(`logs: ${logResult.error}`, 'error');
            break;

        case 'base64':
            if (params.length < 2) { print(`Usage: base64 <encode|decode> <data>`, 'error'); break; }
            const action = params[0].toLowerCase();
            const b64data = params.slice(1).join(' ');
            const b64Result = await window.terminalAPI.base64(action, b64data);
            if (b64Result.success) print(`Result: ${b64Result.result}`, 'exec');
            else print(`base64: ${b64Result.error}`, 'error');
            break;

        case 'verify':
            if (params.length < 2) { print(`Usage: verify <file> <expected-hash>`, 'error'); break; }
            const verifyResult = await window.terminalAPI.verifyFile(params[0], params[1]);
            if (verifyResult.success) {
                if (verifyResult.match) print(`✓ File integrity VERIFIED`, 'info');
                else print(`✗ File integrity FAILED`, 'error');
            } else print(`verify: ${verifyResult.error}`, 'error');
            break;

        case 'ps':
        case 'processes':
            print(`Fetching process list...`, 'dim');
            const psResult = await window.terminalAPI.getProcesses();
            if (psResult.success) print(psResult.output);
            else print(`ps: ${psResult.error}`, 'error');
            break;

        case 'kill':
            if (!params[0]) { print(`Usage: kill <PID>`, 'error'); break; }
            print(`Terminating process ${params[0]}...`, 'warning');
            const killResult = await window.terminalAPI.killProcess(params[0]);
            if (killResult.success) print(`Process ${params[0]} terminated`, 'info');
            else print(`kill: ${killResult.error}`, 'error');
            break;

        case 'man':
            if (!params[0]) { print(`Usage: man <command>`, 'error'); break; }
            const manPages = {
                'hash': 'HASH - Generate cryptographic hash\nUsage: hash <md5|sha1|sha256|sha512> <data>',
                'passwd': 'PASSWD - Generate secure password\nUsage: passwd [length] [-s]',
                'port': 'PORT - Check if port is open\nUsage: port <host> <port>',
                'nmap': 'NMAP - Scan multiple ports\nUsage: nmap <host> [startPort] [endPort]',
                'secscan': 'SECSCAN - Security file audit\nUsage: secscan <file>',
                'base64': 'BASE64 - Encode/Decode data\nUsage: base64 <encode|decode> <data>',
                'verify': 'VERIFY - Check file integrity\nUsage: verify <file> <sha256-hash>',
                'ps': 'PS - List running processes\nUsage: ps',
                'kill': 'KILL - Terminate process\nUsage: kill <PID>'
            };
            if (manPages[params[0]]) print(manPages[params[0]], 'info');
            else print(`No manual entry for ${params[0]}`, 'error');
            break;

        default:
            print(`Attempting system command: ${cmd}`, 'dim');
            const sysResult = await window.terminalAPI.execCommand(input);
            if (sysResult.stdout) print(sysResult.stdout);
            if (sysResult.stderr) print(sysResult.stderr, 'error');
            if (sysResult.error && !sysResult.stdout) print(`Error: ${sysResult.error}`, 'error');
    }
}

inputField.addEventListener('keydown', async function(e) {
    if (e.key === 'Enter') {
        const rawCmd = inputField.value;
        const trimmedCmd = rawCmd.trim();
        if (trimmedCmd) {
            const displayPath = pathDisplay.textContent;
            print(`${promptUser.textContent}@${promptHost.textContent}:${displayPath}$ ${trimmedCmd}`, 'dim');
            commandHistory.push(rawCmd);
            historyIndex = commandHistory.length;
            await executeCommand(trimmedCmd);
        } else {
            const displayPath = pathDisplay.textContent;
            print(`${promptUser.textContent}@${promptHost.textContent}:${displayPath}$`, 'dim');
        }
        inputField.value = '';
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex > 0) { historyIndex--; inputField.value = commandHistory[historyIndex]; }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < commandHistory.length - 1) { historyIndex++; inputField.value = commandHistory[historyIndex]; }
        else { historyIndex = commandHistory.length; inputField.value = ''; }
    }
});

init();