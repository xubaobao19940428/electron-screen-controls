import { app, BrowserWindow, systemPreferences, screen, ipcMain, Tray, Menu, dialog } from 'electron';
import setIpc from './ipcMain'
import path from 'path'
let mainWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let settingWindow: BrowserWindow | null = null
let appTray: Tray | null = null;
const gotTheLock = app.requestSingleInstanceLock(); // 确保应用只启动一个实例
const returnTrayIcontPath = function () {
    let configFilePath = ''
    if (process.env.NODE_ENV === 'development') {
        configFilePath = process.cwd() + '/trayIcon/icon_32x32.png'
    } else {
        configFilePath = path.join(process.resourcesPath, 'trayIcon/icon_32x32.png')
    }
    return configFilePath
}
const iconPath = returnTrayIcontPath()
// 监听来自渲染进程的关闭设置窗口请求
ipcMain.on('close-setting-window', () => {
    if (settingWindow) {
        settingWindow.close(); // 关闭设置窗口
        settingWindow = null;  // 清空引用
    }
});

/**
 * 创建系统托盘
 */
function createAppTray() {
    //系统托盘
    appTray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '开发者模式',
            type: 'radio',
            click: () => {

                mainWindow?.webContents.openDevTools({ mode: 'detach' });
            }
        },
        {
            label: '设置',
            type: 'radio',
            click: () => {
                if (settingWindow) {
                    settingWindow.show()
                } else {
                    settingWindow = new BrowserWindow({
                        width: 400,
                        height: 500,
                        webPreferences: {
                            nodeIntegration: true,
                            contextIsolation: false,
                            backgroundThrottling: false,
                        },
                    })
                    settingWindow.on('closed', () => {
                        settingWindow = null; // 在窗口关闭时，重置窗口对象
                    });
                    if (process.env.VITE_DEV_SERVER_URL) {
                        settingWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '/#/setting')
                    } else {
                        settingWindow.loadFile(path.resolve(__dirname, '../dist/index.html'), {
                            hash: '#/setting',
                        });
                    }
                }
            }
        },
        // {
        //     label: '休息哦啊话',
        //     type: 'radio',
        //     click: () => {
        //         mainWindow?.minimize() // 关闭窗口
        //         // app.quit(); // 完全退出应用
        //     }
        // },
        {
            label: '关闭',
            type: 'radio',
            click: () => {
                mainWindow?.close(); // 关闭窗口
                app.quit(); // 完全退出应用
            }
        }
    ]);
    appTray.setContextMenu(contextMenu)
    //系统托盘的提示文本
    appTray.setToolTip('太振科技');
    //点击系统托盘打开窗口
    appTray.on('click', () => {
        mainWindow?.show()
    });
}
try {
    setIpc.setDefaultMain()
    const createdWindow = () => {
        // 确保 screen 模块可用，并获取显示器信息
        const primaryDisplay = screen.getPrimaryDisplay();

        if (!primaryDisplay || !primaryDisplay.bounds) {
            console.error('Error: Unable to get primary display bounds');
            return;
        }

        const { width, height } = primaryDisplay.workAreaSize;
        mainWindow = new BrowserWindow({
            x: 0,
            y: 0,
            width: width,
            height: height,
            frame: false,
            transparent: true, // 透明主窗口
            alwaysOnTop: true, // 主窗口始终在最上层
            skipTaskbar: true, // 主窗口不出现在任务栏中
            // fullscreenable: true, // 允许全屏
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                backgroundThrottling: false,
            }
        })
        // 监听窗口最小化事件
        mainWindow.on('minimize', (event) => {
            // 阻止窗口默认的最小化行为
            event.preventDefault();

            // 弹出确认对话框
            dialog.showMessageBox(mainWindow, {
                type: 'question',
                buttons: ['确认', '取消'],
                defaultId: 0, // 默认选择确认
                cancelId: 1, // 取消按钮的索引
                title: '庭审同屏绘画',
                message: '庭审同屏绘画无法最小化请按确认或取消都可以'
            }).then(result => {
                if (result.response === 0) { // 如果点击了确认
                    // mainWindow?.minimize(); // 手动最小化窗口
                } else {
                    mainWindow?.restore(); // 如果点击了取消，恢复窗口
                }
            });
        });

        mainWindow.on('restore', () => {
            console.log('窗口已恢复');
        });
        if (process.env.VITE_DEV_SERVER_URL) {
            mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
        } else {
            mainWindow.loadFile(path.resolve(__dirname, '../dist/index.html'));
        }
        mainWindow.setIgnoreMouseEvents(true)
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        // getTaskbarHeight()
        // getStatusBarHeight()
        // 拦截窗口关闭事件，隐藏窗口而不是退出应用
        // mainWindow.on('close', (event) => {
        //     event.preventDefault() // 阻止窗口默认关闭行为
        //     mainWindow.hide() // 隐藏窗口
        // })
        // 监听消息并转发到 overlayWindow
        // ipcMain.on('message-from-main-window', (event, data) => {
        //     if (overlayWindow) {
        //         console.log('mainwinodw发送的消息', data)
        //         overlayWindow.webContents.send('message-to-overlay', data);
        //     }
        // });
    }
    if (!gotTheLock) {
        // 如果已经有一个实例在运行，则退出新实例
        app.quit();
    } else {
        app.on('second-instance', (event, commandLine, workingDirectory) => {
            // 当试图启动第二个实例时，将现有实例的窗口带到前台
            if (mainWindow) {
                if (mainWindow.isMinimized()) {
                    mainWindow.restore();
                }
                mainWindow.focus();
            }
        });

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
        app.commandLine.appendSwitch('ignore-certificate-errors')

        app.whenReady().then(async () => {
            // const hasPermission = await requestScreenCapturePermission();

            // if (!hasPermission) {
            //     console.error('Screen capture permission is required');
            //     app.quit();
            //     return;
            // }
            //创建系统托盘
            createAppTray()
            createdWindow()
            // createOverlayWindow()
        })
        // 解决9.x跨域异常问题
        app.disableHardwareAcceleration();
        app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors')

        app.commandLine.appendArgument('no-sandbox')
        app.commandLine.appendArgument('disable-setuid-sandbox')
        app.commandLine.appendArgument('disable-web-security')
        app.commandLine.appendArgument('ignore-certificate-errors')

        app.commandLine.appendSwitch('disable-site-isolation-trials')
        app.commandLine.appendSwitch('enable-quic')

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createdWindow();
            }
        });
    }


} catch (error) {

}

