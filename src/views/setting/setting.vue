<!--
 * setting.vue
 * @author: AUTHOR
 * @description: DESCRIPTION
 * @since: 2024-09-20
-->
<template>
    <div class="setting">
        <el-form :model="settingForm" label-width="100px" label-position="left">
            <el-form-item label="服务器地址:" required>
                <el-input v-model="settingForm.serverUrl" placeholder="请输入服务的IP+端口"></el-input>
            </el-form-item>
            <el-form-item label="webrtcWsUrl:" required>
                <el-input v-model="settingForm.webrtcWsUrl" placeholder="请输入webrtcWsUrl+端口"></el-input>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="saveSetting" plain>保存</el-button>
                <el-button type="info" @click="closeSetting" plain>取消</el-button>
            </el-form-item>
        </el-form>
    </div>
</template>

<script lang="ts" setup name="Setting">
import { reactive, onMounted } from 'vue'
import { ipcRenderer } from 'electron'
import { ElMessage } from 'element-plus'
const settingForm = reactive({
    serverUrl: '',
    webrtcWsUrl: ''
})
const saveSetting = () => {
    if (!settingForm.serverUrl || !settingForm.webrtcWsUrl) {
        ElMessage.warning('请输入正确的服务器地址')
        return
    }
    localStorage.setItem('serverUrl', settingForm.serverUrl)
    localStorage.setItem('webrtcWsUrl', settingForm.webrtcWsUrl)
    ElMessage.success('保存成功,重启服务生效')

}
const closeSetting = () => {
    ElMessage.success('取消成功')
    ipcRenderer.send('close-setting-window'); // 发送消息给主进程，通知关闭窗口
}
onMounted(() => {
    settingForm.serverUrl = localStorage.getItem('serverUrl') || ''
    settingForm.webrtcWsUrl = localStorage.getItem('webrtcWsUrl') || ''
})
</script>

<style lang="scss" scoped>
.setting {
    width: 100%;
    height: 100%;
    background-color: #f4f4f4;
    padding: 20px 10px 20px;
    box-sizing: border-box;

    :deep(.el-form-item__label) {
        color: #111;
    }
}
</style>
