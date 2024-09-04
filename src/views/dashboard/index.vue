<!--
 * index.vue
 * @author: AUTHOR
 * @description: DESCRIPTION
 * @since: 2024-08-05
-->
<template>
	<div class="container">
		<div class="container-content">
			<img src="@/assets/logo.jpg" alt="" />
			<div class="container-content-text">
				<div class="container-content-text-title">太振科技桌面远端控制系统</div>
				<div class="container-content-text-subtitle">
					{{ subtitle }}
				</div>
			</div>
		</div>
		<div class="container-bottom">
			<!-- <div class="container-bottom-1" style="width:200px;background-color:#ccc;border-radius: 4px;">
                
            </div> -->
			<div class="container-bottom-left">
				<div class="container-bottom-left-title">允许控制本机</div>
				<div class="container-bottom-left-content">
					<div class="container-bottom-left-content-title">本机识别码</div>
					<div class="container-bottom-left-content-content">{{ selfIdentificationCode.substring(0, 3) }} {{ selfIdentificationCode.substring(3, 6) }} {{ selfIdentificationCode.substring(6, 9) }}</div>
				</div>
				<div class="container-bottom-left-content">
					<div class="container-bottom-left-content-title">本机验证码（选填）</div>
					<div class="container-bottom-left-content-content">{{ selfVerificationCode.substring(0, 3) }} {{ selfVerificationCode.substring(3, 6) }} {{ selfVerificationCode.substring(6, 9) }}</div>
				</div>
			</div>
			<div class="container-bottom-right">
				<div class="container-bottom-left-title">控制远程识别码</div>
				<div class="container-bottom-left-content">
					<div class="container-bottom-left-content-title">伙伴识别码</div>
					<div class="container-bottom-left-content-content">
						<el-input v-model="identificationCodeValue" style="width: 240px" placeholder="输入想要控制桌面的识别码" />
						<!-- <el-select v-model="value" filterable allow-create default-first-option :reserve-keyword="false" placeholder="选择想要控制桌面的识别码" style="width: 240px">
							<el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value" />
						</el-select> -->
					</div>
				</div>
				<div class="container-bottom-left-content">
					<div class="container-bottom-left-content-title">验证码（选填）</div>
					<div class="container-bottom-left-content-content">
						<el-input v-model="verificationCodeValue" style="width: 240px" placeholder="请输入验证码" />
					</div>
				</div>
				<div class="container-bottom-left-content" style="margin-top: 80px">
					<el-button type="primary" style="width: 240px" round size="large" @click="concatOtherComputed">连接</el-button>
					<!-- <el-button type="primary" style="width: 240px" round size="large" @click="sendMessageToOverlay">测试窗口发送消息</el-button> -->
				</div>
			</div>
		</div>
		<!-- <canvas ref="fullscreenCanvas"></canvas> -->
	</div>
</template>

<script setup lang="ts" name="Home">
import { ref, onMounted } from 'vue'
import { ipcRenderer } from 'electron'
import { ElMessage } from 'element-plus'
import { LogLevel, Room, RoomEvent, setLogExtension, Track } from 'livekit-client'
import { emitter } from '@/utils/index'
// const fullscreenCanvas = ref(null)
function randomString(code, stringth) {
	let len = code
	let $chars = stringth
	let maxLen = $chars.length
	let pwd = ''
	for (let i = 0; i < len; i++) {
		pwd += $chars.charAt(Math.floor(Math.random() * maxLen))
	}
	return pwd
}
const selfIdentificationCode = ref<string>(randomString(9, '0123456789'))
const selfVerificationCode = ref<string>(randomString(9, 'abcdefhijkmnprstwxyz123456789'))
const identificationCodeValue = ref<string[]>('')
const verificationCodeValue = ref<string>('')
const webrtcWss = ref<string>('wss://webrtc.tz-yun.com')
const webrtcToken = ref<string>('')
let room: Room | null = null
const participants = ref([])
const isDevelopment = ref<boolean>(process.env.NODE_ENV === 'development' ? true : false)
const startSharing = async function (sourceId) {
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
	setInterval(async () => {
		const { width, height } = await ipcRenderer.invoke('screen-primary')
		console.log('获取到的屏幕大小', width, height)
		const encoder = new TextEncoder()
		const messageData = JSON.stringify({
			action: 'ScreenInfo',
			param: {
				w: width,
				h: height,
			},
		})
		const data = encoder.encode(messageData)
		room.localParticipant.publishData(data)
	}, 5000)
}
const options = [
	{
		value: 'HTML',
		label: 'HTML',
	},
	{
		value: 'CSS',
		label: 'CSS',
	},
	{
		value: 'JavaScript',
		label: 'JavaScript',
	},
]
const concatOtherComputed = function (): void {
	const winURL = process.env.NODE_ENV === 'development' ? `http://localhost:5173` : `file://${__dirname}/index.html`
	console.log(identificationCodeValue.value)
	if (!identificationCodeValue.value) {
		ElMessage.error('请输入识别码')
		return
	}
	ipcRenderer.invoke('open-window', {
		winURL: winURL,
		url: `/screenControls?roomName=${identificationCodeValue.value}`,
		title: '视频观看',
		resizable: true,
	})
}
function sendMessageToOverlay() {
	const data = [
		{ startX: 100, startY: 100, endX: 200, endY: 200 },
		{ startX: 150, startY: 150, endX: 250, endY: 250 },
	]
	ipcRenderer.send('message-from-main-window', data)
}
/**
 * @description:获取token
 */
const getToken = function () {
	ipcRenderer
		.invoke('create-token-spec', selfIdentificationCode.value)
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
				console.log('房间', room)
				ipcRenderer.invoke('screen_share').then((res) => {
					console.log('分享屏幕', res)
					// let screenShareArr = res.filter((item) => {
					// 	return item.id.includes('screen')
					// })
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
	// let screenShare = participants.value.filter((item) => {
	// 	return item.getTrack(Track.Source.ScreenShare)
	// })
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
	console.log('strData', strData)
	const messageData = JSON.parse(strData)
	if (messageData.action == 'Move') {
		// emitter.emit('move',messageData.param)
		ipcRenderer.send('message-from-main-window', {data: messageData.param})
	}

	// if (messageData.type == 'mousemove') {
	// 	ipcRenderer.invoke('mouse-move', messageData.x / messageData.width, messageData.y / messageData.height)
	// } else if (messageData.type == 'click') {
	// 	ipcRenderer.invoke('mouse-click', messageData.button)
	// } else if (messageData.type == 'keydown') {
	// 	ipcRenderer.invoke('key-press', messageData.key)
	// }
}
const handleDisconnect = function () {
	console.log('disconnected from room')
}
onMounted(async () => {
	if (!isDevelopment.value) {
		getToken()
		// ipcRenderer.invoke('init-tzrobot')
	}

	// ipcRenderer.invoke('screen-primary').then((res) => {
	// 	console.log('获取到的屏幕大小', res)
	// 	if (fullscreenCanvas.value) {
	// 		const canvas = fullscreenCanvas.value
	// 		const context = canvas.getContext('2d')
	// 		if (context) {
	// 			canvas.width = res.width
	// 			canvas.height = res.height

	// 			// 在 Canvas 上绘制内容
	// 			context.fillStyle = 'rgba(0, 0, 0, 0.5)'
	// 			context.fillRect(0, 0, canvas.width, canvas.height)
	// 		}
	// 	}
	// })
})
</script>

<style lang="scss" scoped>
.container {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	padding: 20px 40px 100px;
	box-sizing: border-box;
	align-items: center;
	position: relative;
	background-color: #000000;
	&-content {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		img {
			width: 50px;
		}
		&-text {
			margin-top: 20px;
			&-title {
				font-size: 20px;
				background: linear-gradient(270deg, #0b71d7, #5d78ee, #0c0cf0, #00ff00, #0000ff, #4b0082, #8b00ff);
				background-clip: text;
				color: transparent;
				text-shadow: 1px 1px 0px #fff;
			}
		}
	}
	.container-bottom {
		// width: 100%;
		margin-top: 40px;
		display: flex;
		justify-content: space-around;
		&-left,
		&-right {
			height: 100%;
			flex: 1;
			display: flex;
			flex-direction: column;
			padding-left: 40px;
			box-sizing: border-box;
			&-title {
				font-size: 20px;
				font-weight: bold;
			}
			&-content {
				margin-top: 20px;
				&-title {
					font-size: 14px;
					color: #ccc;
				}
				&-content {
					margin-top: 10px;
					font-size: 25px;
					font-weight: 500;
				}
			}
		}
		&-left {
			border-right: 1px solid #ccc;
			align-items: center;
			padding-right: 40px;
		}
	}
}
:deep().el-select__wrapper,
:deep().el-input__wrapper {
	background-color: transparent;
}
:deep(.el-input__inner) {
	color: #fff;
	font-size: 16px;
	font-weight: bold;
}
</style>
