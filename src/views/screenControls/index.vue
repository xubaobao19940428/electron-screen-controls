<!--
 * index.vue
 * @author: AUTHOR
 * @description: DESCRIPTION
 * @since: 2024-08-06
-->
<template>
	<div class="container">
		<video autoplay id="video"></video>
	</div>
</template>

<script setup name="ScreenControls">
import { ref, onMounted } from 'vue'

import { ipcRenderer } from 'electron'

import { LogLevel, Room, RoomEvent, setLogExtension, Track } from 'livekit-client'
const webrtcWss = ref('ws://192.168.0.87:7880')
const webrtcToken = ref('')
let room = null
const participants = ref([])
const isDevelopment = ref(process.env.NODE_ENV === 'development' ? true : false)
const participantIdentity = ref('')
const ws = new WebSocket('ws://192.168.0.19:8080/ping')
/**
 * @description:获取token
 */
const getLocalToken = function () {
	ipcRenderer
		.invoke('create-token-spec', '111', '222', '3333')
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
	// console.log('strData', strData)
	// console.log('participant', participant)
	// console.log('kind', kind)
}
const handleDisconnect = function () {
	console.log('disconnected from room')
}
// todo 发送消息
onMounted(() => {
	getLocalToken()
    const encoder = new TextEncoder()
	document.addEventListener('mousemove', (e) => {
		// ws.send(JSON.stringify({"x":e.clientX,"y":e.clientY}))
		// const messageData = JSON.stringify({
		// 	x: e.clientX,
		// 	y: e.clientY,
		// 	width: videoDom.scrollWidth,
		// 	height: videoDom.scrollHeight,
		// 	type: 'mousemove',
		// })
		const messageData = JSON.stringify({
			x: e.clientX,
			y: e.clientY,
			t: 0,
		})
		const data = encoder.encode(messageData)
		room.localParticipant.publishData(data, { reliable: true })
		// ipcRenderer.invoke('mouse-move', e.clientX, e.clientY)
	})

	document.addEventListener('click', (e) => {
		const messageData = JSON.stringify({
			button: e.button === 0 ? 'left' : 'right',
			type: 'click',
		})
		const data = encoder.encode(messageData)
		room.localParticipant.publishData(data, { reliable: true, destinationIdentities: ['tzrobot'] })
		// ipcRenderer.invoke('mouse-click', e.button === 0 ? 'left' : 'right')
	})

	document.addEventListener('keydown', (e) => {
		console.log('keydown', e.key)
		// const messageData = JSON.stringify({
		// 	key:e.key,
		// 	type: 'keydown',
		// })
		const messageData = JSON.stringify({
			k: e.key,
			t: 1,
		})
		const data = encoder.encode(messageData)
		room.localParticipant.publishData(data, { reliable: false, destinationIdentities: ['tzrobot'] })
	})
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
	// height: 100%;
	object-fit: fill;
	overflow: auto;
}
</style>
