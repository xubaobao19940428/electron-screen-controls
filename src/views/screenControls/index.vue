<!--
 * index.vue
 * @author: AUTHOR
 * @description: DESCRIPTION
 * @since: 2024-08-06
-->
<template>
	<div class="container">
		<video autoplay id="video"></video>
		<canvas id="canvas"></canvas>
	</div>
</template>

<script setup name="ScreenControls">
import { ref, onMounted } from 'vue'

import { ipcRenderer } from 'electron'

import { LogLevel, Room, RoomEvent, setLogExtension, Track } from 'livekit-client'
import { useRoute } from 'vue-router'
const route = useRoute()
const webrtcWss = ref('wss://webrtc.tz-yun.com')
const webrtcToken = ref('')
let room = null
const participants = ref([])
const isDevelopment = ref(process.env.NODE_ENV === 'development' ? true : false)
const participantIdentity = ref('')
// const ws = new WebSocket('ws://192.168.0.19:8080/ping')
let keySequence = []
let sequenceTimer = null
const width = ref(1)
const height = ref(1)

/**
 * @description:获取token
 */
const getLocalToken = function (roomName) {
	ipcRenderer
		.invoke('create-token-spec', roomName)
		.then((token) => {
			console.log('获取到的token', token)
			webrtcToken.value = token
			liveKitRoomInit()
		})
		.catch((error) => {
			console.log('error', error)
		})
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
		// //连接状态发生更改
		// .on(RoomEvent.ConnectionStateChanged, connectionStateChange)

		// connect to room
		await room
			.connect(webrtcWss.value, webrtcToken.value)
			.then(async () => {
				console.log('房间连接成功', room.localParticipant)
			})
			.catch((error) => {
				console.warn(error)
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
const handleTrackSubscribed = async function (track) {
	onParticipantsChanged()
}
/**
 * 修改中要好好的想一想这个设计
 */
const onParticipantsChanged = function () {
	if (!room) return
	const remotes = Array.from(room.remoteParticipants.values())
	participants.value = remotes
	console.log(participants.value)
	let screenShare = participants.value.filter((item) => {
		return item.getTrackPublication(Track.Source.ScreenShare)
	})
	if (screenShare.length) {
		const videoDom = document.getElementById('video')
		screenShare[0].getTrackPublication(Track.Source.ScreenShare).track?.attach(videoDom)
		// participantIdentity.value
		// console.log(videoDom.scrollWidth)
		// console.log(videoDom.scrollHeight)
	}
}
/**
 * @description:数据接收
 * @param {*} payload
 * @param participant
 * @param kind
 */
const DataReceived = function (payload, participant, kind) {
	const decoder = new TextDecoder()
	const strData = decoder.decode(payload)
	// console.log('接收到的数据', strData)
	// console.log('strData', strData)
	// console.log('participant', participant)
	// console.log('kind', kind)
}
const handleDisconnect = function () {
	console.log('disconnected from room')
}
// todo 发送消息
onMounted(async () => {
	const roomName = route.query.roomName
	getLocalToken(roomName)
	// const videoDom = document.getElementById('video')
	const video = document.getElementById('video')
	const canvas = document.getElementById('canvas')
	const ctx = canvas.getContext('2d')
	// 视频加载后设置canvas宽高
	video.addEventListener('loadeddata', () => {
		canvas.width = video.clientWidth
		canvas.height = video.clientHeight

		drawFrame()
	})
	// 绘画功能
	let isDrawing = false
	let lastX = 0
	let lastY = 0
	let drawPath = []

	function draw(e) {
		if (!isDrawing) return
		ctx.strokeStyle = 'red'
		ctx.lineJoin = 'round'
		ctx.lineCap = 'round'
		ctx.lineWidth = 5

		ctx.beginPath()
		ctx.moveTo(lastX, lastY)
		ctx.lineTo(e.offsetX, e.offsetY)
		ctx.stroke()
		drawPath.push({ startX: lastX, startY: lastY, endX: e.offsetX, endY: e.offsetY })
		;[lastX, lastY] = [e.offsetX, e.offsetY]
        const encoder = new TextEncoder()
        const messageData = JSON.stringify({
			action: 'Move',
			param: drawPath,
		})
        const data = encoder.encode(messageData)
		room.localParticipant.publishData(data, { reliable: true })
	}

	canvas.addEventListener('mousedown', (e) => {
		console.log('22222')
		isDrawing = true
		console.log(e.offsetX, e.offsetY)
		;[lastX, lastY] = [e.offsetX, e.offsetY]
	})

	canvas.addEventListener('mousemove', draw)
	canvas.addEventListener('mouseup', () => (isDrawing = false))
	canvas.addEventListener('mouseout', () => (isDrawing = false))

	function drawFrame() {
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height) // 绘制视频帧

		// 重绘所有的绘制内容
		drawPath.forEach((path) => {
			ctx.strokeStyle = 'red'
			ctx.lineJoin = 'round'
			ctx.lineCap = 'round'
			ctx.lineWidth = 5
			ctx.beginPath()
			ctx.moveTo(path.startX, path.startY)
			ctx.lineTo(path.endX, path.endY)
			ctx.stroke()
		})

		requestAnimationFrame(drawFrame) // 循环调用
	}
	window.addEventListener('resize', function () {
		canvas.width = video.clientWidth
		canvas.height = video.clientHeight
	})
	const encoder = new TextEncoder()
	document.addEventListener('mouseup', (e) => {
		const messageData = JSON.stringify({
			action: 'Move',
			param: drawPath,
		})
        const data = encoder.encode(messageData)
		room.localParticipant.publishData(data, { reliable: true })
	})

	//下面是控制软件的功能
	// const encoder = new TextEncoder()
	// document.addEventListener('mousemove', (e) => {
	// 	// ws.send(JSON.stringify({"x":e.clientX,"y":e.clientY}))
	// 	// const messageData = JSON.stringify({
	// 	// 	x: e.clientX,
	// 	// 	y: e.clientY,
	// 	// 	width: videoDom.scrollWidth,
	// 	// 	height: videoDom.scrollHeight,
	// 	// 	type: 'mousemove',
	// 	// })
	// 	const messageData = JSON.stringify({
	// 		action: 'Move',
	// 		param: {
	// 			x: e.clientX,
	// 			y: e.clientY,
	// 			w: videoDom.scrollWidth,
	// 			h: videoDom.scrollHeight,
	// 		},
	// 	})
	// 	const data = encoder.encode(messageData)
	// 	room.localParticipant.publishData(data, { reliable: true, destinationIdentities: ['tzrobot'] })
	// 	// ipcRenderer.invoke('mouse-move', e.clientX, e.clientY)
	// })

	// document.addEventListener('mousedown', (e) => {
	// 	// const messageData = JSON.stringify({
	// 	// 	button: e.button === 0 ? 'left' : 'right',
	// 	// 	type: 'click',
	// 	// })
	// 	const messageData = JSON.stringify({ action: 'Click', param: e.button === 0 ? 'left' : 'right' })
	// 	const data = encoder.encode(messageData)
	// 	room.localParticipant.publishData(data, { reliable: true, destinationIdentities: ['tzrobot'] })
	// 	e.preventDefault()
	// 	// ipcRenderer.invoke('mouse-click', e.button === 0 ? 'left' : 'right')
	// })
	// // document.addEventListener('keydown', function (event) {
	// //     const key = event.key; // 获取按下的键
	// //     console.log(key)
	// //     // 如果定时器已经存在，清除它
	// //     if (sequenceTimer) {
	// //         clearTimeout(sequenceTimer);
	// //     }

	// //     // 将按下的键添加到键序列中
	// //     keySequence.unshift(key);

	// //     // 设置一个时间间隔，在间隔内如果没有按下其他键，就重置序列
	// //     sequenceTimer = setTimeout(() => {
	// //         const messageData = JSON.stringify({
	// //             "action": "KeyTap",
	// //             "param": keySequence
	// //         })
	// //         const data = encoder.encode(messageData)
	// //         room.localParticipant.publishData(data, { reliable: false, })
	// //         keySequence = [];
	// //     }, 500); // 500ms 内按下第二个键被认为是组合键
	// // });
	// document.addEventListener('keydown', (e) => {
	// 	console.log('keydown', e.key)
	// 	const messageData = JSON.stringify({
	// 		action: 'KeyTap',
	// 		param: {
	// 			key: e.key,
	// 		},
	// 	})
	// 	const data = encoder.encode(messageData)
	// 	room.localParticipant.publishData(data, { reliable: false, destinationIdentities: ['tzrobot'] })
	// })
})
</script>

<style lang="scss" scoped>
.container {
	width: 100%;
	height: 100%;
	overflow: hidden;
}

#video {
	width: 100%;
	height: 100%;
	object-fit: fill;
	overflow: auto;
	opacity: 1;
}
#canvas {
	width: 100%;
	height: 100%;
	border: 1px solid red;
	position: absolute;
	z-index: 100;
	left: 0;
	top: 0;
}
</style>
