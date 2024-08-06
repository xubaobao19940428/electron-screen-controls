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
import { onMounted } from 'vue'

import { ipcRenderer } from 'electron'
const startSharing = async function (sourceId) {
	let videoDom = document.getElementById('video')
	const stream = await navigator.mediaDevices.getUserMedia({
		audio: false,
		video: {
			mandatory: {
				chromeMediaSource: 'desktop',
				chromeMediaSourceId: sourceId,
			},
		},
	})
    console.log('stream',stream)
	videoDom.srcObject = stream
}
onMounted(() => {
	ipcRenderer.invoke('screen_share').then((res) => {
		console.log(res)
		res.map((item) => {
			if (item.display_id == '722490141') {
				startSharing(item.id)
			}
		})
	})
	document.addEventListener('mousemove', (e) => {
		ipcRenderer.invoke('mouse-move', e.clientX, e.clientY)
	})

	document.addEventListener('click', (e) => {
		ipcRenderer.invoke('mouse-click', e.button === 0 ? 'left' : 'right')
	})

	document.addEventListener('keydown', (e) => {
		ipcRenderer.invoke('key-press', e.key)
	})
})
</script>

<style lang="scss" scoped>
.container{
    width: 100%;
    height: 100%;
    overflow: hidden;
}
#video{
    width: 100%;
    height: 100%;
    object-fit: fill;
    overflow: auto;
}
</style>
