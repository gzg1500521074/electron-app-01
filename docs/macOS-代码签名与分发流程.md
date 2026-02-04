# Electron 应用 macOS 代码签名与分发完整流程

本文档以 **electron-app-01** 项目为例，说明在 macOS 上从打包、代码签名到公证（Notarization）的完整执行流程。你已具备 Apple 开发者计划（个人）会员资格，可直接按以下步骤操作。

---

## 一、概念速览

| 概念 | 说明 |
|------|------|
| **代码签名 (Code Signing)** | 证明应用由你创建且未被篡改，在**打包时**由 Forge 完成。 |
| **公证 (Notarization)** | 将应用提交给 Apple 做自动化安全扫描。从 macOS 10.15 起，**分发给用户的 App 必须同时完成签名 + 公证**，否则用户会遇到安全拦截。 |
| **Developer ID Application 证书** | 用于在 **App Store 之外** 分发 macOS 应用的证书（本流程使用此证书）。 |
| **Developer ID Installer 证书** | 用于签署 **安装包**（如 .pkg），证书适用于在 Mac App Store 中分发的应用程序，若你只分发 .app 或 .zip 可暂不申请。 |

---

## 二、前置条件检查

### 2.1 安装 Xcode

- 从 [developer.apple.com/xcode](https://developer.apple.com/xcode/) 安装 Xcode。
- 公证必须在本机使用 Apple 提供的命令行工具，Xcode 会提供这些工具；同时安装证书时也推荐通过 Xcode 管理。

### 2.2 确认 Apple 开发者账号

- 你已有个人的 Apple Developer Program 会员资格，无需额外申请。

---

## 三、获取并安装代码签名证书

### 3.1 创建 Developer ID Application 证书

1. 登录 [Apple Developer → Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/certificates/list)。
2. 左侧选择 **Certificates**，点击 **+** 新建。
3. 在 **Software** 下选择 **Developer ID Application**，继续。
4. 按页面提示创建 **CSR（证书签名请求）**：
   - 打开 **钥匙串访问 (Keychain Access)**。
   - 菜单：**钥匙串访问 → 证书助理 → 从证书颁发机构请求证书**。
   - 填写邮箱、常用名称，选择「存储到磁盘」，得到 `.certSigningRequest` 文件。
5. 回到 Apple 网页，上传该 CSR，生成并**下载**证书（`.cer`）。
6. 双击 `.cer` 文件，将证书导入「登录」钥匙串。

### 3.2 验证证书是否可用

在终端执行：

```bash
security find-identity -p codesigning -v
```

输出中应能看到类似：

```text
1) XXXXXXXX "Developer ID Application: 你的名字 (TEAM_ID)"
```

若列表为空或没有 `Developer ID Application`，请回到 3.1 检查证书类型和钥匙串。

---

## 四、准备公证（Notarization）所需信息

公证时 Forge 会调用 Apple 的 `notarytool`，需要以下之一：

- **方式 A：Apple ID + 应用专用密码 + Team ID**（推荐新手）
- **方式 B：App Store Connect API 密钥**
- **方式 C：本机 Keychain 中保存的 notarytool 配置**

下面只写 **方式 A**，最易上手。

### 4.1 创建应用专用密码（App-Specific Password）

1. 打开 [appleid.apple.com](https://appleid.apple.com) 并登录。
2. 在「登录与安全」里找到 **App 专用密码**，生成新密码。
3. **保存好该密码**（只显示一次），后面用作 `APPLE_APP_SPECIFIC_PASSWORD`。  
   **注意**：这不是你的 Apple ID 登录密码。

### 4.2 获取 Team ID

1. 打开 [developer.apple.com/account/#/membership](https://developer.apple.com/account/#/membership)。
2. 在 **Membership details** 中复制 **Team ID**（10 位字母数字），后面用作 `APPLE_TEAM_ID`。

---

## 五、配置 Electron Forge

### 5.1 在 `forge.config.js` 中启用签名与公证

在 `packagerConfig` 中增加 `osxSign` 和 `osxNotarize`（公证凭据建议用环境变量，不要写死在代码里）：

```javascript
packagerConfig: {
  asar: true,
  // 启用 macOS 代码签名（空对象即使用默认配置）
  osxSign: {},
  // 公证：使用环境变量，不要提交密码到仓库
  osxNotarize: {
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  },
},
```

- `osxSign: {}`：使用本机钥匙串中的 **Developer ID Application** 身份自动签名。
- `osxNotarize`：打包完成后会自动把产物提交给 Apple 做公证。

### 5.2 设置环境变量（本地或 CI）

在**执行打包的终端**里先设置（或写入 `~/.zshrc` 再 `source`，不要提交到 Git）：

```bash
export APPLE_ID="你的Apple ID邮箱"
export APPLE_APP_SPECIFIC_PASSWORD="上一步生成的应用专用密码"
export APPLE_TEAM_ID="你的10位Team ID"
```

可用下面命令确认（不要在有他人看的场合执行）：

```bash
echo $APPLE_ID
echo $APPLE_TEAM_ID
```

---

## 六、执行打包与分发构建

### 6.1 仅打包（不生成安装包）

```bash
npm run package
```

- 会生成已签名且（若配置了 `osxNotarize`）已公证的 `.app`，位于项目下的 `out/electron-app-01-darwin-xxx/`。

### 6.2 打包并生成可分发的制品（make）

```bash
npm run make
```

- 会先执行与 `package` 相同的打包与签名、公证，再根据 `forge.config.js` 里的 **makers** 生成安装包。
- 当前项目已包含 `@electron-forge/maker-zip` 且 `platforms: ['darwin']`，因此在 macOS 上会得到 **zip**，便于直接分发给用户。

产出目录一般为：

```text
out/
  electron-app-01-darwin-arm64/          # 已签名 + 公证的 .app（arm64）
  electron-app-01-darwin-x64/            # 若存在，则为 x64
  make/
    zip/
      darwin/
        electron-app-01-1.0.0-darwin-arm64.zip   # 可分发的 zip
```

将 **zip** 或 **.app** 发给用户即可；用户解压/安装后，系统不会再报「未签名的开发者」等阻止运行的提示（前提是已完成公证）。

---

## 七、流程小结（按顺序做一遍）

| 步骤 | 动作 |
|------|------|
| 1 | 安装 Xcode，确认 Apple Developer 账号有效。 |
| 2 | 在 Apple Developer 创建 **Developer ID Application** 证书并安装到钥匙串。 |
| 3 | 终端执行 `security find-identity -p codesigning -v` 确认证书存在。 |
| 4 | 在 appleid.apple.com 创建**应用专用密码**，在 developer.apple.com 查看 **Team ID**。 |
| 5 | 在 `forge.config.js` 的 `packagerConfig` 中添加 `osxSign: {}` 和 `osxNotarize: { ... }`（使用环境变量）。 |
| 6 | 设置 `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`。 |
| 7 | 在项目根目录执行 `npm run make`。 |
| 8 | 在 `out/make/zip/darwin/` 取 zip 或直接使用 `out/` 下的 .app 进行分发。 |

---

## 八、常见问题

### 8.1 报错找不到可用的 codesigning identity

- 确认已安装 **Developer ID Application**（不是 Development 或 Distribution）。
- 再次运行 `security find-identity -p codesigning -v` 查看是否出现在列表中。

### 8.2 公证失败：Invalid credentials

- 确认 `APPLE_APP_SPECIFIC_PASSWORD` 是「App 专用密码」，不是 Apple ID 登录密码。
- 确认 `APPLE_TEAM_ID` 与 developer.apple.com 上的一致。

### 8.3 用户仍提示「无法打开，因为无法验证开发者」

- 说明应用未完成公证或公证未通过。检查 `npm run make` 时是否有 notarize 报错。
- 可在本机用：`xcrun stapler validate -v "你的.app 路径"` 检查公证是否附在应用上。

### 8.4 不想在终端每次 export，想用 Keychain 做公证

- 可改用 `notarytool store-credentials` 将凭据存到 Keychain，再在 `osxNotarize` 里只写 `keychainProfile: '你的配置名'`。详见 [Electron Forge - Signing a macOS app](https://www.electronforge.io/guides/code-signing/code-signing-macos) 的 Option 3。

---

## 九、参考链接

- [Electron 文档 - 代码签名](https://www.electronjs.org/docs/latest/tutorial/code-signing)
- [Electron Forge - Code Signing 总览](https://www.electronforge.io/guides/code-signing)
- [Electron Forge - Signing a macOS app](https://www.electronforge.io/guides/code-signing/code-signing-macos)
- [Apple - 创建 App 专用密码](https://support.apple.com/zh-cn/HT204397)
- [Apple - 会员资格详情（查 Team ID）](https://developer.apple.com/account/#/membership)

---

*文档基于当前项目 `electron-app-01` 与 Electron Forge 7.x，适用于在 macOS 上首次完成「打包 → 代码签名 → 公证 → 分发」的完整流程。*
