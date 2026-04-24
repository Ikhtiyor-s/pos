import api from './api';

export interface LoyaltyBalance {
  customerId: string;
  points: number;
  totalEarned: number;
  totalSpent: number;
  tier: string;
  pointsValue: number;
  maxSpendableSum: number;
  customer: { id: string; firstName?: string; lastName?: string; phone: string } | null;
}

export interface MaxSpendable {
  maxPoints: number;
  maxDiscount: number;
}

export interface SpendResult {
  spentPoints: number;
  remainingPoints: number;
  discountAmount: number;
}

export const LoyaltyService = {
  async getBalance(customerId: string): Promise<LoyaltyBalance> {
    const { data } = await api.get(`/loyalty/customer/${customerId}/balance`);
    return data.data;
  },

  async calcMaxSpendable(customerId: string, orderTotal: number): Promise<MaxSpendable> {
    const { data } = await api.get('/loyalty/max-spendable', {
      params: { customerId, orderTotal },
    });
    return data.data;
  },

  async spendPoints(customerId: string, points: number, orderId: string): Promise<SpendResult> {
    const { data } = await api.post('/loyalty/spend', { customerId, points, orderId });
    return data.data;
  },
};
