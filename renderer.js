const information = document.getElementById('info')
information.innerText = `This app is using Chrome (v${window.versions.chrome()}), Node.js (v${window.versions.node()}), and Electron (v${window.versions.electron()})`

const func = async () => {
    const response = await window.versions.ping()
    console.log(response) // 在浏览器控制台打印 'pong'，它与main.js中的ipcMain.handle('ping', () => 'pong')对应
}
  
func()