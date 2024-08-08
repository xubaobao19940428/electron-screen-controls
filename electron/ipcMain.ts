import { ipcMain, desktopCapturer, BrowserWindow, app } from 'electron'
import { otherWindowConfig } from './windowsConfig'
import { AccessToken } from 'livekit-server-sdk'
const robot = require('robotjs')
import path from 'path'
const { spawn } = require('child_process')
import os from 'os'
// // import ffi from 'ffi-napi'
// var ffi = require('ffi-napi');// 指定路径注册函数
// var libm = ffi.Library('../main.dylib',
//      {'helloP': [ 'string', [ 'string' ,ffi.Function("void",['string','string']),'string'] ]});
//     //  console.log(libm.helloP("1111",function (a,b){console.log(a,b)},"222"))

const hostname = os.hostname()
let ChildWin: BrowserWindow | null = null
const returnTzRobotPath = function () {
    let configFilePath = ''
    if (process.env.NODE_ENV === 'development') {
        configFilePath = process.cwd() + '/tzrobot/tzrobot'
    } else {
        configFilePath = path.join(process.resourcesPath, 'tzrobot/tzrobot')
    }
    return configFilePath
}
export default {
    setDefaultMain() {
        /**
         * @description 默认启动tzrobotjs
         */
        ipcMain.handle('init-tzrobot', (event) => {
            const tzrobotProcess = spawn(returnTzRobotPath())

            tzrobotProcess.on('exit', (code) => {
                console.log(`tzrobotjs进程退出，退出码：${code}`)
                setTimeout(()=>{
                    spawn(returnTzRobotPath())
                },1000)
            })
        })
        /**
         * @description 屏幕分享
         */
        ipcMain.handle('screen_share', async (event) => {
            return new Promise((resolve, reject) => {
                desktopCapturer
                    .getSources({ fetchWindowIcons: true, types: ['screen'] })
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
                        reject(error)
                    })
            })
        })

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
            if (process.env.NODE_ENV === "development") {
                ChildWin.webContents.openDevTools({ mode: "undocked", activate: true });
            }
            ChildWin.loadURL(arg.winURL + `#${arg.url}`);
            ChildWin.setTitle(arg?.title || '控制')
            ChildWin.once("ready-to-show", () => {
                ChildWin.show();
            });
            ChildWin.once("show", () => {
                ChildWin.webContents.send("send-data-test", arg.sendData);
            })
            app.commandLine.appendArgument('ignore-certificate-errors')
        })

        ipcMain.handle('mouse-move', async (event, x, y) => {
            if (!ChildWin) return
            const { width, height } = ChildWin.getContentBounds()
            if (x > width || y > height) {
                return
            }
            const newX = x * width
            const newY = y * height
            robot.moveMouse(newX, newY);
        });

        ipcMain.handle('mouse-click', (event, button) => {
            console.log(button)
            robot.mouseClick(button);
        });

        ipcMain.handle('key-press', (event, key) => {
            console.log(key)
            robot.keyTap(key)
        });

        ipcMain.handle('create-token-spec', async (event, participantName, roomName, devType) => {
            try {
                const at = new AccessToken('dZR7JhW8IS4Nj2wvtTkcpK83b0D3UzTX', 'Z6j9hl7ZWvjuhFowhi1zy7xn11igICdx', {
                    identity: hostname + new Date().getTime(),
                    ttl: '7 days',
                })
                if (process.env.NODE_ENV === "development") {
                    at.addGrant({ roomJoin: true, room: '123456', canSubscribe: true, canPublish: true, hidden: true })
                } else {
                    at.addGrant({ roomJoin: true, room: '123456', canSubscribe: false, canPublish: true, hidden: false })
                }
                let token = await at.toJwt()
                return token
            } catch (error) {
                console.error('Error creating token:', error);
                throw error;
            }
        })
    }
}
