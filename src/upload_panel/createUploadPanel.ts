import * as vscode from 'vscode';

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import * as fs from 'fs';
import path from 'path';
import { CredentialsManager } from './credentialsManager';

// 获取MIME类型对应的文件扩展名
function getExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    default:
      return 'png'; // 默认扩展名
  }
}

// ==== 从配置中获取 Cloudflare R2 设置 ====
function getCloudflareConfig() {
  const config = vscode.workspace.getConfiguration('upload-to-oss');
  const cloudflare = config.get('cloudflare') as { accountId: string; bucketName: string; uploadDir: string; publicDomain: string; } || {};
  return {
    accountId: cloudflare.accountId || '',
    bucketName: cloudflare.bucketName || '',
    uploadDir: cloudflare.uploadDir || '',
    publicDomain: cloudflare.publicDomain || ''
  };
}

function getWebviewContent(context: vscode.ExtensionContext) {
  const htmlPath = path.join(context.extensionPath, 'src', 'upload_panel', 'uploadPanel.html');
  return fs.readFileSync(htmlPath, 'utf8');
}

async function uploadImageBuffer(imageBuffer: Buffer, context: vscode.ExtensionContext, mimeType: string = 'image/png') {
  try {
    // 获取配置
    const { accountId, bucketName, uploadDir, publicDomain } = getCloudflareConfig();

    // 从 Secret Storage 获取凭证
    const credentialsManager = new CredentialsManager(context);
    const accessKeyId = await credentialsManager.getAccessKeyId();
    const secretAccessKey = await credentialsManager.getSecretAccessKey();

    // 验证配置
    if (!accountId || !bucketName || !publicDomain) {
      throw new Error('请先在设置中配置 Cloudflare R2 相关参数（Account ID、Bucket Name、Public Domain）');
    }

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('未找到凭证，请先配置 Cloudflare R2 凭证');      
    }

    // 初始化 R2 客户端
    const r2 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const fileName = `${randomUUID().replace(/-/g, '')}.${getExtensionFromMimeType(mimeType)}`;

    // 上传到 R2
    const uploadParams = {
      Bucket: bucketName,
      Key: uploadDir ? `${uploadDir}/${fileName}` : fileName,
      Body: imageBuffer,
      ContentType: mimeType,
    };
    await r2.send(new PutObjectCommand(uploadParams));

    // 生成访问 URL
    const imageUrl = uploadDir 
      ? `${publicDomain}/${uploadDir}/${fileName}`
      : `${publicDomain}/${fileName}`;

    // 复制到剪贴板
    await vscode.env.clipboard.writeText(imageUrl);

    return imageUrl;

  } catch (err: any) {
    const errorMsg = `❌ 上传失败：${err.message}`;
    vscode.window.showErrorMessage(errorMsg);
    console.error(errorMsg);
    throw err;
  }
}

export function createUploadPanel(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'imageUpload',
    '上传图片',
    vscode.ViewColumn.One,
    {
      enableScripts: true
    }
  );

  panel.webview.html = getWebviewContent(context);

  // 处理来自 webview 的消息
  panel.webview.onDidReceiveMessage(
    async message => {
      const credentialsManager = new CredentialsManager(context);
      switch (message.command) {
        case 'upload':
          try {
            vscode.window.showInformationMessage('正在上传图片...');
            const match = message.data.match(/^data:([^;]+);base64,/);
            const mimeType = match ? match[1] : 'image/png';
            const base64Data = message.data.replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            const imageUrl = await uploadImageBuffer(imageBuffer, context, mimeType);
            vscode.window.showInformationMessage(`✅ 上传成功！URL 已复制到剪贴板`);
            panel.webview.postMessage({ command: 'uploadSuccess', url: imageUrl });
          } catch (error) {
            panel.webview.postMessage({ command: 'uploadError', error: error instanceof Error ? error.message : '未知错误' });
          }
          break;
        case 'getKeyStatus': {
          const hasKey = await credentialsManager.hasCredentials();
          panel.webview.postMessage({ command: 'keyStatus', hasKey });
          break;
        }
        case 'setKey': {
          const success = await credentialsManager.promptAndSaveCredentials();
          panel.webview.postMessage({
            command: 'keyActionResult',
            success,
            message: success ? '✅ 密钥已保存' : '❌ 密钥未保存'
          });
          break;
        }
        case 'clearKey': {
          await credentialsManager.clearCredentials();
          panel.webview.postMessage({
            command: 'keyActionResult',
            success: true,
            message: '✅ 密钥已清理'
          });
          break;
        }
      }
    },
    undefined,
    context.subscriptions
  );
}
