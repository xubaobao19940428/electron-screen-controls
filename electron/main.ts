import { app, BrowserWindow, systemPreferences } from 'electron';
import setIpc from './ipcMain'
import path from 'path'
let mainWindow: BrowserWindow | null = null

try {
    setIpc.setDefaultMain()
    const createdWindow = () => {
        mainWindow = new BrowserWindow({
            width: 900,
            height: 600,
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

