import { app, BrowserWindow, systemPreferences, screen, ipcMain } from 'electron';
import setIpc from './ipcMain'
import path from 'path'
let mainWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
try {
    setIpc.setDefaultMain()
    const createdWindow = () => {
        mainWindow = new BrowserWindow({
            width: 900,
            height: 600,

            // transparent: true,
            webPreferences: {
                // preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: true,
                contextIsolation: false,
            }
        })

        if (process.env.VITE_DEV_SERVER_URL) {
            mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
        } else {
            mainWindow.loadFile(path.resolve(__dirname, '../dist/index.html'));
        }
        // 监听消息并转发到 overlayWindow
        ipcMain.on('message-from-main-window', (event, data) => {
            if (overlayWindow) {
                console.log('mainwinodw发送的消息', data)
                overlayWindow.webContents.send('message-to-overlay', data);
            }
        });
    }

    function createOverlayWindow() {
        const { width, height } = screen.getPrimaryDisplay().workAreaSize

        // 创建全屏透明窗口
        overlayWindow = new BrowserWindow({
            x: 0,
            y: 0,
            width: width,
            height: height,
            // fullscreen: true,
            frame: false,
            transparent: true, // 透明主窗口
            alwaysOnTop: true, // 主窗口始终在最上层
            skipTaskbar: true, // 主窗口不出现在任务栏中
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                backgroundThrottling: false,
            },
        })

        // overlayWindow.loadURL('http://localhost:5173/#/overlay') // 加载包含 Canvas 的页面
        console.log(process.env.VITE_DEV_SERVER_URL)
        if (process.env.VITE_DEV_SERVER_URL) {
            overlayWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '/#/overlay')
        } else {
            overlayWindow.loadFile(path.resolve(__dirname, '../dist/index.html'), {
                hash: '#/overlay',
            });
        }
        overlayWindow.setIgnoreMouseEvents(true)

    }

    app.on('window-all-closed', () => {
        mainWindow = null
        app.quit()
    })
    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
        //允许私有证书
        event.preventDefault()
        callback(true)
    })
    async function requestScreenCapturePermission() {
        if (process.platform === 'darwin') {
            const screenCapturePermission = systemPreferences.getMediaAccessStatus('screen');
            console.log('Screen capture permission status:', screenCapturePermission);

            if (screenCapturePermission !== 'granted') {
                const result = await systemPreferences.askForMediaAccess('screen');
                console.log('Screen capture permission result:', result);

                if (!result) {
                    console.log('Screen capture permission denied');
                }

                return result;
            }

            return true;
        }

        return false;
    }
    app.whenReady().then(async () => {
        // const hasPermission = await requestScreenCapturePermission();

        // if (!hasPermission) {
        //     console.error('Screen capture permission is required');
        //     app.quit();
        //     return;
        // }
        createdWindow()
        createOverlayWindow()
    })
    // 解决9.x跨域异常问题
    app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors')

    app.commandLine.appendArgument('no-sandbox')
    app.commandLine.appendArgument('disable-setuid-sandbox')
    app.commandLine.appendArgument('disable-web-security')
    app.commandLine.appendArgument('ignore-certificate-errors', true)

    app.commandLine.appendSwitch('disable-site-isolation-trials')
    app.commandLine.appendSwitch('enable-quic')
} catch (error) {

}

