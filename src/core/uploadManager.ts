import * as vscode from 'vscode';

import { ExtensionContext } from 'vscode';
import { UploadToCloudflare } from './uploadToCloudflare';

export type UploadResult = {
  url: string;
};

export interface Uploader {
  picked(): boolean;

  hasCredentials(): Promise<boolean>;
  promptAndSaveCredentials(): Promise<boolean>;
  clearCredentials(): Promise<void>;

  uploadImage(imageBuffer: Buffer, mimeType: string, suffix: string): Promise<UploadResult>;
}

export class UploadManager {
  private uploader: Uploader;

  constructor(context: ExtensionContext) {
    this.uploader = getAvailableUploaders(context);
  }

  async uploadImage(base64Data: string): Promise<UploadResult> {
    const match = base64Data.match(/^data:([^;]+);base64,/);
    const mimeType = match ? match[1] : (() => { throw new Error('无法识别的图片格式'); })();
    const imageBuffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const suffix = getSuffixFromMimeType(mimeType);

    return this.uploader.uploadImage(imageBuffer, mimeType, suffix);
  }

  async hasCredentials(): Promise<boolean> {
    return this.uploader.hasCredentials();
  }
  
  async promptAndSaveCredentials(): Promise<boolean> {
    return this.uploader.promptAndSaveCredentials();
  }

  async clearCredentials(): Promise<void> {
    return this.uploader.clearCredentials();
  }
}

function getSuffixFromMimeType(mimeType: string): string {
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
      throw new Error(`不支持的 MIME 类型: ${mimeType}`);
  }
}

function getAvailableUploaders(context: vscode.ExtensionContext): Uploader {
  const allUploaders = [new UploadToCloudflare(context)];
  const availableUploaders = allUploaders.filter(uploader => uploader.picked());
  if (availableUploaders.length === 0) {
    throw new Error('未找到可用的上传器，请先配置 OSS 提供商');
  }
  if (availableUploaders.length > 1) {
    throw new Error('检测到多个可用的上传器，请确保只配置一个 OSS 提供商');
  }

  return availableUploaders[0];
}
