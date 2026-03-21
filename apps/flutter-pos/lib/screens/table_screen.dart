import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/offline_service.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';
import 'order_screen.dart';

final tablesProvider = FutureProvider<List<RestaurantTable>>((ref) async {
  final api = ApiService();
  final offline = OfflineService();

  try {
    final tables = await api.getTables();
    await offline.cacheTables(tables);
    return tables;
  } catch (_) {
    return offline.getTablesOffline();
  }
});

class TableScreen extends ConsumerWidget {
  const TableScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tablesAsync = ref.watch(tablesProvider);
    final authState = ref.watch(authProvider);

    return Scaffold(
      body: Row(
        children: [
          // Left sidebar
          Container(
            width: 80,
            decoration: const BoxDecoration(
              color: AppTheme.surface,
              border: Border(
                right: BorderSide(color: AppTheme.border),
              ),
            ),
            child: Column(
              children: [
                const SizedBox(height: 24),
                // Logo
                const Icon(
                  Icons.restaurant_menu,
                  color: AppTheme.accent,
                  size: 36,
                ),
                const SizedBox(height: 32),
                // Nav items
                _NavButton(
                  icon: Icons.table_restaurant,
                  label: 'Stollar',
                  isActive: true,
                ),
                _NavButton(
                  icon: Icons.receipt_long,
                  label: 'Buyurtma',
                  isActive: false,
                ),
                _NavButton(
                  icon: Icons.kitchen,
                  label: 'Oshxona',
                  isActive: false,
                ),
                const Spacer(),
                // User / Logout
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: AppTheme.accent.withOpacity(0.2),
                        child: Text(
                          authState.user?.firstName.isNotEmpty == true
                              ? authState.user!.firstName[0].toUpperCase()
                              : 'U',
                          style: const TextStyle(
                            color: AppTheme.accent,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      IconButton(
                        onPressed: () {
                          ref.read(authProvider.notifier).logout();
                        },
                        icon: const Icon(
                          Icons.logout,
                          color: AppTheme.textMuted,
                        ),
                        tooltip: 'Chiqish',
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),

          // Main content
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    children: [
                      Text(
                        'Stollar',
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      const Spacer(),
                      IconButton(
                        onPressed: () => ref.invalidate(tablesProvider),
                        icon: const Icon(Icons.refresh),
                        tooltip: 'Yangilash',
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Tables grid
                  Expanded(
                    child: tablesAsync.when(
                      data: (tables) => _buildTablesGrid(context, tables),
                      loading: () => const Center(
                        child:
                            CircularProgressIndicator(color: AppTheme.accent),
                      ),
                      error: (e, _) => Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.error_outline,
                                size: 48, color: AppTheme.error),
                            const SizedBox(height: 16),
                            Text('Xatolik: $e'),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: () => ref.invalidate(tablesProvider),
                              child: const Text('Qayta urinish'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTablesGrid(
      BuildContext context, List<RestaurantTable> tables) {
    return GridView.builder(
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 5,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: 1.2,
      ),
      itemCount: tables.length,
      itemBuilder: (context, index) {
        final table = tables[index];
        return _TableCard(table: table);
      },
    );
  }
}

class _TableCard extends StatelessWidget {
  final RestaurantTable table;
  const _TableCard({required this.table});

  Color get _statusColor {
    switch (table.status) {
      case 'occupied':
        return AppTheme.error;
      case 'reserved':
        return AppTheme.warning;
      default:
        return AppTheme.success;
    }
  }

  String get _statusText {
    switch (table.status) {
      case 'occupied':
        return 'Band';
      case 'reserved':
        return 'Bron';
      default:
        return 'Bo\'sh';
    }
  }

  IconData get _statusIcon {
    switch (table.status) {
      case 'occupied':
        return Icons.people;
      case 'reserved':
        return Icons.event_seat;
      default:
        return Icons.check_circle_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => OrderScreen(table: table),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: _statusColor.withOpacity(0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: _statusColor.withOpacity(0.3),
            width: 1.5,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(_statusIcon, color: _statusColor, size: 32),
            const SizedBox(height: 8),
            Text(
              table.name.isNotEmpty ? table.name : 'Stol ${table.number}',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: AppTheme.textPrimary,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              _statusText,
              style: TextStyle(
                color: _statusColor,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${table.capacity} kishi',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;

  const _NavButton({
    required this.icon,
    required this.label,
    this.isActive = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: isActive
                  ? AppTheme.accent.withOpacity(0.15)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: isActive ? AppTheme.accent : AppTheme.textMuted,
              size: 26,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: isActive ? AppTheme.accent : AppTheme.textMuted,
              fontSize: 10,
              fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }
}
