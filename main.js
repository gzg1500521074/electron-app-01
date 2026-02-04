const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

// Squirrel.Windows：安装/更新/卸载时由安装程序启动，此时直接退出让 Squirrel 完成流程
if (require('electron-squirrel-startup')) app.quit()

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('index.html')

  // 开启开发者工具
  win.webContents.openDevTools()
}

app.whenReady().then(() => {
  // 监听从渲染进程发送过来的ping请求，与invoke('ping')对应
  ipcMain.handle('ping', () => 'pong')


  createWindow()

  // 当窗口被激活时创建窗口-适用于macOS
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  // 当应用不是在macOS上运行时，退出应用
  if (process.platform !== 'darwin') app.quit()
})