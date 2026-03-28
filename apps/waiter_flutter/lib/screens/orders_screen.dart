import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/lang_store.dart';
import '../models/order.dart';
import '../services/order_service.dart';
import '../widgets/main_layout.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<Order> _orders = [];
  bool _loading = true;
  String? _error;
  int _filterIndex = 0;
  Timer? _autoRefresh;

  @override
  void initState() {
    super.initState();
    _load();
    _autoRefresh = Timer.periodic(const Duration(seconds: 15), (_) => _load());
  }

  @override
  void dispose() {
    _autoRefresh?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    if (!mounted) return;
    try {
      final service = OrderService();
      final orders = await service.getAll();
      if (mounted) {
        setState(() {
          _orders = orders;
          _loading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  List<Order> get _filteredOrders {
    switch (_filterIndex) {
      case 1: // Active
        return _orders
            .where((o) =>
                o.status == 'NEW' ||
                o.status == 'CONFIRMED' ||
                o.status == 'PREPARING')
            .toList();
      case 2: // Ready
        return _orders
            .where((o) => o.status == 'READY' || o.status == 'SERVED')
            .toList();
      case 3: // Completed
        return _orders
            .where((o) =>
                o.status == 'COMPLETED' || o.status == 'CANCELLED')
            .toList();
      default:
        return _orders;
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'NEW':
        return const Color(0xFF3B82F6);
      case 'CONFIRMED':
        return const Color(0xFF8B5CF6);
      case 'PREPARING':
        return const Color(0xFFF59E0B);
      case 'READY':
        return const Color(0xFF22C55E);
      case 'SERVED':
        return const Color(0xFF06B6D4);
      case 'COMPLETED':
        return const Color(0xFF6B7280);
      case 'CANCELLED':
        return const Color(0xFFEF4444);
      default:
        return Colors.grey;
    }
  }

  String _timeAgo(DateTime dt, LangNotifier lang) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return lang.t('time.justNow');
    if (diff.inHours < 1) return '${diff.inMinutes} ${lang.t('time.minutesAgo')}';
    return '${diff.inHours} ${lang.t('time.hoursAgo')}';
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<LangNotifier>();
    final filtered = _filteredOrders;

    final filterLabels = [
      'Barchasi',
      'Faol',
      'Tayyor',
      'Yakunlangan',
    ];

    return MainLayout(
      currentIndex: 1,
      body: Column(
        children: [
          // Header
          Container(
            color: const Color(0xFF111827),
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                child: Row(
                  children: [
                    Text(
                      lang.t('orders.title'),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.refresh, color: Colors.white),
                      onPressed: _load,
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Filter tabs
          Container(
            color: const Color(0xFF111827),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Row(
                children: List.generate(filterLabels.length, (i) {
                  final selected = _filterIndex == i;
                  return GestureDetector(
                    onTap: () => setState(() => _filterIndex = i),
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: selected
                            ? const Color(0xFFFF6B00)
                            : Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        filterLabels[i],
                        style: TextStyle(
                          color: selected ? Colors.white : Colors.white70,
                          fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),

          // Content
          Expanded(
            child: _loading
                ? Center(
                    child: CircularProgressIndicator(
                      color: const Color(0xFFFF6B00),
                    ),
                  )
                : _error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error_outline, color: Colors.red, size: 48),
                            const SizedBox(height: 12),
                            Text(lang.t('error')),
                            TextButton(
                              onPressed: _load,
                              child: const Text('Qayta urinish'),
                            ),
                          ],
                        ),
                      )
                    : filtered.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  Icons.receipt_long_outlined,
                                  size: 64,
                                  color: Colors.grey,
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  lang.t('orders.empty'),
                                  style: const TextStyle(color: Colors.grey),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _load,
                            color: const Color(0xFFFF6B00),
                            child: ListView.builder(
                              padding: const EdgeInsets.all(12),
                              itemCount: filtered.length,
                              itemBuilder: (context, index) {
                                final order = filtered[index];
                                return _OrderCard(
                                  order: order,
                                  statusColor: _statusColor(order.status),
                                  statusLabel: lang.t('orderStatus.${order.status}'),
                                  timeAgo: _timeAgo(order.createdAt, lang),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}

class _OrderCard extends StatefulWidget {
  final Order order;
  final Color statusColor;
  final String statusLabel;
  final String timeAgo;

  const _OrderCard({
    required this.order,
    required this.statusColor,
    required this.statusLabel,
    required this.timeAgo,
  });

  @override
  State<_OrderCard> createState() => _OrderCardState();
}

class _OrderCardState extends State<_OrderCard> {
  bool _expanded = false;

  String _formatPrice(double price) {
    final formatter = RegExp(r'(\d)(?=(\d{3})+(?!\d))');
    return price
            .toStringAsFixed(0)
            .replaceAllMapped(formatter, (m) => '${m[1]} ') +
        " so'm";
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final order = widget.order;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E2530) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            borderRadius: BorderRadius.circular(14),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  // Order number
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: widget.statusColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      '#${order.orderNumber}',
                      style: TextStyle(
                        color: widget.statusColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            if (order.tableNumber != null)
                              Text(
                                'Stol ${order.tableNumber}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                ),
                              ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 3),
                              decoration: BoxDecoration(
                                color: widget.statusColor.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                widget.statusLabel,
                                style: TextStyle(
                                  color: widget.statusColor,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(Icons.access_time, size: 13, color: Colors.grey.shade500),
                            const SizedBox(width: 4),
                            Text(
                              widget.timeAgo,
                              style: TextStyle(
                                  fontSize: 12, color: Colors.grey.shade500),
                            ),
                            const Spacer(),
                            Text(
                              _formatPrice(order.computedTotal),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: Color(0xFFFF6B00),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(width: 8),
                  Icon(
                    _expanded
                        ? Icons.keyboard_arrow_up
                        : Icons.keyboard_arrow_down,
                    color: Colors.grey,
                  ),
                ],
              ),
            ),
          ),

          // Expanded items
          if (_expanded && order.items.isNotEmpty)
            Container(
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(color: Colors.grey.withOpacity(0.15)),
                ),
              ),
              child: Column(
                children: order.items.map((item) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 8),
                    child: Row(
                      children: [
                        Container(
                          width: 24,
                          height: 24,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: const Color(0xFFFF6B00).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '${item.quantity}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFFFF6B00),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            item.productName,
                            style: const TextStyle(fontSize: 14),
                          ),
                        ),
                        Text(
                          _formatPrice(item.subtotal),
                          style: const TextStyle(
                              fontSize: 13, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }
}
