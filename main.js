const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const os = require('os');
const crypto = require('crypto');
const net = require('net');

let mainWindow;
const HOME_DIR = os.homedir();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#0c0c0c',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        frame: true,
        titleBarStyle: 'default'
    });

    mainWindow.loadFile('src/index.html');
    Menu.setApplicationMenu(null);
}

// === НАВИГАЦИЯ И ФАЙЛЫ ===

ipcMain.handle('get-current-dir', () => {
    return process.cwd();
});

ipcMain.handle('change-dir', (event, newPath) => {
    try {
        const targetPath = path.resolve(process.cwd(), newPath);
        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
            process.chdir(targetPath);
            return { success: true, path: process.cwd() };
        } else {
            return { success: false, error: 'Directory not found' };
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('list-dir', (event, dirPath) => {
    try {
        const targetPath = dirPath ? path.resolve(process.cwd(), dirPath) : process.cwd();
        const items = fs.readdirSync(targetPath, { withFileTypes: true });
        return items.map(item => ({
            name: item.name,
            isDirectory: item.isDirectory(),
            isFile: item.isFile()
        }));
    } catch (e) {
        return { error: e.message };
    }
});

ipcMain.handle('read-file', (event, filePath) => {
    try {
        const targetPath = path.resolve(process.cwd(), filePath);
        if (targetPath.startsWith(HOME_DIR) || targetPath.startsWith(process.cwd())) {
            const content = fs.readFileSync(targetPath, 'utf-8');
            return { success: true, content };
        } else {
            return { success: false, error: 'Access denied' };
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('create-file', (event, fileName, content = '') => {
    try {
        const targetPath = path.resolve(process.cwd(), fileName);
        fs.writeFileSync(targetPath, content, 'utf-8');
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('create-dir', (event, dirName) => {
    try {
        const targetPath = path.resolve(process.cwd(), dirName);
        fs.mkdirSync(targetPath, { recursive: true });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('delete', (event, name, recursive = false) => {
    try {
        const targetPath = path.resolve(process.cwd(), name);
        if (targetPath === HOME_DIR || targetPath === process.cwd() || targetPath === os.tmpdir()) {
            return { success: false, error: 'Cannot delete system directory' };
        }
        if (recursive) {
            fs.rmSync(targetPath, { recursive: true, force: true });
        } else {
            fs.unlinkSync(targetPath);
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('copy-file', (event, src, dest) => {
    try {
        const srcPath = path.resolve(process.cwd(), src);
        const destPath = path.resolve(process.cwd(), dest);
        fs.copyFileSync(srcPath, destPath);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('move-file', (event, src, dest) => {
    try {
        const srcPath = path.resolve(process.cwd(), src);
        const destPath = path.resolve(process.cwd(), dest);
        fs.renameSync(srcPath, destPath);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// === СИСТЕМА И СЕТЬ ===

ipcMain.handle('exec-command', (event, command) => {
    return new Promise((resolve) => {
        exec(command, {
            cwd: process.cwd(),
            timeout: 10000
        }, (error, stdout, stderr) => {
            resolve({
                error: error ? error.message : null,
                stdout: stdout,
                stderr: stderr
            });
        });
    });
});

ipcMain.handle('get-system-info', () => {
    return {
        platform: os.platform(),
        arch: os.arch(),
        totalMem: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        freeMem: (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        cpus: os.cpus().length,
        hostname: os.hostname(),
        user: os.userInfo().username,
        homeDir: os.homedir(),
        uptime: os.uptime()
    };
});

ipcMain.handle('get-network-info', () => {
    try {
        const interfaces = os.networkInterfaces();
        const networkInfo = [];
        for (const [name, iface] of Object.entries(interfaces)) {
            for (const details of iface) {
                if (details.family === 'IPv4' && !details.internal) {
                    networkInfo.push({
                        name,
                        address: details.address,
                        netmask: details.netmask,
                        mac: details.mac
                    });
                }
            }
        }
        return {
            success: true,
            hostname: os.hostname(),
            interfaces: networkInfo,
            totalMem: os.totalmem(),
            freeMem: os.freemem()
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('dns-lookup', (event, hostname) => {
    return new Promise((resolve) => {
        exec(`nslookup ${hostname}`, (error, stdout, stderr) => {
            resolve({
                error: error ? error.message : null,
                output: stdout || stderr
            });
        });
    });
});

ipcMain.handle('traceroute', (event, hostname) => {
    return new Promise((resolve) => {
        const command = process.platform === 'win32' ? `tracert ${hostname}` : `traceroute ${hostname}`;
        exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
            resolve({
                error: error ? error.message : null,
                output: stdout || stderr
            });
        });
    });
});

ipcMain.handle('check-port', (event, host, port) => {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 3000;
        socket.setTimeout(timeout);
        socket.on('connect', () => {
            socket.destroy();
            resolve({ success: true, open: true, message: `Port ${port} is OPEN on ${host}` });
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve({ success: true, open: false, message: `Port ${port} is CLOSED/FILTERED on ${host}` });
        });
        socket.on('error', () => {
            resolve({ success: true, open: false, message: `Port ${port} is CLOSED on ${host}` });
        });
        socket.connect(port, host);
    });
});

ipcMain.handle('scan-ports', (event, host, startPort, endPort) => {
    return new Promise((resolve) => {
        const results = [];
        let completed = 0;
        const safeStart = Math.max(1, startPort);
        const safeEnd = Math.min(1024, endPort);
        const total = safeEnd - safeStart + 1;

        if (total <= 0) {
            resolve({ success: true, results: [] });
            return;
        }

        for (let port = safeStart; port <= safeEnd; port++) {
            const socket = new net.Socket();
            socket.setTimeout(500);
            socket.on('connect', () => {
                results.push({ port, status: 'OPEN' });
                socket.destroy();
                checkComplete();
            });
            socket.on('timeout', () => {
                results.push({ port, status: 'FILTERED' });
                socket.destroy();
                checkComplete();
            });
            socket.on('error', () => {
                results.push({ port, status: 'CLOSED' });
                checkComplete();
            });
            socket.connect(port, host);
        }

        function checkComplete() {
            completed++;
            if (completed >= total) {
                resolve({ success: true, results });
            }
        }
        setTimeout(() => {
            if (completed < total) {
                resolve({ success: true, results, timeout: true });
            }
        }, 10000);
    });
});

// === КИБЕРБЕЗОПАСНОСТЬ ===

ipcMain.handle('generate-hash', (event, algorithm, data) => {
    try {
        const hash = crypto.createHash(algorithm).update(data).digest('hex');
        return { success: true, hash };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('generate-password', (event, length, options) => {
    try {
        const chars = {
            lower: 'abcdefghijklmnopqrstuvwxyz',
            upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            numbers: '0123456789',
            symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
        };
        let charset = chars.lower + chars.upper + chars.numbers;
        if (options.includeSymbols) charset += chars.symbols;

        let password = '';
        const array = new Uint32Array(length);
        crypto.randomFillSync(array);

        for (let i = 0; i < length; i++) {
            password += charset[array[i] % charset.length];
        }
        return { success: true, password };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('security-scan', (event, filePath) => {
    try {
        const targetPath = path.resolve(process.cwd(), filePath);
        const content = fs.readFileSync(targetPath, 'utf-8');
        const patterns = {
            'Potential Password': /password\s*[:=]\s*['"]?[\w@#$%^&*]+['"]?/gi,
            'API Key': /api[_-]?key\s*[:=]\s*['"]?[\w-]+['"]?/gi,
            'Private Key': /-----BEGIN (?:RSA |DSA |EC )?PRIVATE KEY-----/gi,
            'SQL Injection': /(SELECT|INSERT|UPDATE|DELETE|DROP|UNION).*FROM/gi,
            'XSS Pattern': /<script[^>]*>.*<\/script>/gi,
            'Email': /[\w.-]+@[\w.-]+\.\w+/gi,
            'IP Address': /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/gi,
            'Phone Number': /[+\d][\d\s-]{8,}\d/gi
        };
        const findings = [];
        for (const [type, pattern] of Object.entries(patterns)) {
            const matches = content.match(pattern);
            if (matches) {
                findings.push({
                    type,
                    count: matches.length,
                    samples: matches.slice(0, 3).map(m => m.substring(0, 50) + '...')
                });
            }
        }
        return {
            success: true,
            filePath,
            fileSize: content.length,
            findings,
            riskLevel: findings.length > 5 ? 'HIGH' : findings.length > 2 ? 'MEDIUM' : 'LOW'
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('security-log', (event, action, details) => {
    try {
        const logDir = path.join(HOME_DIR, '.nf-void-logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        const logFile = path.join(logDir, `security-${new Date().toISOString().split('T')[0]}.log`);
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${action}] ${details}\n`;
        fs.appendFileSync(logFile, logEntry);
        return { success: true, logFile };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('read-security-logs', (event, date) => {
    try {
        const logDir = path.join(HOME_DIR, '.nf-void-logs');
        const logFile = path.join(logDir, `security-${date}.log`);
        if (fs.existsSync(logFile)) {
            const content = fs.readFileSync(logFile, 'utf-8');
            return { success: true, content };
        } else {
            return { success: false, error: 'No logs found for this date' };
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('base64', (event, action, data) => {
    try {
        if (action === 'encode') {
            return { success: true, result: Buffer.from(data).toString('base64') };
        } else if (action === 'decode') {
            return { success: true, result: Buffer.from(data, 'base64').toString('utf-8') };
        }
        return { success: false, error: 'Invalid action' };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('verify-file', (event, filePath, expectedHash) => {
    try {
        const targetPath = path.resolve(process.cwd(), filePath);
        const content = fs.readFileSync(targetPath);
        const actualHash = crypto.createHash('sha256').update(content).digest('hex');
        return { success: true, actualHash, expectedHash, match: actualHash === expectedHash };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('get-processes', () => {
    return new Promise((resolve) => {
        const command = process.platform === 'win32' ? 'tasklist /FO JSON' : 'ps aux';
        exec(command, (error, stdout, stderr) => {
            if (error) resolve({ success: false, error: error.message });
            else resolve({ success: true, output: stdout });
        });
    });
});

ipcMain.handle('kill-process', (event, pid) => {
    return new Promise((resolve) => {
        const command = process.platform === 'win32' ? `taskkill /PID ${pid} /F` : `kill -9 ${pid}`;
        exec(command, (error, stdout, stderr) => {
            resolve({ success: !error, error: error ? error.message : null, output: stdout || stderr });
        });
    });
});

ipcMain.handle('show-open-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'] });
    return result;
});

// === ЗАПУСК ===

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});