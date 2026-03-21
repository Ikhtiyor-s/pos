import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/offline_service.dart';
import '../theme/app_theme.dart';
import 'table_screen.dart';

class PaymentScreen extends ConsumerStatefulWidget {
  final Order order;
  const PaymentScreen({super.key, required this.order});

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  String _selectedMethod = 'cash';
  bool _isProcessing = false;

  Future<void> _processPayment() async {
    setState(() => _isProcessing = true);

    final paymentData = {
      'orderId': widget.order.id,
      'method': _selectedMethod,
      'amount': widget.order.total,
    };

    try {
      final api = ApiService();
      await api.createPayment(paymentData);

      if (!mounted) return;
      _showSuccessDialog();
    } catch (e) {
      // Save offline
      final offline = OfflineService();
      await offline.addToSyncQueue({
        'type': 'create_payment',
        'data': paymentData,
      });

      if (!mounted) return;
      _showSuccessDialog(offline: true);
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  void _showSuccessDialog({bool offline = false}) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 16),
            Icon(
              offline ? Icons.cloud_off : Icons.check_circle,
              size: 64,
              color: offline ? AppTheme.warning : AppTheme.success,
            ),
            const SizedBox(height: 16),
            Text(
              offline ? 'Offline saqlandi' : 'To\'lov qabul qilindi!',
              style: const TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Buyurtma: #${widget.order.orderNumber}',
              style: const TextStyle(color: AppTheme.textSecondary),
            ),
            Text(
              '${widget.order.total.toStringAsFixed(0)} so\'m',
              style: const TextStyle(
                color: AppTheme.accent,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop(); // close dialog
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const TableScreen()),
                    (route) => false,
                  );
                },
                child: const Text('Stollar sahifasiga qaytish'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          // Left: Order summary
          Expanded(
            flex: 2,
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.arrow_back),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'To\'lov',
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Buyurtma #${widget.order.orderNumber}',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 24),

                  // Order items list
                  Expanded(
                    child: Container(
                      decoration: AppTheme.glassCard(),
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: widget.order.items.length,
                        separatorBuilder: (_, __) =>
                            const Divider(color: AppTheme.border),
                        itemBuilder: (context, index) {
                          final item = widget.order.items[index];
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.product?.name ?? 'Mahsulot',
                                        style: const TextStyle(
                                          color: AppTheme.textPrimary,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      Text(
                                        '${item.price.toStringAsFixed(0)} x ${item.quantity}',
                                        style: const TextStyle(
                                          color: AppTheme.textMuted,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  '${item.subtotal.toStringAsFixed(0)} so\'m',
                                  style: const TextStyle(
                                    color: AppTheme.textPrimary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),
                  // Total
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: AppTheme.glassCardAccent(),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Jami:',
                          style: TextStyle(
                            color: AppTheme.textPrimary,
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          '${widget.order.total.toStringAsFixed(0)} so\'m',
                          style: const TextStyle(
                            color: AppTheme.accent,
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Right: Payment methods
          Container(
            width: 400,
            decoration: const BoxDecoration(
              color: AppTheme.surface,
              border: Border(
                left: BorderSide(color: AppTheme.border),
              ),
            ),
            padding: const EdgeInsets.all(32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'To\'lov usuli',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 32),

                _PaymentMethodButton(
                  icon: Icons.money,
                  label: 'Naqd pul',
                  subtitle: 'Cash',
                  isSelected: _selectedMethod == 'cash',
                  onTap: () => setState(() => _selectedMethod = 'cash'),
                ),
                const SizedBox(height: 16),
                _PaymentMethodButton(
                  icon: Icons.credit_card,
                  label: 'Plastik karta',
                  subtitle: 'Card',
                  isSelected: _selectedMethod == 'card',
                  onTap: () => setState(() => _selectedMethod = 'card'),
                ),
                const SizedBox(height: 16),
                _PaymentMethodButton(
                  icon: Icons.swap_horiz,
                  label: 'Bank o\'tkazmasi',
                  subtitle: 'Transfer',
                  isSelected: _selectedMethod == 'transfer',
                  onTap: () => setState(() => _selectedMethod = 'transfer'),
                ),

                const Spacer(),

                // Pay button
                SizedBox(
                  width: double.infinity,
                  height: 64,
                  child: ElevatedButton.icon(
                    onPressed: _isProcessing ? null : _processPayment,
                    icon: _isProcessing
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Icon(Icons.check, size: 24),
                    label: Text(
                      _isProcessing
                          ? 'Jarayonda...'
                          : 'To\'lash — ${widget.order.total.toStringAsFixed(0)} so\'m',
                      style: const TextStyle(fontSize: 18),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PaymentMethodButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final bool isSelected;
  final VoidCallback onTap;

  const _PaymentMethodButton({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.accent.withOpacity(0.1)
              : AppTheme.background,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppTheme.accent : AppTheme.border,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: isSelected
                    ? AppTheme.accent.withOpacity(0.2)
                    : AppTheme.surfaceLight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                color: isSelected ? AppTheme.accent : AppTheme.textMuted,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: isSelected
                        ? AppTheme.accent
                        : AppTheme.textPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: AppTheme.textMuted,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
            const Spacer(),
            if (isSelected)
              const Icon(Icons.check_circle, color: AppTheme.accent),
          ],
        ),
      ),
    );
  }
}
