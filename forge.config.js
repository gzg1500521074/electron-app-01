const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  // 打包配置: https://electron.github.io/packager/main/interfaces/Options.html
  // 直接映射到在 Electron Forge 的“打包”步骤期间发送到 @electron/packager 的选项
  packagerConfig: {
    // 将所有文件打包成一个asar文件，提高加载速度
    asar: true,
    // macOS 代码签名（空对象即使用默认配置，使用钥匙串中的 Developer ID Application）
    osxSign: {},
    // macOS 公证：使用环境变量 APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID，勿提交密码到仓库
    osxNotarize: process.env.APPLE_ID
      ? {
          appleId: process.env.APPLE_ID,
          appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
          teamId: process.env.APPLE_TEAM_ID,
        }
      : undefined,
  },
  // 发送给 @electron/rebuild 的选项: https://github.com/electron/rebuild#how-can-i-integrate-this-into-grunt--gulp--whatever
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
