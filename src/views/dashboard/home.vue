<template>
    <div class="container">
        <canvas ref="fullscreenCanvas" class="fullscreen-canvas"></canvas>
    </div>
</template>

<script setup lang="ts" name="Home">
import { ref, onMounted, reactive, onBeforeMount } from 'vue'
import { ipcRenderer } from 'electron'
import { LogLevel, Room, RoomEvent, setLogExtension, Track } from 'livekit-client'

interface DrawingPath {
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
    endTime?: number;
}

interface ParticipantCache {
    [key: string]: DrawingPath[][];
}
interface IsDrawing {
    [key: string]: boolean
}
const canvasCache = reactive<ParticipantCache>({});
// 变量声明
const webrtcWss = ref<string | null>('ws://192.168.0.140:7880')
const webrtcToken = ref('')
const serverUrl = ref<string | null>('https://192.168.0.140:30061')
const devicePixelRatio = window.devicePixelRatio || 1
// const canvasCache = ref([]) // 缓存绘制数据
const encoder = new TextEncoder()
const isDrawing = reactive<IsDrawing>({}) // 控制绘图状态
let cleanCanvasTimer: string | number | NodeJS.Timeout | null | undefined = null // 用于清除画布的定时器
let connectTimer = null // 重连定时器
let room: Room | null = null // WebRTC 房间对象
let reconnectTimer: number | null | undefined = null
const participants = ref([]) // 存储参与者列表
const fullscreenCanvas = ref(null) // 画布引用
const whetherToPaint = ref<boolean>(false)
const isDrawingPath = reactive<ParticipantCache>({})


const getGraffitiToken = async () => {
    let data = await ipcRenderer.invoke('fetch-data', `http://${serverUrl.value}/trailv2/api/iot/paint/token`)
    console.log(JSON.stringify(data))
    // webrtcWss.value = webrtcWss.value
    webrtcToken.value = data.token
    liveKitRoomInit()
    initCanvas()
}

// 开始共享屏幕
const startSharing = async (sourceId: string) => {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } },
    })
    const screenTrack = stream.getVideoTracks()[0]
    room?.localParticipant.publishTrack(screenTrack, {
        name: '屏幕分享',
        source: Track.Source.ScreenShare,
        stopMicTrackOnMute: true,
    })
    ipcRenderer.invoke('screen-primary-tabbar').then(data => {
        const { tabBarCoefficient } = data
        const messageData = JSON.stringify({
            type: 'tabBarCoefficient',
            data: tabBarCoefficient,
        })
        const sendData = encoder.encode(messageData)
        room?.localParticipant.publishData(sendData)

    })

}

// 获取 WebRTC 连接 Token 并初始化
// const getToken = () => {

//     webrtcToken.value = 'eyJhbGciOiJIUzI1NiJ9.eyJ2aWRlbyI6eyJyb29tSm9pbiI6dHJ1ZSwicm9vbSI6IjEyMzQ1NiIsImNhblN1YnNjcmliZSI6dHJ1ZSwiY2FuUHVibGlzaCI6dHJ1ZSwiaGlkZGVuIjpmYWxzZX0sImlzcyI6ImRaUjdKaFc4SVM0Tmoyd3Z0VGtjcEs4M2IwRDNVelRYIiwiZXhwIjoxNzI2NjMxNTY0LCJuYmYiOjAsInN1YiI6InFpYW5jaGVuZ2RlTWFjQm9vay1Qcm8tMy5sb2NhbDE3MjYwMjY3NjQxNTQifQ.V7hA49Le577Uc4EHBu2SdrSz5CuvaRLedPUWzWp9MUY' // 使用实际获取的 Token
//     liveKitRoomInit()
//     initCanvas()
// }

// 初始化 LiveKit 房间连接
const liveKitRoomInit = async () => {
    try {
        room = new Room({ adaptiveStream: false, dynacast: false, publishDefaults: { videoCodec: 'h264' }, disconnectOnPageLeave: true })

        // 订阅事件
        room.on(RoomEvent.TrackSubscribed, await handleTrackSubscribed)
            .on(RoomEvent.TrackUnsubscribed, await handleTrackUnsubscribed)
            // 房间元数据已更改
            .on(RoomEvent.RoomMetadataChanged, onParticipantsChanged)
            // 跟踪流状态已更改
            .on(RoomEvent.TrackStreamStateChanged, onParticipantsChanged)
            .on(RoomEvent.ParticipantConnected, onParticipantsChanged)
            .on(RoomEvent.ParticipantDisconnected, onParticipantsChanged)
            .on(RoomEvent.ConnectionQualityChanged, onParticipantsChanged)
            .on(RoomEvent.Disconnected, handleDisconnect)
            .on(RoomEvent.DataReceived, handleDataReceived)

        await room.connect(webrtcWss.value, webrtcToken.value)

        // 开始屏幕共享
        const screenId = await ipcRenderer.invoke('screen_share')
        startSharing(screenId[0].id)

        // 设置日志扩展
        setLogExtension((level, msg, context) => {
            const enhancedContext = { ...context, timeStamp: Date.now() }
            if (level >= LogLevel.debug) {
                console.log(level, msg, enhancedContext)
            }
        })
    } catch (e) {
        console.error('连接房间失败:', e)
    }
    //记录重新连接
    let reconnectIndex = 0
    reconnectTimer = window.setInterval(async () => {
        if (room && room.state === 'disconnected') {
            ++reconnectIndex
        }
        if (reconnectIndex == 2) {
            console.log('正在连接中')
            await room?.connect(webrtcWss.value, webrtcToken.value).finally(() => {
                reconnectIndex = 0
            })
            // 开始屏幕共享
            const screenId = await ipcRenderer.invoke('screen_share')
            startSharing(screenId[0].id)
        }
    }, 5000)
}

// 处理订阅轨道
const handleTrackSubscribed = (track: Track) => {
    console.log('订阅轨道:')
    onParticipantsChanged()
}

// 处理取消订阅轨道
const handleTrackUnsubscribed = () => {
    console.log('取消订阅轨道')
    onParticipantsChanged()
}

// 更新参与者状态
const onParticipantsChanged = () => {
    if (!room) return
    ipcRenderer.invoke('screen-primary-tabbar').then(data => {
        const { tabBarCoefficient } = data
        const messageData = JSON.stringify({
            type: 'tabBarCoefficient',
            data: tabBarCoefficient,
        })
        const sendData = encoder.encode(messageData)
        room?.localParticipant.publishData(sendData)

    })
    const remotes = Array.from(room.remoteParticipants.values())
    participants.value = [room?.localParticipant, ...remotes]
}

// 接收绘制数据
const handleDataReceived = (payload: AllowSharedBufferSource | undefined, participant: any, kind: any) => {
    //不做消息处理不绘制
    const decoder = new TextDecoder()
    const strData = decoder.decode(payload)
    const messageData = JSON.parse(strData)
    const data = messageData.param
    let identity = participant.identity
    // console.log('接收到的数据', data, devicePixelRatio)
    const canvas = fullscreenCanvas.value
    const context = canvas ? canvas.getContext('2d') : null
    //涂鸦
    if (whetherToPaint.value) {
        if (messageData.action === 'Move' && context) {
            isDrawing[identity] = true
            // 遍历绘制数据
            data.forEach((item: any) => {
                drawPath(context, item, canvas)
                if (!isDrawingPath[identity]) {
                    isDrawingPath[identity] = [];
                }
                isDrawingPath[identity].push(item)
            })
        } else if (messageData.action === 'End') {
            isDrawing[identity] = false
            console.log('结束数据', data)
            if (!canvasCache[identity]) {
                canvasCache[identity] = [];
            }
            canvasCache[identity].push(JSON.parse(JSON.stringify(isDrawingPath[identity]))); // 深拷贝
            canvasCache[identity][canvasCache[identity].length - 1].push({
                endTime: data.endTime,
            });
            console.log('canvasCache', canvasCache)
            isDrawingPath[identity] = []

        }
    }

}
// 绘制路径
const drawPath = (context: { strokeStyle: string; lineJoin: string; lineCap: string; lineWidth: number; beginPath: () => void; moveTo: (arg0: number, arg1: number) => void; lineTo: (arg0: number, arg1: number) => void; stroke: () => void; }, item: { videoWidth: number; videoHeight: number; startX: number; startY: number; endX: number; endY: number; }, canvas: { width: number; height: number; } | null) => {
    const scaleX = canvas.width / item.videoWidth / devicePixelRatio;
    const scaleY = canvas.height / item.videoHeight / devicePixelRatio;;
    const startX = item.startX * scaleX;
    const startY = item.startY * scaleY;
    const endX = item.endX * scaleX;
    const endY = item.endY * scaleY;
    context.strokeStyle = 'red'
    context.lineJoin = 'round'
    context.lineCap = 'round'
    context.lineWidth = 2
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
}

// 定时按顺序清除画布
const scheduleCleanCanvas = (context: { clearRect: (arg0: number, arg1: number, arg2: any, arg3: any) => void; }, canvas: { width: any; height: any; } | null) => {
    console.time();
    cleanCanvasTimer = window.setInterval(() => {
        Object.keys(canvasCache).forEach((key) => {
            if (canvasCache[key].length > 1 || (canvasCache[key].length === 1 && isDrawing[key] === false)) {
                let deletePath = canvasCache[key][0]
                let deletePathEndTime = deletePath[deletePath.length - 1] ? deletePath[deletePath.length - 1].endTime : 0
                if (deletePathEndTime && typeof deletePathEndTime === 'number' && new Date().getTime() - deletePathEndTime >= 5000) {
                    context.clearRect(0, 0, canvas?.width, canvas?.height) // 清空画布
                    let oldPath = canvasCache[key].shift()
                    for (var newKey in canvasCache) {
                        canvasCache[newKey].map(item => {
                            item.map(item => {
                                drawPath(context, item, canvas)
                                // context.strokeStyle = 'red';
                                // context.lineJoin = 'round';
                                // context.lineCap = 'round';
                                // context.lineWidth = 2;
                                // context.beginPath();
                                // context.moveTo(item.startX, item.startY);
                                // context.lineTo(item.endX, item.endY);
                                // context.stroke();
                            });
                        });
                    }
                }
            }
        })
        // if (canvasCache.value.length > 1 || (canvasCache.value.length === 1 && isDrawing.value === false)) {
        //     let deletePath = canvasCache.value[0]
        //     let deletePathEndTime = deletePath[deletePath.length - 1] ? deletePath[deletePath.length - 1].endTime : 0
        //     if (deletePathEndTime && typeof deletePathEndTime === 'number' && new Date().getTime() - deletePathEndTime >= 5000) {
        //         context.clearRect(0, 0, canvas?.width, canvas?.height);
        //         let oldPath = canvasCache.value.shift()
        //         canvasCache.value.map(item => {
        //             item.map(item => {
        //                 context.strokeStyle = 'red';
        //                 context.lineJoin = 'round';
        //                 context.lineCap = 'round';
        //                 context.lineWidth = 2;
        //                 context.beginPath();
        //                 context.moveTo(item.startX, item.startY);
        //                 context.lineTo(item.endX, item.endY);
        //                 context.stroke();
        //             });
        //         });
        //     }
        // }
    }, 1000)
}


// 处理断开连接
const handleDisconnect = (reason: any) => {
    console.log('reason', reason)
    // if (reason !== 1) {
    //     participants.value = []
    //     connectTimer = window.setTimeout(() => {
    //         room.connect(webrtcWss.value, webrtcToken.value).then(async () => {
    //             const screenId = await ipcRenderer.invoke('screen_share')
    //             startSharing(screenId[0].id)
    //         }).catch((error) => {
    //             console.warn(error)
    //             // 开始屏幕共享

    //         })
    //     }, 5000)
    // }
}

// 初始化 Canvas
const initCanvas = () => {
    const canvas = fullscreenCanvas.value
    if (canvas) {
        const context = canvas.getContext('2d')
        if (context) {
            const ratio = devicePixelRatio || 1
            canvas.width = window.innerWidth * ratio
            canvas.height = window.innerHeight * ratio
            context.scale(ratio, ratio)
            context.clearRect(0, 0, canvas.width, canvas.height)
        }
    }
}
onBeforeMount(() => {
    if (reconnectTimer) {
        window.clearTimeout(reconnectTimer)
        reconnectTimer = null
    }
    if (room) {
        room.disconnect()
    }
})

onMounted(async () => {
    if (localStorage.getItem('serverUrl')) {
        serverUrl.value = localStorage.getItem('serverUrl')
        webrtcWss.value = 'ws://' + localStorage.getItem('webrtcWsUrl')
        const storedValue = localStorage.getItem('whetherToPaint');
        whetherToPaint.value = storedValue === 'true' ? true : storedValue === 'false' ? false : false;
    }
    await getGraffitiToken()
    const canvas = fullscreenCanvas.value
    const context = canvas ? canvas.getContext('2d') : null
    scheduleCleanCanvas(context, canvas)
})
</script>

<style lang="scss" scoped>
.container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: rgba(0, 0, 0, 0);

    .fullscreen-canvas {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
        pointer-events: none;
        background-color: transparent;
    }
}
</style>