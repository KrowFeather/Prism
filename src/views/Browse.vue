<template>
  <div class="browse-page">
    <h2 class="page-title">抢课列表</h2>
    <div class="page-content-layout">
      <div class="page-content-main">
        <div v-if="courseQueue.length === 0" class="empty-state">
          <p class="empty-text">暂无抢课列表</p>
          <p class="empty-subtext">在"开始选课"页面可以将课程添加到抢课列表</p>
        </div>
        
        <div v-else class="queue-container">
        <div class="queue-header">
          <span class="queue-count">共 {{ courseQueue.length }} 门课程</span>
          <div class="queue-actions">
            <el-button
              type="primary"
              :loading="isStartingGrab"
              @click="handleStartGrabAll"
              :disabled="isStartingGrab || hasRunningTasks"
            >
              {{ isStartingGrab ? '启动中...' : '开始轮询抢课' }}
            </el-button>
            <el-button
              v-if="hasRunningTasks"
              type="warning"
              @click="handleStopAllGrab"
              :loading="isStoppingGrab"
            >
              {{ isStoppingGrab ? '停止中...' : '停止所有任务' }}
            </el-button>
            <el-button
              type="danger"
              @click="handleClearAll"
              :disabled="hasRunningTasks"
            >
              清空列表
            </el-button>
          </div>
        </div>

        <el-table :data="courseQueue" stripe style="width: 100%" v-loading="isSelectingAll">
          <el-table-column prop="courseName" label="课程名称" min-width="200" />
          <el-table-column prop="teacherName" label="教师" width="120" />
          <el-table-column prop="teachingClassId" label="教学班ID" width="250" />
          <el-table-column label="容量/已选" width="100">
            <template #default="scope">
              {{ scope.row.selectedCount || '0' }}/{{ scope.row.capacity || '0' }}
            </template>
          </el-table-column>
          <el-table-column prop="teachingPlace" label="上课地点" show-overflow-tooltip />
          <el-table-column prop="teachingClassType" label="课程类型" width="140">
            <template #default="scope">
              <el-tag size="small">
                {{ getCourseTypeName(scope.row.teachingClassType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="添加时间" width="180">
            <template #default="scope">
              {{ formatTime(scope.row.addedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="scope">
              <el-tag v-if="getTaskStatus(scope.row.teachingClassId) === 'running'" type="warning" size="small">
                抢课中
              </el-tag>
              <el-tag v-else-if="getTaskStatus(scope.row.teachingClassId) === 'success'" type="success" size="small">
                已成功
              </el-tag>
              <el-tag v-else-if="getTaskStatus(scope.row.teachingClassId) === 'stopped'" type="info" size="small">
                已停止
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="scope">
              <el-button
                type="danger"
                size="small"
                @click="handleRemove(scope.row.id)"
                :disabled="hasRunningTasks"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        </div>
      </div>
      
      <!-- 终端日志面板 -->
      <div class="terminal-panel">
        <div class="terminal-header">
          <span class="terminal-title">
            <el-icon><Monitor /></el-icon>
            抢课日志
          </span>
          <div class="terminal-actions">
            <el-button size="small" text @click="clearLogs">
              <el-icon><Delete /></el-icon>
              清空
            </el-button>
            <el-button size="small" text @click="autoScroll = !autoScroll">
              <el-icon><VideoPlay v-if="!autoScroll" /><VideoPause v-else /></el-icon>
              {{ autoScroll ? '暂停滚动' : '自动滚动' }}
            </el-button>
          </div>
        </div>
        <div class="terminal-content" ref="terminalContentRef">
          <div v-if="logs.length === 0" class="terminal-empty">
            <p>暂无日志</p>
            <p class="terminal-empty-hint">抢课操作日志将在这里实时显示</p>
          </div>
          <div v-else class="terminal-logs">
            <div
              v-for="(log, index) in logs"
              :key="index"
              :class="['terminal-log', `log-${log.type}`]"
            >
              <span class="log-time">{{ log.time }}</span>
              <span class="log-content">{{ log.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, nextTick, watch } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Monitor, Delete, VideoPlay, VideoPause } from '@element-plus/icons-vue'
import { courseQueue, removeFromQueue, clearQueue, initQueue, type QueuedCourse } from '../composables/useCourseQueue'

const router = useRouter()

// 从 localStorage 获取 API 地址，默认为 5000
const getApiUrl = () => {
  return localStorage.getItem('apiUrl') || 'http://localhost:5000'
}

const isSelectingAll = ref(false)
const selectingCourseId = ref('')
const isStartingGrab = ref(false)
const isStoppingGrab = ref(false)
const startingTaskId = ref('')
const stoppingTaskId = ref('')
const grabTasks = ref<Record<string, any>>({})
const taskStatusInterval = ref<number | null>(null)
const terminalContentRef = ref<HTMLElement | null>(null)
const autoScroll = ref(true)
const logs = ref<Array<{ time: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }>>([])
const MAX_LOGS = 500  // 最多保留500条日志

// 获取课程类型名称
function getCourseTypeName(type: string): string {
  const typeMap: Record<string, string> = {
    'TJKC': '推荐课程',
    'FANKC': '主修课程',
    'XGXK': '通识教育选修课程'
  }
  return typeMap[type] || type
}

// 格式化时间
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 从 localStorage 获取登录信息
const getLoginInfo = () => {
  const loginInfo = localStorage.getItem('loginInfo')
  if (!loginInfo) {
    router.push('/')
    return null
  }
  return JSON.parse(loginInfo)
}

// 立即选课
async function handleSelectCourse(course: QueuedCourse) {
  const loginInfo = getLoginInfo()
  if (!loginInfo) return

  selectingCourseId.value = course.id
  addLog(`[${course.courseName}] 正在尝试立即选课...`, 'info')

  try {
    const API_BASE_URL = getApiUrl()
    const response = await axios.post(`${API_BASE_URL}/select-class`, {
      username: loginInfo.username,
      password: loginInfo.password,
      electiveBatchCode: course.electiveBatchCode,
      teachingClassId: course.teachingClassId,
      teachingClassType: course.teachingClassType,
      campus: course.campus,
      isMajor: course.isMajor,
      operationType: '1'
    })

    if (response.data.success) {
      ElMessage.success(response.data.message || '选课成功！')
      addLog(`[${course.courseName}] ✅ 立即选课成功！`, 'success')
      // 从列表中移除
      removeFromQueue(course.id)
    } else {
      const errorMsg = response.data.message || '选课失败'
      ElMessage.error(errorMsg)
      addLog(`[${course.courseName}] ❌ ${errorMsg}`, 'error')
    }
  } catch (error: any) {
    let errorMsg = '选课失败，请重试'
    if (error.response) {
      errorMsg = error.response.data?.message || errorMsg
    } else if (error.request) {
      errorMsg = '无法连接到服务器，请确保服务正在运行'
    } else {
      errorMsg = error.message || errorMsg
    }
    ElMessage.error(errorMsg)
    addLog(`[${course.courseName}] ❌ ${errorMsg}`, 'error')
  } finally {
    selectingCourseId.value = ''
  }
}

// 删除单个课程
function handleRemove(id: string) {
  removeFromQueue(id)
}

// 清空列表
async function handleClearAll() {
  try {
    await ElMessageBox.confirm('确定要清空所有抢课列表吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    clearQueue()
  } catch {
    // 用户取消
  }
}

// 启动单个课程的轮询抢课
async function handleStartGrabCourse(course: QueuedCourse) {
  const loginInfo = getLoginInfo()
  if (!loginInfo) return

  startingTaskId.value = course.teachingClassId
  addLog(`[${course.courseName}] 正在启动抢课任务...`, 'info')

  try {
    const API_BASE_URL = getApiUrl()
    const response = await axios.post(`${API_BASE_URL}/start-grab-course`, {
      username: loginInfo.username,
      password: loginInfo.password,
      electiveBatchCode: course.electiveBatchCode,
      teachingClassId: course.teachingClassId,
      teachingClassType: course.teachingClassType,
      campus: course.campus || '02',
      isMajor: course.isMajor || '1',
      selectRate: 2  // 每2秒请求一次
    })

    if (response.data.success) {
      ElMessage.success(`课程 ${course.courseName} 的抢课任务已启动`)
      addLog(`[${course.courseName}] ✅ 抢课任务已启动，开始轮询选课`, 'success')
      // 开始轮询任务状态
      startTaskStatusPolling()
    } else {
      const errorMsg = response.data.message || '启动抢课任务失败'
      ElMessage.error(errorMsg)
      addLog(`[${course.courseName}] ❌ ${errorMsg}`, 'error')
    }
  } catch (error: any) {
    let errorMsg = '启动抢课任务失败，请重试'
    if (error.response) {
      errorMsg = error.response.data?.message || errorMsg
    } else if (error.request) {
      errorMsg = '无法连接到服务器，请确保服务正在运行'
    } else {
      errorMsg = error.message || errorMsg
    }
    ElMessage.error(errorMsg)
    addLog(`[${course.courseName}] ❌ ${errorMsg}`, 'error')
  } finally {
    startingTaskId.value = ''
  }
}

// 停止单个课程的轮询抢课
async function handleStopGrabCourse(course: QueuedCourse) {
  const task = findTaskByTeachingClassId(course.teachingClassId)
  if (!task) {
    ElMessage.warning('未找到对应的抢课任务')
    addLog(`[${course.courseName}] ⚠️ 未找到对应的抢课任务`, 'warning')
    return
  }

  stoppingTaskId.value = course.teachingClassId
  addLog(`[${course.courseName}] 正在停止抢课任务...`, 'info')

  try {
    const API_BASE_URL = getApiUrl()
    const response = await axios.post(`${API_BASE_URL}/stop-grab-course`, {
      task_id: task.task_id
    })

    if (response.data.success) {
      ElMessage.success(`课程 ${course.courseName} 的抢课任务已停止`)
      addLog(`[${course.courseName}] ⏸️ 抢课任务已停止 (共尝试 ${task.count} 次)`, 'warning')
      // 更新本地状态
      if (grabTasks.value[task.task_id]) {
        grabTasks.value[task.task_id].status = 'stopped'
      }
    } else {
      const errorMsg = response.data.message || '停止抢课任务失败'
      ElMessage.error(errorMsg)
      addLog(`[${course.courseName}] ❌ ${errorMsg}`, 'error')
    }
  } catch (error: any) {
    let errorMsg = '停止抢课任务失败，请重试'
    if (error.response) {
      errorMsg = error.response.data?.message || errorMsg
    } else if (error.request) {
      errorMsg = '无法连接到服务器，请确保服务正在运行'
    } else {
      errorMsg = error.message || errorMsg
    }
    ElMessage.error(errorMsg)
    addLog(`[${course.courseName}] ❌ ${errorMsg}`, 'error')
  } finally {
    stoppingTaskId.value = ''
  }
}

// 启动所有课程的轮询抢课
async function handleStartGrabAll() {
  const loginInfo = getLoginInfo()
  if (!loginInfo) return

  if (courseQueue.value.length === 0) {
    ElMessage.warning('抢课列表为空')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要为所有 ${courseQueue.value.length} 门课程启动轮询抢课吗？系统将在后端持续尝试选课。`,
      '确认启动轮询抢课',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
  } catch {
    return
  }

  isStartingGrab.value = true
  const API_BASE_URL = getApiUrl()
  let successCount = 0
  let failCount = 0

  for (const course of courseQueue.value) {
    try {
      const response = await axios.post(`${API_BASE_URL}/start-grab-course`, {
        username: loginInfo.username,
        password: loginInfo.password,
        electiveBatchCode: course.electiveBatchCode,
        teachingClassId: course.teachingClassId,
        teachingClassType: course.teachingClassType,
        campus: course.campus || '02',
        isMajor: course.isMajor || '1',
        selectRate: 2
      })

      if (response.data.success) {
        successCount++
      } else {
        failCount++
      }
    } catch (error: any) {
      failCount++
      console.error(`启动抢课失败: ${course.courseName}`, error)
    }
  }

  isStartingGrab.value = false

  if (successCount > 0) {
    ElMessage.success(`已启动 ${successCount} 个抢课任务`)
    addLog(`✅ 已成功启动 ${successCount} 个抢课任务`, 'success')
    startTaskStatusPolling()
  }
  if (failCount > 0) {
    ElMessage.warning(`有 ${failCount} 个任务启动失败`)
    addLog(`⚠️ 有 ${failCount} 个任务启动失败`, 'warning')
  }
}

// 停止所有抢课任务
async function handleStopAllGrab() {
  try {
    await ElMessageBox.confirm(
      '确定要停止所有抢课任务吗？',
      '确认停止',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  isStoppingGrab.value = true
  const API_BASE_URL = getApiUrl()

  try {
    // 获取所有任务状态
    const response = await axios.get(`${API_BASE_URL}/grab-course-status`)
    
    if (response.data.success) {
      const tasks = response.data.data
      let stopCount = 0
      
      for (const taskId in tasks) {
        const task = tasks[taskId]
        if (task.status === 'running') {
          try {
            await axios.post(`${API_BASE_URL}/stop-grab-course`, {
              task_id: taskId
            })
            stopCount++
          } catch (error) {
            console.error(`停止任务失败: ${taskId}`, error)
          }
        }
      }
      
      ElMessage.success(`已停止 ${stopCount} 个抢课任务`)
      addLog(`⏸️ 已停止 ${stopCount} 个抢课任务`, 'warning')
      // 刷新任务状态
      await loadTaskStatus()
    }
  } catch (error: any) {
    if (error.response) {
      ElMessage.error(error.response.data?.message || '停止任务失败，请重试')
    } else if (error.request) {
      ElMessage.error('无法连接到服务器，请确保服务正在运行')
    } else {
      ElMessage.error(error.message || '停止任务失败，请重试')
    }
  } finally {
    isStoppingGrab.value = false
  }
}

// 添加日志
function addLog(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const now = new Date()
  const time = now.toLocaleTimeString('zh-CN', { hour12: false })
  
  logs.value.push({
    time,
    message,
    type
  })
  
  // 限制日志数量
  if (logs.value.length > MAX_LOGS) {
    logs.value.shift()
  }
  
  // 自动滚动到底部
  if (autoScroll.value) {
    // 使用双重 nextTick 确保 DOM 完全更新
    nextTick(() => {
      nextTick(() => {
        scrollToBottom()
      })
    })
  }
}

// 滚动到底部
function scrollToBottom() {
  if (!terminalContentRef.value) return
  
  // 使用 requestAnimationFrame 确保 DOM 更新后再滚动
  requestAnimationFrame(() => {
    if (terminalContentRef.value) {
      terminalContentRef.value.scrollTop = terminalContentRef.value.scrollHeight
    }
  })
}

// 清空日志
function clearLogs() {
  logs.value = []
  addLog('日志已清空', 'info')
}

// 加载任务状态
async function loadTaskStatus() {
  try {
    const API_BASE_URL = getApiUrl()
    const response = await axios.get(`${API_BASE_URL}/grab-course-status`)
    
    if (response.data.success) {
      const newTasks = response.data.data
      
      // 检测任务状态变化并添加日志
      for (const taskId in newTasks) {
        const newTask = newTasks[taskId]
        const oldTask = grabTasks.value[taskId]
        
        if (!oldTask) {
          // 新任务启动
          const course = courseQueue.value.find(c => c.teachingClassId === newTask.teaching_class_id)
          if (course) {
            addLog(`[${course.courseName}] 🚀 抢课任务已启动 (ID: ${taskId.substring(0, 8)}...)`, 'info')
          }
        } else {
          // 状态变化
          if (oldTask.status !== newTask.status) {
            const course = courseQueue.value.find(c => c.teachingClassId === newTask.teaching_class_id)
            const courseName = course ? course.courseName : newTask.teaching_class_id
            
            if (newTask.status === 'success') {
              addLog(`[${courseName}] ✅ 选课成功！`, 'success')
            } else if (newTask.status === 'stopped') {
              addLog(`[${courseName}] ⏸️ 抢课任务已停止 (尝试次数: ${newTask.count})`, 'warning')
            }
          }
          
          // 检测每次轮询尝试（无论状态是否变化）
          if (newTask.status === 'running' && newTask.count > oldTask.count) {
            const course = courseQueue.value.find(c => c.teachingClassId === newTask.teaching_class_id)
            const courseName = course ? course.courseName : newTask.teaching_class_id
            
            // 每次尝试都记录，显示尝试次数和结果
            let resultMsg = ''
            if (newTask.last_result) {
              // 根据结果消息判断类型
              if (newTask.last_result.includes('成功') || newTask.last_result.includes('选课成功')) {
                resultMsg = `✅ ${newTask.last_result}`
              } else if (newTask.last_result.includes('过期') || newTask.last_result.includes('登录')) {
                resultMsg = `⚠️ ${newTask.last_result}`
              } else if (newTask.last_result.includes('失败') || newTask.last_result.includes('错误')) {
                resultMsg = `❌ ${newTask.last_result}`
              } else {
                resultMsg = newTask.last_result
              }
            }
            
            // 记录每次轮询结果
            addLog(
              `[${courseName}] 🔄 第 ${newTask.count} 次尝试: ${resultMsg || '正在尝试选课...'}`,
              resultMsg.includes('✅') ? 'success' : 
              resultMsg.includes('❌') || resultMsg.includes('失败') ? 'error' :
              resultMsg.includes('⚠️') ? 'warning' : 'info'
            )
          }
          
          // 如果任务仍在运行但尝试次数增加了（可能在状态更新之前）
          if (newTask.status === 'running' && newTask.count === oldTask.count && newTask.last_result !== oldTask.last_result) {
            const course = courseQueue.value.find(c => c.teachingClassId === newTask.teaching_class_id)
            const courseName = course ? course.courseName : newTask.teaching_class_id
            
            // 结果消息更新了，即使尝试次数没变（可能是同一秒内的更新）
            if (newTask.last_result && newTask.last_result !== oldTask.last_result) {
              let resultMsg = newTask.last_result
              if (resultMsg.includes('成功')) {
                resultMsg = `✅ ${resultMsg}`
              } else if (resultMsg.includes('失败') || resultMsg.includes('错误')) {
                resultMsg = `❌ ${resultMsg}`
              }
              
              addLog(
                `[${courseName}] 结果更新: ${resultMsg}`,
                resultMsg.includes('✅') ? 'success' : 
                resultMsg.includes('❌') ? 'error' : 'info'
              )
            }
          }
        }
      }
      
      grabTasks.value = newTasks
    }
  } catch (error) {
    console.error('加载任务状态失败', error)
    addLog('❌ 加载任务状态失败', 'error')
  }
}

// 开始轮询任务状态
function startTaskStatusPolling() {
  if (taskStatusInterval.value) {
    return  // 已经在轮询中
  }
  
  loadTaskStatus()  // 立即加载一次
  
  // 每2秒轮询一次，与后端抢课间隔同步
  taskStatusInterval.value = setInterval(() => {
    loadTaskStatus()
  }, 2000)
}

// 停止轮询任务状态
function stopTaskStatusPolling() {
  if (taskStatusInterval.value) {
    clearInterval(taskStatusInterval.value)
    taskStatusInterval.value = null
  }
}

// 根据教学班ID查找任务
function findTaskByTeachingClassId(teachingClassId: string) {
  for (const taskId in grabTasks.value) {
    const task = grabTasks.value[taskId]
    if (task.teaching_class_id === teachingClassId) {
      return task
    }
  }
  return null
}

// 获取任务状态
function getTaskStatus(teachingClassId: string): string {
  const task = findTaskByTeachingClassId(teachingClassId)
  return task ? task.status : ''
}

// 计算是否有运行中的任务
const hasRunningTasks = computed(() => {
  for (const taskId in grabTasks.value) {
    if (grabTasks.value[taskId].status === 'running') {
      return true
    }
  }
  return false
})


// 页面加载时初始化
onMounted(() => {
  initQueue()
  addLog('🚀 抢课系统已启动', 'info')
  loadTaskStatus()
  startTaskStatusPolling()
})

// 监听日志变化，自动滚动
watch(() => logs.value.length, () => {
  if (autoScroll.value) {
    nextTick(() => {
      scrollToBottom()
    })
  }
}, { flush: 'post' })

// 监听日志数组变化（包括内容变化）
watch(() => logs.value, () => {
  if (autoScroll.value) {
    nextTick(() => {
      scrollToBottom()
    })
  }
}, { deep: true, flush: 'post' })

// 页面卸载时清理
onUnmounted(() => {
  stopTaskStatusPolling()
})
</script>

<style scoped>
.browse-page {
  padding: 20px;
  min-height: 100%;
  box-sizing: border-box;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 24px 0;
}

.page-content-layout {
  display: flex;
  gap: 20px;
  height: calc(100vh - 150px);
}

.page-content-main {
  flex: 1;
  min-width: 0;
  overflow: auto;
}

.page-content {
  max-width: 1400px;
  margin: 0 auto;
}

.empty-state {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 60px 40px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.empty-text {
  font-size: 18px;
  color: #64748b;
  margin: 0 0 12px 0;
}

.empty-subtext {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
}

.queue-container {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.queue-count {
  font-size: 16px;
  font-weight: 600;
  color: #1e40af;
}

.queue-actions {
  display: flex;
  gap: 10px;
}

/* 终端面板样式 */
.terminal-panel {
  width: 450px;
  min-width: 400px;
  background: #1e1e1e;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.terminal-header {
  background: #252526;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #3e3e42;
}

.terminal-title {
  color: #cccccc;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.terminal-actions {
  display: flex;
  gap: 8px;
}

.terminal-content {
  flex: 1;
  overflow: auto;
  padding: 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  background: #1e1e1e;
}

.terminal-empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #858585;
}

.terminal-empty p {
  margin: 8px 0;
}

.terminal-empty-hint {
  font-size: 12px;
  color: #606060;
}

.terminal-logs {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.terminal-log {
  display: flex;
  gap: 12px;
  padding: 4px 0;
  word-break: break-word;
}

.log-time {
  color: #6a9955;
  min-width: 80px;
  flex-shrink: 0;
}

.log-content {
  color: #d4d4d4;
  flex: 1;
}

/* 不同日志类型的颜色 */
.terminal-log.log-info .log-content {
  color: #d4d4d4;
}

.terminal-log.log-success .log-content {
  color: #4ec9b0;
}

.terminal-log.log-warning .log-content {
  color: #ce9178;
}

.terminal-log.log-error .log-content {
  color: #f48771;
}

/* 滚动条样式 */
.terminal-content::-webkit-scrollbar {
  width: 8px;
}

.terminal-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.terminal-content::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 4px;
}

.terminal-content::-webkit-scrollbar-thumb:hover {
  background: #4e4e4e;
}

</style>

<style>
/* 暗色模式样式 - 纯黑色系 */
.dark-theme .page-title {
  background: linear-gradient(135deg, #ffffff, #e0e0e0);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.dark-theme .empty-state {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
}

.dark-theme .empty-text {
  color: #d0d0d0 !important;
}

.dark-theme .empty-subtext {
  color: #a0a0a0 !important;
}

.dark-theme .queue-container {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
}

.dark-theme .queue-count {
  color: #ffffff !important;
}
</style>
