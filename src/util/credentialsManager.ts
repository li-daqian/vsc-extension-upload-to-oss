import * as vscode from 'vscode';

export class CredentialsManager {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * 获取存储在 Secret Storage 中的值
   * @param key 存储的键
   * @returns 存储的值
   */
  async getValue(key: string): Promise<string | undefined> {
    return this.context.secrets.get(key);
  }

  /**
   * 存储值到 Secret Storage
   * @param key 存储的键
   * @param value 存储的值
   */
  async setValue(key: string, value: string): Promise<void> {
    await this.context.secrets.store(key, value);
  }

  /**
   * 删除 Secret Storage 中的值
   * @param key 存储的键
   */
  async deleteValue(key: string): Promise<void> {
    this.context.secrets.delete(key);
  }
}
