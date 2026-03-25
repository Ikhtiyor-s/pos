import { Request, Response, NextFunction } from 'express';
import { prisma } from '@oshxona/database';
import { successResponse } from '../utils/response.js';

export class SettingsController {
  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;

      let settings = await prisma.settings.findFirst({ where: { tenantId } });

      if (!settings) {
        // Default settings yaratish
        settings = await prisma.settings.create({
          data: {
            tenantId,
            name: 'Oshxona',
            taxRate: 12,
            currency: 'UZS',
            orderPrefix: 'ORD',
            bonusPercent: 0,
          },
        });
      }

      return successResponse(res, settings);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;

      const {
        name, nameRu, nameEn, address, phone, email, taxRate, currency, logo, timezone, orderPrefix, bonusPercent,
        // Nonbor
        nonborEnabled, nonborSellerId, nonborApiUrl, nonborApiSecret,
        // Payme
        paymeEnabled, paymeMerchantId, paymeSecretKey, paymeTestMode,
        // Click
        clickEnabled, clickMerchantId, clickServiceId, clickSecretKey, clickTestMode,
        // Uzum
        uzumEnabled, uzumMerchantId, uzumSecretKey, uzumTestMode,
        // Telegram
        telegramEnabled, telegramBotToken, telegramChatId, telegramEvents,
        // Delivery
        deliveryEnabled, deliveryApiUrl, deliveryApiKey,
        // CRM
        crmEnabled, crmApiUrl, crmApiKey, crmEvents,
      } = req.body;

      const settings = await prisma.settings.upsert({
        where: { tenantId },
        update: {
          ...(name !== undefined && { name }),
          ...(nameRu !== undefined && { nameRu }),
          ...(nameEn !== undefined && { nameEn }),
          ...(address !== undefined && { address }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(taxRate !== undefined && { taxRate }),
          ...(currency !== undefined && { currency }),
          ...(logo !== undefined && { logo }),
          ...(timezone !== undefined && { timezone }),
          ...(orderPrefix !== undefined && { orderPrefix }),
          ...(bonusPercent !== undefined && { bonusPercent }),
          // Nonbor
          ...(nonborEnabled !== undefined && { nonborEnabled }),
          ...(nonborSellerId !== undefined && { nonborSellerId }),
          ...(nonborApiUrl !== undefined && { nonborApiUrl }),
          ...(nonborApiSecret !== undefined && { nonborApiSecret }),
          // Payme
          ...(paymeEnabled !== undefined && { paymeEnabled }),
          ...(paymeMerchantId !== undefined && { paymeMerchantId }),
          ...(paymeSecretKey !== undefined && { paymeSecretKey }),
          ...(paymeTestMode !== undefined && { paymeTestMode }),
          // Click
          ...(clickEnabled !== undefined && { clickEnabled }),
          ...(clickMerchantId !== undefined && { clickMerchantId }),
          ...(clickServiceId !== undefined && { clickServiceId }),
          ...(clickSecretKey !== undefined && { clickSecretKey }),
          ...(clickTestMode !== undefined && { clickTestMode }),
          // Uzum
          ...(uzumEnabled !== undefined && { uzumEnabled }),
          ...(uzumMerchantId !== undefined && { uzumMerchantId }),
          ...(uzumSecretKey !== undefined && { uzumSecretKey }),
          ...(uzumTestMode !== undefined && { uzumTestMode }),
          // Telegram
          ...(telegramEnabled !== undefined && { telegramEnabled }),
          ...(telegramBotToken !== undefined && { telegramBotToken }),
          ...(telegramChatId !== undefined && { telegramChatId }),
          ...(telegramEvents !== undefined && { telegramEvents }),
          // Delivery
          ...(deliveryEnabled !== undefined && { deliveryEnabled }),
          ...(deliveryApiUrl !== undefined && { deliveryApiUrl }),
          ...(deliveryApiKey !== undefined && { deliveryApiKey }),
          // CRM
          ...(crmEnabled !== undefined && { crmEnabled }),
          ...(crmApiUrl !== undefined && { crmApiUrl }),
          ...(crmApiKey !== undefined && { crmApiKey }),
          ...(crmEvents !== undefined && { crmEvents }),
        },
        create: {
          tenantId,
          name: name || 'Oshxona',
          nameRu,
          nameEn,
          address,
          phone,
          email,
          taxRate: taxRate || 12,
          currency: currency || 'UZS',
          logo,
          timezone: timezone || 'Asia/Tashkent',
          orderPrefix: orderPrefix || 'ORD',
          bonusPercent: bonusPercent || 0,
        },
      });

      return successResponse(res, settings, 'Sozlamalar yangilandi');
    } catch (error) {
      next(error);
    }
  }
}
