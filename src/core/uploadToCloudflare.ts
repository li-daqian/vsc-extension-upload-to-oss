import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { ExtensionContext, window, workspace } from "vscode";
import { CredentialsManager } from "../util/credentialsManager";
import { Uploader, UploadResult } from "./uploadManager";

const ACCESS_KEY_ID_KEY = 'li-daqian.upload-to-oss.cloudflare.accessKeyId';
const SECRET_ACCESS_KEY_KEY = 'li-daqian.upload-to-oss.cloudflare.secretAccessKey';

type CloudflareConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  uploadDir: string;
  publicDomain: string;
};

export class UploadToCloudflare implements Uploader {
  private config: CloudflareConfig;
  private credentialsManager: CredentialsManager;
  private _picked: boolean;

  constructor(context: ExtensionContext) {
    this.credentialsManager = new CredentialsManager(context);
    const cloudflare = workspace.getConfiguration('upload-to-oss')?.get<CloudflareConfig>('cloudflare');
    this.config = cloudflare || {} as CloudflareConfig;
    this._picked = !!cloudflare;
  }

  picked(): boolean {
    return this._picked;
  }

  async promptAndSaveCredentials(): Promise<boolean> {
    const accessKeyId = await window.showInputBox({
      prompt: '请输入 Cloudflare R2 Access Key ID',
      password: false,
      ignoreFocusOut: true,
      placeHolder: '例如: 03cd7a54e98b902ffce72c251eccee3c'
    });

    if (!accessKeyId) {
      return false;
    }

    const secretAccessKey = await window.showInputBox({
      prompt: '请输入 Cloudflare R2 Secret Access Key',
      password: true,
      ignoreFocusOut: true,
      placeHolder: '输入的内容将被安全存储'
    });

    if (!secretAccessKey) {
      return false;
    }

    await this.credentialsManager.setValue(ACCESS_KEY_ID_KEY, accessKeyId);
    await this.credentialsManager.setValue(SECRET_ACCESS_KEY_KEY, secretAccessKey);

    window.showInformationMessage('✅ 凭证已安全保存到系统密钥链');
    return true;
  }

  async clearCredentials(): Promise<void> {
    await this.credentialsManager.deleteValue(ACCESS_KEY_ID_KEY);
    await this.credentialsManager.deleteValue(SECRET_ACCESS_KEY_KEY);
  }

  async hasCredentials(): Promise<boolean> {
    await this.setupCredentials();
    return !!(this.config.accessKeyId && this.config.secretAccessKey);
  }

  async uploadImage(imageBuffer: Buffer, mimeType: string, suffix: string): Promise<UploadResult> {
    await this.setupCredentials();
    const { accountId, bucketName, uploadDir, publicDomain, accessKeyId, secretAccessKey } = this.config;

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

    const fileName = `${randomUUID().replace(/-/g, '')}.${suffix}`;

    // 上传到 R2
    const uploadParams = {
      Bucket: bucketName,
      Key: uploadDir ? `${uploadDir}/${fileName}` : fileName,
      Body: imageBuffer,
      ContentType: mimeType,
    };
    await r2.send(new PutObjectCommand(uploadParams));

    // 生成访问 URL
    return {
      url: uploadDir
        ? `${publicDomain}/${uploadDir}/${fileName}`
        : `${publicDomain}/${fileName}`
    };
  }

  async setupCredentials(): Promise<void> {
    this.config.accessKeyId = await this.credentialsManager.getValue(ACCESS_KEY_ID_KEY) ?? '';
    this.config.secretAccessKey = await this.credentialsManager.getValue(SECRET_ACCESS_KEY_KEY) ?? '';
  }
}
