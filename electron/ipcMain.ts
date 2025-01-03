import { ipcMain, desktopCapturer, BrowserWindow, app, screen } from 'electron'
import { otherWindowConfig } from './windowsConfig'
import { AccessToken } from 'livekit-server-sdk'
// const robot = require('robotjs')
import path from 'path'
const { spawn } = require('child_process')
import os from 'os'
import axios from 'axios'
import {md5} from 'js-md5'
// 忽略 SSL 证书验证
const https = require('https');
const agent = new https.Agent({  
  rejectUnauthorized: false
});
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
const returnRobotjs = function () {
    let configFilePath = ''
    if (process.env.NODE_ENV === 'development') {
        configFilePath = process.cwd() + '/robotjs/build/Release/robotjs.node'
    } else {
        configFilePath = path.join(process.resourcesPath, '/robotjs/build/Release/robotjs.node')
    }
    return configFilePath
}
// const robot = require(returnRobotjs())
export default {

    setDefaultMain() {
        /**
         * @description 默认启动tzrobotjs
         */
        ipcMain.handle('init-tzrobot', (event) => {
            const tzrobotProcess = spawn(returnTzRobotPath())

            tzrobotProcess.on('exit', (code) => {
                console.log(`tzrobotjs进程退出，退出码：${code}`)
                setTimeout(() => {
                    spawn(returnTzRobotPath())
                }, 1000)
            })
            tzrobotProcess.on('message', (data) => {
                console.log('执行日志', data)
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
        /**
         * 拿到屏幕的分辨率
         */
        ipcMain.handle('screen-primary', (event) => {
            return new Promise((resolve, reject) => {
                const primaryDisplay = screen.getPrimaryDisplay();
                const { width, height } = primaryDisplay.workAreaSize;
                console.log(`屏幕分辨率: ${width}x${height}`);
                resolve({ width, height })
            })

        })

        ipcMain.handle('mouse-move', async (event, x, y) => {
            if (!ChildWin) return
            const { width, height } = ChildWin.getContentBounds()
            if (x > width || y > height) {
                return
            }
            const newX = x * width
            const newY = y * height
            // robot.moveMouse(newX, newY);
        });

        ipcMain.handle('mouse-click', (event, button) => {
            console.log(button)
            // robot.mouseClick(button);
        });

        ipcMain.handle('key-press', (event, key) => {
            console.log(key)
            // robot.keyTap(key)
        });

        ipcMain.handle('create-token-spec', async (event, roomName) => {
            try {
                const at = new AccessToken('dZR7JhW8IS4Nj2wvtTkcpK83b0D3UzTX', 'Z6j9hl7ZWvjuhFowhi1zy7xn11igICdx', {
                    identity: hostname + new Date().getTime(),
                    ttl: '7 days',
                })
                // if (process.env.NODE_ENV === "development") {
                //     at.addGrant({ roomJoin: true, room: roomName, canSubscribe: true, canPublish: true, hidden: false })
                // }
                // else {
                at.addGrant({ roomJoin: true, room: roomName, canSubscribe: true, canPublish: true, hidden: false })
                // }
                let token = await at.toJwt()
                console.log(token)
                return token
            } catch (error) {
                console.error('Error creating token:', error);
                throw error;
            }
        })
        /**
         * 拿到屏幕的分辨率
         */
        ipcMain.handle('screen-primary-tabbar', (event) => {
            return new Promise((resolve, reject) => {
                const primaryDisplay = screen.getPrimaryDisplay();
                const fullHeight = primaryDisplay.bounds.height;
                const workAreaHeight = primaryDisplay.workArea.height;
                const tabBarHeight = fullHeight - workAreaHeight;
                console.log('状态栏高度', tabBarHeight)
                // return tabBarHeight;
                resolve({ tabBarCoefficient: tabBarHeight / fullHeight })
            })

        })
        ipcMain.handle('fetch-data', async (event, url) => {
            try {
                let Time = new Date().getTime()
                const response = await axios.post(url, {
                },
                {
                    headers: {
                        'x-safe-time': Time,
                        'x-safe-token': md5(Time + '31bb19f84c6789827588e68a2e940b0d'),
                    },
                    httpsAgent: agent // 使用自定义的 https agent 忽略证书验证
                });
                console.log('token',response.data)
                return response.data.data;
            } catch (error) {
                return { error: error.message };
            }
        });
    }
}
