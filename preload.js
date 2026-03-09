const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('terminalAPI', {
    // Навигация
    getCurrentDir: () => ipcRenderer.invoke('get-current-dir'),
    changeDir: (path) => ipcRenderer.invoke('change-dir', path),
    listDir: (path) => ipcRenderer.invoke('list-dir', path),

    // Файлы
    readFile: (path) => ipcRenderer.invoke('read-file', path),
    createFile: (name, content) => ipcRenderer.invoke('create-file', name, content),
    createDir: (name) => ipcRenderer.invoke('create-dir', name),
    delete: (name, recursive) => ipcRenderer.invoke('delete', name, recursive),
    copyFile: (src, dest) => ipcRenderer.invoke('copy-file', src, dest),
    moveFile: (src, dest) => ipcRenderer.invoke('move-file', src, dest),

    // Система
    execCommand: (cmd) => ipcRenderer.invoke('exec-command', cmd),
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

    // Сеть
    getNetworkInfo: () => ipcRenderer.invoke('get-network-info'),
    dnsLookup: (hostname) => ipcRenderer.invoke('dns-lookup', hostname),
    traceroute: (hostname) => ipcRenderer.invoke('traceroute', hostname),
    checkPort: (host, port) => ipcRenderer.invoke('check-port', host, port),
    scanPorts: (host, startPort, endPort) => ipcRenderer.invoke('scan-ports', host, startPort, endPort),

    // Безопасность
    generateHash: (algorithm, data) => ipcRenderer.invoke('generate-hash', algorithm, data),
    generatePassword: (length, options) => ipcRenderer.invoke('generate-password', length, options),
    securityScan: (filePath) => ipcRenderer.invoke('security-scan', filePath),
    securityLog: (action, details) => ipcRenderer.invoke('security-log', action, details),
    readSecurityLogs: (date) => ipcRenderer.invoke('read-security-logs', date),
    base64: (action, data) => ipcRenderer.invoke('base64', action, data),
    verifyFile: (filePath, expectedHash) => ipcRenderer.invoke('verify-file', filePath, expectedHash),
    getProcesses: () => ipcRenderer.invoke('get-processes'),
    killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),

    // Диалоги
    showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),

    // Приложение
    closeApp: () => ipcRenderer.send('close-app')
});