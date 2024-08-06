
import { BrowserWindowConstructorOptions } from "electron";

export const mainWindowConfig: BrowserWindowConstructorOptions = {
    height: 800,
    useContentSize: true,
    width: 1700,
    minWidth: 1366,
    show: false,
    frame: false,
    webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
        webSecurity: false,
        // 如果是开发模式可以使用devTools
        devTools: process.env.NODE_ENV === "development",
        // 在macos中启用橡皮动画
        scrollBounce: process.platform === "darwin",
    },
};

export const otherWindowConfig: BrowserWindowConstructorOptions = {
    height: 595,
    useContentSize: true,
    width: 1140,
    autoHideMenuBar: true,
    minWidth: 842,
    frame: true,
    show: false,
    //窗口大小是否可调整
    resizable:  true,
    //窗口透明度
    opacity: 1.0,
    movable:true,
    closable:true,
    fullscreenable:true,
    //当前窗口的父窗口ID
    webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
        webSecurity: false,
        // 如果是开发模式可以使用devTools
        devTools: process.env.NODE_ENV === "development",
        // 在macos中启用橡皮动画
        scrollBounce: process.platform === "darwin",
    },
};
