<!--
 * index.vue
 * @author: AUTHOR
 * @description: DESCRIPTION
 * @since: 2024-08-05
-->
<template>
    <div class="container">
        <canvas ref="fullscreenCanvas" class="fullscreen-canvas"></canvas>
    </div>
</template>

<script setup lang="ts" name="Home">
import { ref, onMounted } from 'vue'
import { ipcRenderer } from 'electron'
import { LogLevel, Room, RoomEvent, setLogExtension, Track } from 'livekit-client'
const webrtcWss = ref<string>('wss://webrtc.tz-yun.com')
const webrtcToken = ref<string>('')
const devicePixelRatio = window.devicePixelRatio || 1

const canvasCache = ref([])

const isDrawing = ref(false)
let cleanCanvasTimer: number | null | undefined = null //重新绘制画布定时器


let room: Room | null = null

const participants = ref([])

const fullscreenCanvas = ref(null)
const startSharing = async function (sourceId: any) {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId,
            },
        },
    })
    console.log('stream', stream)
    const screenTrack = stream.getVideoTracks()[0]
    console.log('screenTrack', screenTrack)
    room.localParticipant.publishTrack(screenTrack, {
        name: '屏幕分享',
        source: Track.Source.ScreenShare,
        stopMicTrackOnMute: true,
    })
}

/**
 * @description:获取token
 */
const getToken = function () {
    // ipcRenderer
    //     .invoke('create-token-spec', '123456')
    //     .then((token) => {
    //         console.log('获取到的token', token)
            // webrtcToken.value = token
            // liveKitRoomInit()
        // })
        // .catch((error) => {
        //     console.log('error', error)
        // })
    webrtcToken.value = 'eyJhbGciOiJIUzI1NiJ9.eyJ2aWRlbyI6eyJyb29tSm9pbiI6dHJ1ZSwicm9vbSI6IjEyMzQ1NiIsImNhblN1YnNjcmliZSI6dHJ1ZSwiY2FuUHVibGlzaCI6dHJ1ZSwiaGlkZGVuIjpmYWxzZX0sImlzcyI6IlJUT1VDMkNiS3VyT0NyNkpyOHA3M2lVYWhwTjJ1TjJsIiwiZXhwIjoxNzI2NDc3NTY5LCJuYmYiOjAsInN1YiI6InFpYW5jaGVuZ2RlTWFjQm9vay1Qcm8tMy5sb2NhbDE3MjU4NzI3Njk4ODQifQ.GwGAP_GDx-m-iemZULlhcjDTi5Yr6IUIbJ21XB98s0E'
    liveKitRoomInit()
    initCanvas()
}
const liveKitRoomInit = async function () {
    try {
        // 初始化房间
        room = new Room({
            // automatically manage subscribed video quality
            adaptiveStream: false,
            // optimize publishing bandwidth and CPU for published tracks
            dynacast: false,
            publishDefaults: {
                videoCodec: 'h264',
            },
        })
        // 轨道订阅
        room.on(RoomEvent.TrackSubscribed, await handleTrackSubscribed)
            // 取消订阅
            .on(RoomEvent.TrackUnsubscribed, await handleTrackSubscribed)
            .on(RoomEvent.ParticipantConnected, onParticipantsChanged)
            .on(RoomEvent.ParticipantDisconnected, onParticipantsChanged)
            //连接质量修改
            .on(RoomEvent.ConnectionQualityChanged, onParticipantsChanged)
            // // 断开的
            .on(RoomEvent.Disconnected, handleDisconnect)
            // 房间元数据已更改
            .on(RoomEvent.RoomMetadataChanged, onParticipantsChanged)
            // 跟踪流状态已更改
            .on(RoomEvent.TrackStreamStateChanged, onParticipantsChanged)
            // 轨道出版
            .on(RoomEvent.TrackPublished, onParticipantsChanged)
            // 收到的数据
            .on(RoomEvent.DataReceived, DataReceived)
            // 本地曲目未发布
            .on(RoomEvent.LocalTrackPublished, onParticipantsChanged)
            .on(RoomEvent.LocalTrackUnpublished, onParticipantsChanged)
        await room
            .connect(webrtcWss.value, webrtcToken.value)
            .then(async () => {
                console.log('房间', room)
                ipcRenderer.invoke('screen_share').then((res) => {
                    console.log('分享屏幕', res)
                    startSharing(res[0].id)
                })
            })
            .catch((error) => {
                console.warn('error', error)
            })
        // 房间的状态
        // 设置日志
        setLogExtension((level, msg, context) => {
            const enhancedContext = {
                ...context,
                timeStamp: Date.now(),
            }
            if (level >= LogLevel.debug) {
                console.log(level, msg, enhancedContext)
            }
        })
    } catch (e) {
        console.log(e)
    }
}
const handleTrackSubscribed = async function (track: Track) {
    onParticipantsChanged()
}
/**
 * 修改中要好好的想一想这个设计
 */
const onParticipantsChanged = function () {
    if (!room) return
    const remotes = Array.from(room.remoteParticipants.values())
    const localParticipant = [room.localParticipant]
    localParticipant.push(...remotes)
    participants.value = localParticipant
}
/**
 * @description:数据接收
 * @param {*} payload
 * @param participant
 * @param kind
 */
const DataReceived = function (payload: AllowSharedBufferSource | undefined, participant: any, kind: any) {
    const decoder = new TextDecoder()
    const strData = decoder.decode(payload)
    // console.log('strData', strData)
    const messageData = JSON.parse(strData)
    const data = messageData.param
    // 重新获取 canvas 和 context，确保绘制环境正确
    const canvas = fullscreenCanvas.value
    const context = canvas ? canvas.getContext('2d') : null
    if (messageData.action == 'Move') {
        isDrawing.value = true
        if (cleanCanvasTimer) {
            window.clearInterval(cleanCanvasTimer)
        }
        try {

            if (context && data) {
                // console.log('Received data from mainWindow:', data)
                // 遍历数据并绘制到画布上
                data.forEach((item) => {
                    context.strokeStyle = 'red'
                    context.lineJoin = 'round'
                    context.lineCap = 'round'
                    context.lineWidth = 2
                    context.beginPath()
                    context.moveTo((item.startX / item.videoWidth * canvas.width / devicePixelRatio).toFixed(13), (item.startY / item.videoHeight * canvas.height / devicePixelRatio).toFixed(13))
                    context.lineTo((item.endX / item.videoWidth * canvas.width / devicePixelRatio).toFixed(13), (item.endY / item.videoHeight * canvas.height / devicePixelRatio).toFixed(13))
                    context.stroke()
                })
            }
        } catch (error) {
            console.error('Error during message processing:', error)
        }
    } else if (messageData.action == 'End') {
        isDrawing.value = false;
        // 重新获取 canvas 和 context，确保绘制环境正确
        canvasCache.value.push(JSON.parse(JSON.stringify(data)))
       
        cleanCanvasTimer = window.setInterval(() => {
            if (!isDrawing.value) {
                console.log('结束', canvasCache.value)
                context.clearRect(0, 0, canvas.width, canvas.height);
                canvasCache.value.shift()
                canvasCache.value.map((item: any) => {
                    item.map((path: { startX: any; startY: any; endX: any; endY: any; videoWidth: any, videoHeight: any }) => {
                        context.strokeStyle = 'red'
                        context.lineJoin = 'round'
                        context.lineCap = 'round'
                        context.lineWidth = 2
                        context.beginPath();
                        context.moveTo((path.startX / path.videoWidth * canvas.width / devicePixelRatio).toFixed(13), (path.startY / path.videoHeight * canvas.heigh / devicePixelRatio).toFixed(13))
                        context.lineTo((path.endX / path.videoWidth * canvas.width / devicePixelRatio).toFixed(13), (path.endY / path.videoHeight * canvas.height / devicePixelRatio).toFixed(13))
                        context.stroke();
                    })
                })
            }
        }, 5000)
    }
}
const handleDisconnect = function () {
    console.log('disconnected from room')
}

const initCanvas = function () {
    if (fullscreenCanvas.value) {
        const canvas = fullscreenCanvas.value;
        const context = canvas.getContext('2d');
        if (context) {
            // 提升画布分辨率
            const ratio = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * ratio;
            canvas.height = window.innerHeight * ratio;
            context.scale(ratio, ratio);  // 按比例缩放
            console.log('Canvas initialized with width:', canvas.width, 'and height:', canvas.height);

            // 清除画布，确保背景透明
            context.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
};
onMounted(async () => {
    getToken()
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
        /* 确保 Canvas 始终覆盖整个屏幕 */
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
        /* 确保 Canvas 在最上层 */
        pointer-events: none;
        /* 使 Canvas 不影响下面的操作 */
        background-color: transparent;
        /* 确保 Canvas 背景透明 */
        // border: 1px solid red;
    }
}
</style>
