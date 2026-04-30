import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

/**
 * Serviço responsável por todo o fluxo de TOTP (Time-based One-Time Password).
 * 
 * Gera secrets, QR codes, valida códigos contra secrets.
 * Compatível com Google Authenticator, Microsoft Authenticator, Authy, etc.
 */
@Injectable()
export class MfaService {
  /**
   * Gera um novo secret TOTP e sua URL de autenticação.
   * 
   * @param userEmail - Email do usuário (incluído no QR code para identificação)
   * @returns secret em ASCII e URL otpauth:// para importação
   */
  generateSecret(userEmail: string): {
    secret: string;
    otpauthUrl: string;
  } {
    const appName = 'StoreLab';
    
    const secret = speakeasy.generateSecret({
      name: `${appName} (${userEmail})`,
      issuer: appName,
      length: 32,
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url || '',
    };
  }

  /**
   * Gera um QR code em PNG e retorna como base64.
   * Cliente decodifica essa string direto no <img src> do HTML.
   * 
   * @param otpauthUrl - URL gerada por generateSecret()
   * @returns Data URL do QR code (base64)
   */
  async generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
    return qrcode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
    });
  }

  /**
   * Valida um código TOTP contra um secret.
   * 
   * @param code - Código de 6 dígitos digitado pelo usuário
   * @param secret - Secret em base32 (guardado no banco)
   * @param window - Número de períodos de 30s para aceitar (padrão: 1)
   * @returns true se válido, false caso contrário
   * 
   * O window=1 significa: aceita código atual + anterior + próximo (janela de ~90 segundos).
   * Útil para sincronização imperfeita entre dispositivos.
   */
  verifyTotp(code: string, secret: string, window: number = 1): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window,
    });
  }
}
