import * as vscode from 'vscode';

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { CredentialsManager } from '../util/credentialsManager';

enum OSS_PROVIDER {
  CLOUDFLARE = 'Cloudflare R2',
}

type CloudflareConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  uploadDir: string;
  publicDomain: string;
};

type OSSConfig = {
  provider: OSS_PROVIDER;
  cloudflare: CloudflareConfig;
};

type UploadResult = {
  url: string;
};

function getOSSConfig(): OSSConfig | null {
  const config = vscode.workspace.getConfiguration('upload-to-oss');
  const cloudflare = config.get<CloudflareConfig>('cloudflare') || null;
  if (cloudflare) {
    return {
      provider: OSS_PROVIDER.CLOUDFLARE,
      cloudflare
    };
  }

  return null;
}

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
      throw new Error(`不支持的 MIME 类型: ${mimeType}`);
  }
}

async function uploadToCloudflareR2(imageBuffer: Buffer, mimeType: string, cloudflareConfig: CloudflareConfig, context: vscode.ExtensionContext): Promise<UploadResult> {
  const { accountId, bucketName, uploadDir, publicDomain } = cloudflareConfig;

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
  return {
    url: uploadDir
      ? `${publicDomain}/${uploadDir}/${fileName}`
      : `${publicDomain}/${fileName}`
  };
}

export async function uploadImage(base64Data: String, context: vscode.ExtensionContext): Promise<UploadResult> {
  // 获取配置
  const ossConfig = getOSSConfig() ?? (() => { throw new Error('未找到 OSS 配置'); })();

  const match = base64Data.match(/^data:([^;]+);base64,/);
  const mimeType = match ? match[1] : (() => { throw new Error('无法识别的图片格式'); })();
  const imageBuffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  
  switch (ossConfig.provider) {
    case OSS_PROVIDER.CLOUDFLARE:
      return await uploadToCloudflareR2(imageBuffer, mimeType, ossConfig.cloudflare, context);
    default:
      throw new Error(`不支持的 OSS 提供商: ${ossConfig.provider}`);
  }
}
