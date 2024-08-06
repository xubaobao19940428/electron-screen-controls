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
					<div class="container-bottom-left-content-content">808 643 252</div>
				</div>
				<div class="container-bottom-left-content">
					<div class="container-bottom-left-content-title">本机验证码（选填）</div>
					<div class="container-bottom-left-content-content">808 643 252</div>
				</div>
			</div>
			<div class="container-bottom-right">
				<div class="container-bottom-left-title">控制远程识别码</div>
				<div class="container-bottom-left-content">
					<div class="container-bottom-left-content-title">伙伴识别码</div>
					<div class="container-bottom-left-content-content">
						<el-select v-model="value" filterable allow-create default-first-option :reserve-keyword="false" placeholder="选择想要控制桌面的识别码" style="width: 240px">
							<el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value" />
						</el-select>
					</div>
				</div>
				<div class="container-bottom-left-content">
					<div class="container-bottom-left-content-title">验证码（选填）</div>
					<div class="container-bottom-left-content-content">
						<el-input v-model="input" style="width: 240px" placeholder="请输入验证码" />
					</div>
				</div>
				<div class="container-bottom-left-content" style="margin-top: 80px">
					<el-button type="primary" style="width: 240px" round size="large" @click="concatOtherComputed">连接</el-button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts" name="Home">
import { ref } from 'vue'
import { ipcRenderer } from 'electron'
const value = ref<string[]>([])
const input = ref<string>('')
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
	ipcRenderer.invoke('open-window', {
		winURL: winURL,
		url: `/screenControls?videoUrl=1111111`,
		title: '视频观看',
		resizable: true,
	})
}
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
	&-content {
        width:100%;
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
</style>
