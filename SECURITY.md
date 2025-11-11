# 安全说明

## 凭证存储方式

本扩展使用 **VS Code Secret Storage API** 来安全存储敏感凭证（Access Key ID 和 Secret Access Key）。

### 优势

✅ **加密存储**: 凭证会加密存储在系统密钥链中
- Windows: Windows Credential Manager
- macOS: Keychain
- Linux: Secret Service API (gnome-keyring/kwallet)

✅ **不会泄露**: 凭证不会出现在
- settings.json 文件中
- Git 仓库中
- 扩展日志中

✅ **易于管理**: 提供专门的命令来配置和清除凭证

## 配置方式

### 1. 配置非敏感参数

在 VS Code 设置中配置以下参数（`settings.json`）:

```json
{
  "upload-to-oss": {
    "cloudflare": {
      "accountId": "447c9375cfe1ebf7c6fe54e110a624ed",
      "bucketName": "personal",
      "uploadDir": "blog",
      "publicDomain": "https://img.lidaqian.me"
    }
  }
}
```

### 2. 配置敏感凭证

在 Upload to OSS 上传面板中，点击“设置密钥”按钮，输入您的 Cloudflare R2 Access Key ID 和 Secret Access Key。

## 最佳实践

1. ✅ **使用 Secret Storage**: 所有敏感凭证都通过 Secret Storage 存储
2. ✅ **最小权限原则**: R2 凭证应仅授予必要的权限（读写指定 bucket）
3. ✅ **定期轮换**: 建议定期更换 Access Key
4. ❌ **不要**: 将凭证硬编码在配置文件中
5. ❌ **不要**: 将凭证提交到 Git 仓库
