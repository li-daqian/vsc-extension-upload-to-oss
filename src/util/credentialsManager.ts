import * as vscode from 'vscode';

const ACCESS_KEY_ID_KEY = 'upload-to-oss.cloudflare.accessKeyId';
const SECRET_ACCESS_KEY_KEY = 'upload-to-oss.cloudflare.secretAccessKey';

export class CredentialsManager {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * 获取 Access Key ID
   */
  async getAccessKeyId(): Promise<string | undefined> {
    return await this.context.secrets.get(ACCESS_KEY_ID_KEY);
  }

  /**
   * 获取 Secret Access Key
   */
  async getSecretAccessKey(): Promise<string | undefined> {
    return await this.context.secrets.get(SECRET_ACCESS_KEY_KEY);
  }

  /**
   * 存储 Access Key ID
   */
  async setAccessKeyId(value: string): Promise<void> {
    await this.context.secrets.store(ACCESS_KEY_ID_KEY, value);
  }

  /**
   * 存储 Secret Access Key
   */
  async setSecretAccessKey(value: string): Promise<void> {
    await this.context.secrets.store(SECRET_ACCESS_KEY_KEY, value);
  }

  /**
   * 删除所有凭证
   */
  async clearCredentials(): Promise<void> {
    await this.context.secrets.delete(ACCESS_KEY_ID_KEY);
    await this.context.secrets.delete(SECRET_ACCESS_KEY_KEY);
  }

  /**
   * 检查凭证是否已配置
   */
  async hasCredentials(): Promise<boolean> {
    const accessKeyId = await this.getAccessKeyId();
    const secretAccessKey = await this.getSecretAccessKey();
    return !!(accessKeyId && secretAccessKey);
  }

  /**
   * 提示用户输入并保存凭证
   */
  async promptAndSaveCredentials(): Promise<boolean> {
    const accessKeyId = await vscode.window.showInputBox({
      prompt: '请输入 Cloudflare R2 Access Key ID',
      password: false,
      ignoreFocusOut: true,
      placeHolder: '例如: 03cd7a54e98b902ffce72c251eccee3c'
    });

    if (!accessKeyId) {
      return false;
    }

    const secretAccessKey = await vscode.window.showInputBox({
      prompt: '请输入 Cloudflare R2 Secret Access Key',
      password: true,
      ignoreFocusOut: true,
      placeHolder: '输入的内容将被安全存储'
    });

    if (!secretAccessKey) {
      return false;
    }

    await this.setAccessKeyId(accessKeyId);
    await this.setSecretAccessKey(secretAccessKey);

    vscode.window.showInformationMessage('✅ 凭证已安全保存到系统密钥链');
    return true;
  }
}
