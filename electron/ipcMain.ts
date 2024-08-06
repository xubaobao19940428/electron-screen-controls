import { ipcMain, desktopCapturer, BrowserWindow, app, screen } from 'electron'
import { otherWindowConfig } from './windowsConfig'
const robot = require('robotjs')
// import robot from 'robotjs'
// const Offset = 5
// const yTopOffset = 10
// function isValidArea(cx: number, cy: number, winx: number, winy: number, width: number, height: number) {
//     if ((cx < (winx + width - Offset) && cx > winx + Offset) && (cy < (winy + height - Offset) && cy > winy + yTopOffset))
//         return true
//     return false
// }
let ChildWin: BrowserWindow | null = null

export default {


    setDefaultMain() {
        /**
         *
         */
        ipcMain.handle('screen_share', async (event) => {
            return new Promise((resolve, reject) => {
                desktopCapturer
                    .getSources({ fetchWindowIcons: true, types: ['window', 'screen'] })
                    .then((sources) => {
                        let screenListWithPNG = sources.map((item) => ({
                            ...item,
                            appIconPNG: item.appIcon ? item.appIcon.toDataURL() : '',
                            thumbnailPNG: item.thumbnail.toDataURL(),
                        }))
                        resolve(screenListWithPNG)
                    })
                    .catch((error) => {
                        console.error('获取屏幕和窗口源时出错：', error)
                    })
            })
        })
        /**
         * @description 另开浏览器窗口
         */
        ipcMain.handle('open-window', (_event, arg) => {
            console.log('arg', arg)
            let parentID = _event.sender.id
            ChildWin = new BrowserWindow({
                titleBarStyle: "default",
                ...Object.assign(otherWindowConfig, {
                    title: arg.title,
                    parent: BrowserWindow.fromId(parentID),
                }),
            });
            // 开发模式下自动开启devtools
            if (process.env.NODE_ENV === "development") {
                ChildWin.webContents.openDevTools({ mode: "undocked", activate: true });
            }
            ChildWin.loadURL(arg.winURL + `#${arg.url}`);
            ChildWin.setTitle(arg?.title || '控制')
            ChildWin.once("ready-to-show", () => {
                ChildWin.show();
            });
            // 渲染进程显示时触发
            ChildWin.once("show", () => {
                ChildWin.webContents.send("send-data-test", arg.sendData);
            })
            app.commandLine.appendArgument('ignore-certificate-errors')
        })

        ipcMain.handle('mouse-move', (event, x, y) => {
            // console.log(x,y)
            // console.log('111111', screen.getCursorScreenPoint())
            const { width, height } = ChildWin.getContentBounds()
            // console.log('屏幕', width, height, x, y)
            if (x > width || y > height) {
                return
            }
            // robot.moveMouse(x, y);
        });

        ipcMain.handle('mouse-click', (event, button) => {
            console.log(button)
            // robot.typeString('Hello world')
            robot.mouseClick(button);
        });

        ipcMain.handle('key-press', (event, key) => {
            console.log(key)
            robot.keyTap(key);
        });
    }
}