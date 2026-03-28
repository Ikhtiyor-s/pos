import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/order.dart';
import '../services/order_service.dart';
import '../widgets/main_layout.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<_Notification> _notifications = [];
  Set<String> _seenReadyOrders = {};
  bool _loading = true;
  Timer? _pollTimer;
  bool _soundEnabled = true;

  @override
  void initState() {
    super.initState();
    _load();
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) => _poll());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final service = OrderService();
      final orders = await service.getAll();
      _processOrders(orders, isInitial: true);
    } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _poll() async {
    if (!mounted) return;
    try {
      final service = OrderService();
      final orders = await service.getAll();
      _processOrders(orders, isInitial: false);
    } catch (_) {}
  }

  void _processOrders(List<Order> orders, {required bool isInitial}) {
    final readyOrders = orders.where((o) => o.status == 'READY').toList();

    for (final order in readyOrders) {
      if (!_seenReadyOrders.contains(order.id)) {
        _seenReadyOrders.add(order.id);

        final items = order.items.map((i) => '${i.quantity}x ${i.productName}').join(', ');
        final notification = _Notification(
          id: order.id,
          orderNumber: order.orderNumber,
          tableNumber: order.tableNumber,
          tableName: order.tableName,
          items: items,
          total: order.computedTotal,
          time: DateTime.now(),
          isRead: false,
        );

        if (!isInitial) {
          // Yangi READY — signal berish
          _playAlert();
        }

        setState(() {
          _notifications.insert(0, notification);
        });
      }
    }
  }

  void _playAlert() {
    if (!_soundEnabled) return;
    HapticFeedback.heavyImpact();
    // System notification sound
    SystemSound.play(SystemSoundType.alert);

    // Vibrate pattern
    Future.delayed(const Duration(milliseconds: 200), () => HapticFeedback.heavyImpact());
    Future.delayed(const Duration(milliseconds: 400), () => HapticFeedback.heavyImpact());
  }

  void _markAsRead(String id) {
    setState(() {
      final idx = _notifications.indexWhere((n) => n.id == id);
      if (idx >= 0) _notifications[idx] = _notifications[idx].copyWith(isRead: true);
    });
  }

  void _clearAll() {
    setState(() => _notifications.clear());
  }

  int get _unreadCount => _notifications.where((n) => !n.isRead).length;

  String _formatPrice(double price) {
    return '${price.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]} ')} so\'m';
  }

  String _timeAgo(DateTime time) {
    final diff = DateTime.now().difference(time);
    if (diff.inMinutes < 1) return 'Hozirgina';
    if (diff.inMinutes < 60) return '${diff.inMinutes} daqiqa oldin';
    if (diff.inHours < 24) return '${diff.inHours} soat oldin';
    return '${diff.inDays} kun oldin';
  }

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      currentIndex: 2,
      body: Column(
        children: [
          // Header
          Container(
            color: const Color(0xFF111827),
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                child: Row(
                  children: [
                    const Icon(Icons.notifications, color: Color(0xFFF97316), size: 24),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text('Bildirishnomalar', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                    ),
                    if (_unreadCount > 0)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(color: const Color(0xFFF97316), borderRadius: BorderRadius.circular(12)),
                        child: Text('$_unreadCount', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    const SizedBox(width: 8),
                    // Sound toggle
                    GestureDetector(
                      onTap: () => setState(() => _soundEnabled = !_soundEnabled),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                        child: Icon(_soundEnabled ? Icons.volume_up : Icons.volume_off, color: _soundEnabled ? const Color(0xFF22C55E) : Colors.grey, size: 18),
                      ),
                    ),
                    const SizedBox(width: 6),
                    // Clear all
                    if (_notifications.isNotEmpty)
                      GestureDetector(
                        onTap: _clearAll,
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                          child: const Icon(Icons.delete_sweep, color: Colors.white54, size: 18),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),

          // Body
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFFF97316)))
                : _notifications.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 80, height: 80,
                              decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(20)),
                              child: Icon(Icons.notifications_none, size: 40, color: Colors.grey.shade400),
                            ),
                            const SizedBox(height: 16),
                            Text('Bildirishnomalar yo\'q', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.grey.shade600)),
                            const SizedBox(height: 6),
                            Text('Buyurtma tayyor bo\'lganda\nbu yerda ko\'rinadi', style: TextStyle(fontSize: 13, color: Colors.grey.shade400), textAlign: TextAlign.center),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        color: const Color(0xFFF97316),
                        onRefresh: _load,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          itemCount: _notifications.length,
                          itemBuilder: (context, index) {
                            final n = _notifications[index];
                            return _NotificationCard(
                              notification: n,
                              onTap: () => _markAsRead(n.id),
                              formatPrice: _formatPrice,
                              timeAgo: _timeAgo,
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

class _Notification {
  final String id;
  final String orderNumber;
  final int? tableNumber;
  final String? tableName;
  final String items;
  final double total;
  final DateTime time;
  final bool isRead;

  _Notification({
    required this.id, required this.orderNumber, this.tableNumber, this.tableName,
    required this.items, required this.total, required this.time, required this.isRead,
  });

  _Notification copyWith({bool? isRead}) => _Notification(
    id: id, orderNumber: orderNumber, tableNumber: tableNumber, tableName: tableName,
    items: items, total: total, time: time, isRead: isRead ?? this.isRead,
  );
}

class _NotificationCard extends StatelessWidget {
  final _Notification notification;
  final VoidCallback onTap;
  final String Function(double) formatPrice;
  final String Function(DateTime) timeAgo;

  const _NotificationCard({required this.notification, required this.onTap, required this.formatPrice, required this.timeAgo});

  @override
  Widget build(BuildContext context) {
    final n = notification;
    final tableLabel = n.tableNumber != null && n.tableNumber! > 0 ? 'Stol #${n.tableNumber}' : 'Olib ketish';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: n.isRead ? Colors.white : const Color(0xFFFFF7ED),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: n.isRead ? Colors.grey.shade200 : const Color(0xFFFDBA74), width: n.isRead ? 1 : 1.5),
          boxShadow: n.isRead ? [] : [BoxShadow(color: const Color(0xFFF97316).withValues(alpha: 0.08), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Icon
                Container(
                  width: 42, height: 42,
                  decoration: BoxDecoration(
                    gradient: n.isRead
                        ? null
                        : const LinearGradient(colors: [Color(0xFF22C55E), Color(0xFF16A34A)]),
                    color: n.isRead ? Colors.grey.shade100 : null,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.check_circle,
                    color: n.isRead ? Colors.grey.shade400 : Colors.white,
                    size: 22,
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
                          Text('TAYYOR!', style: TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w800,
                            color: n.isRead ? Colors.grey.shade500 : const Color(0xFF16A34A),
                          )),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: const Color(0xFFF97316).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                            child: Text(n.orderNumber, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFF97316))),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(tableLabel, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: n.isRead ? Colors.grey.shade600 : const Color(0xFF1F2937))),
                    ],
                  ),
                ),
                // Time
                Text(timeAgo(n.time), style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              ],
            ),

            const SizedBox(height: 10),

            // Items
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: n.isRead ? Colors.grey.shade50 : Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(n.items, style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.4)),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Jami:', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                      Text(formatPrice(n.total), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFFF97316))),
                    ],
                  ),
                ],
              ),
            ),

            if (!n.isRead) ...[
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity, height: 40,
                child: ElevatedButton.icon(
                  onPressed: onTap,
                  icon: const Icon(Icons.check, size: 18),
                  label: const Text('Olib boraman', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF22C55E),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
