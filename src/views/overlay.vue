<template>
	<div class="container">
		<canvas ref="fullscreenCanvas" class="fullscreen-canvas"></canvas>
	</div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ipcRenderer } from 'electron'

const fullscreenCanvas = ref(null)

onMounted(() => {
    // console.log('获取到canvas',1111)
	if (fullscreenCanvas.value) {
		const canvas = fullscreenCanvas.value
		const context = canvas.getContext('2d')
        
		if (context) {
			// 设置 Canvas 尺寸
			canvas.width = window.innerWidth
			canvas.height = window.innerHeight
			console.log('Canvas initialized with width:', canvas.width, 'and height:', canvas.height)

			// 清除画布，确保背景透明
			context.clearRect(0, 0, canvas.width, canvas.height)

			// 监听来自 mainWindow 的消息
            console.log('监听来自 mainWindow 的消息',11111)
			ipcRenderer.on('message-to-overlay', (event, data) => {
                console.log('接收数据',data)
				try {
					// 重新获取 canvas 和 context，确保绘制环境正确
					const canvas = fullscreenCanvas.value
					const context = canvas ? canvas.getContext('2d') : null

					if (context && data) {
						console.log('Received data from mainWindow:', data.data)

						// 遍历数据并绘制到画布上
						data.data.forEach((path) => {
							context.strokeStyle = 'red'
							context.lineJoin = 'round'
							context.lineCap = 'round'
							context.lineWidth = 5
							context.beginPath()
							context.moveTo(path.startX, path.startY)
							context.lineTo(path.endX, path.endY)
							context.stroke()
						})
					}
				} catch (error) {
					console.error('Error during message processing:', error)
				}
			})
		}
	}
})

// 窗口大小变化时，调整 Canvas 尺寸
window.addEventListener('resize', () => {
	if (fullscreenCanvas.value) {
		fullscreenCanvas.value.width = window.innerWidth
		fullscreenCanvas.value.height = window.innerHeight
	}
})
</script>

<style lang="scss" scoped>
.container {
	background-color: rgba(0, 0, 0, 0);
	.fullscreen-canvas {
		position: fixed; /* 确保 Canvas 始终覆盖整个屏幕 */
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 1000; /* 确保 Canvas 在最上层 */
		pointer-events: none; /* 使 Canvas 不影响下面的操作 */
		background-color: transparent; /* 确保 Canvas 背景透明 */
		border: 1px solid red;
	}
}
</style>
