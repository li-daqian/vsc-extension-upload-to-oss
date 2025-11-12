# Upload to OSS

一个简单的 VS Code 扩展，用于将图片上传到 Cloudflare R2 并自动复制链接到剪贴板。

## 功能

- 🚀 快速上传图片到 Cloudflare R2
- 📋 自动复制图片链接到剪贴板
- � 支持粘贴上传（Ctrl+V）
- �🔒 安全存储敏感凭证（Access Key ID 和 Secret Access Key）
- ⚙️ 易于配置的非敏感参数
- 🎨 简洁的用户界面

## 安装

1. 在 VS Code 中打开扩展市场
2. 搜索 "Upload to OSS"
3. 点击安装

或者从 VS Code 扩展市场直接安装：[Upload to OSS](https://marketplace.visualstudio.com/items?itemName=li-daqian.upload-to-oss)

## 配置

### 非敏感参数配置

在 VS Code 设置中配置以下参数（`settings.json`）：

```json
{
  "upload-to-oss": {
    "cloudflare": {
      "accountId": "your-account-id",
      "bucketName": "your-bucket-name",
      "uploadDir": "optional-upload-directory",
      "publicDomain": "https://your-domain.com"
    }
  }
}
```

### 敏感凭证配置

1. 在上传面板中点击"设置密钥"按钮
2. 输入您的 Cloudflare R2 Access Key ID 和 Secret Access Key
3. 凭证将安全存储在 VS Code 的 Secret Storage 中

## 使用方法

1. 在 VS Code 中打开命令面板 (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. 输入并选择 "Upload Image to OSS"
3. 在弹出的上传面板中：
   - 设置您的 Cloudflare R2 凭证（首次使用时）
   - 选择要上传的图片文件，或直接按 `Ctrl+V` 粘贴图片进行自动上传
   - 点击"上传"按钮
4. 图片链接将自动复制到剪贴板

![使用视频](https://img.lidaqian.me/blog/8a3fa3030c364613bb14a7d9e6eb9ac4.gif)

## 安全注意事项

- 非敏感配置参数存储在 `settings.json` 中
- 敏感凭证（Access Key ID 和 Secret Access Key）使用 VS Code 的安全存储机制
- 请确保您的 Cloudflare R2 凭证具有适当的权限

## 要求

- VS Code 1.105.0 或更高版本
- Cloudflare R2 账户和存储桶

## 已知问题

- 当前仅支持 Cloudflare R2
- 仅支持图片文件上传

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT
