import * as vscode from 'vscode';

import * as fs from 'fs';
import path from 'path';
import { UploadManager } from './uploadManager';

function getWebviewContent(context: vscode.ExtensionContext) {
  const htmlPath = path.join(context.extensionPath, 'media', 'uploadPanel.html');
  return fs.readFileSync(htmlPath, 'utf8');
}

function createUploadPanel(context: vscode.ExtensionContext) {
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
      let uploadManager;
      try {
        uploadManager = new UploadManager(context);
      } catch (error) {
        vscode.window.showErrorMessage(`❌ ${error instanceof Error ? error.message : '未知错误'}`);
        return;
      }
      switch (message.command) {
        case 'upload':
          try {
            vscode.window.showInformationMessage('正在上传图片...');

            const imageUrl = await uploadManager.uploadImage(message.data);

            await vscode.env.clipboard.writeText(imageUrl.url);

            vscode.window.showInformationMessage(`✅ 上传成功！URL 已复制到剪贴板`);

            panel.webview.postMessage({ command: 'uploadSuccess', url: imageUrl.url });
          } catch (error) {
            const errorMsg = `❌ 上传失败：${error instanceof Error ? error.message : '未知错误'}`;
            vscode.window.showErrorMessage(errorMsg);
            panel.webview.postMessage({ command: 'uploadError', error: errorMsg });
          }
          break;
        case 'getKeyStatus': {
          const hasKey = await uploadManager.hasCredentials();
          panel.webview.postMessage({ command: 'keyStatus', hasKey });
          break;
        }
        case 'setKey': {
          const success = await uploadManager.promptAndSaveCredentials();
          panel.webview.postMessage({
            command: 'keyActionResult',
            success,
            message: success ? '✅ 密钥已保存' : '❌ 密钥未保存'
          });
          break;
        }
        case 'clearKey': {
          await uploadManager.clearCredentials();
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

export function activeUploadToOSS(context: vscode.ExtensionContext) {
  const uploadImageDisposable = vscode.commands.registerCommand('upload-to-oss.uploadImage', async () => {
    createUploadPanel(context);
  });

  context.subscriptions.push(uploadImageDisposable);
}
