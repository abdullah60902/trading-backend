import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export interface TwoFactorSetupResult {
  secret: string;
  qrCodeUrl: string;
}

export const generateTwoFactorSecret = async (email: string): Promise<TwoFactorSetupResult> => {
  const secret = speakeasy.generateSecret({
    name: `CryptoPlatform:${email}`,
    issuer: 'CryptoPlatform',
  });

  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

  return {
    secret: secret.base32,
    qrCodeUrl,
  };
};

export const verifyTwoFactorToken = (secret: string, token: string): boolean => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1, // Allow +/- 30 seconds clock drift
  });
};
