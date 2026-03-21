import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/offline_service.dart';
import '../theme/app_theme.dart';
import 'payment_screen.dart';

// Providers
final categoriesProvider = FutureProvider<List<Category>>((ref) async {
  final api = ApiService();
  final offline = OfflineService();
  try {
    final categories = await api.getCategories();
    await offline.cacheCategories(categories);
    return categories;
  } catch (_) {
    return offline.getCategoriesOffline();
  }
});

final productsProvider = FutureProvider<List<Product>>((ref) async {
  final api = ApiService();
  final offline = OfflineService();
  try {
    final products = await api.getProducts();
    await offline.cacheProducts(products);
    return products;
  } catch (_) {
    return offline.getProductsOffline();
  }
});

final selectedCategoryProvider = StateProvider<String?>((ref) => null);

class OrderScreen extends ConsumerStatefulWidget {
  final RestaurantTable table;
  const OrderScreen({super.key, required this.table});

  @override
  ConsumerState<OrderScreen> createState() => _OrderScreenState();
}

class _OrderScreenState extends ConsumerState<OrderScreen> {
  final List<OrderItem> _orderItems = [];
  final _uuid = const Uuid();

  double get _total =>
      _orderItems.fold(0, (sum, item) => sum + item.subtotal);

  void _addProduct(Product product) {
    setState(() {
      final existingIndex =
          _orderItems.indexWhere((item) => item.productId == product.id);
      if (existingIndex >= 0) {
        final existing = _orderItems[existingIndex];
        _orderItems[existingIndex] = existing.copyWith(
          quantity: existing.quantity + 1,
        );
      } else {
        _orderItems.add(OrderItem(
          id: _uuid.v4(),
          productId: product.id,
          product: product,
          quantity: 1,
          price: product.price,
        ));
      }
    });
  }

  void _removeItem(int index) {
    setState(() {
      _orderItems.removeAt(index);
    });
  }

  void _updateQuantity(int index, int delta) {
    setState(() {
      final item = _orderItems[index];
      final newQty = item.quantity + delta;
      if (newQty <= 0) {
        _orderItems.removeAt(index);
      } else {
        _orderItems[index] = item.copyWith(quantity: newQty);
      }
    });
  }

  Future<void> _submitOrder() async {
    if (_orderItems.isEmpty) return;

    final orderData = {
      'source': 'pos',
      'type': 'dine_in',
      'tableId': widget.table.id,
      'items': _orderItems
          .map((item) => {
                'productId': item.productId,
                'quantity': item.quantity,
                'price': item.price,
                'notes': item.notes,
              })
          .toList(),
    };

    try {
      final api = ApiService();
      final order = await api.createOrder(orderData);

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => PaymentScreen(order: order),
        ),
      );
    } catch (e) {
      // Save offline
      final offline = OfflineService();
      await offline.addToSyncQueue({
        'type': 'create_order',
        'data': orderData,
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'Buyurtma offline saqlandi. Internet qaytganda yuboriladi.'),
          backgroundColor: AppTheme.warning,
        ),
      );
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final productsAsync = ref.watch(productsProvider);
    final selectedCategory = ref.watch(selectedCategoryProvider);

    return Scaffold(
      body: Row(
        children: [
          // Left: Products
          Expanded(
            flex: 3,
            child: Column(
              children: [
                // Top bar
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 24, vertical: 16),
                  decoration: const BoxDecoration(
                    color: AppTheme.surface,
                    border: Border(
                      bottom: BorderSide(color: AppTheme.border),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.arrow_back),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        widget.table.name.isNotEmpty
                            ? widget.table.name
                            : 'Stol ${widget.table.number}',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppTheme.accent.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'Yangi buyurtma',
                          style: TextStyle(
                            color: AppTheme.accent,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Categories
                categoriesAsync.when(
                  data: (categories) => Container(
                    height: 56,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: categories.length + 1,
                      itemBuilder: (context, index) {
                        if (index == 0) {
                          return _CategoryChip(
                            label: 'Barchasi',
                            isSelected: selectedCategory == null,
                            onTap: () => ref
                                .read(selectedCategoryProvider.notifier)
                                .state = null,
                          );
                        }
                        final category = categories[index - 1];
                        return _CategoryChip(
                          label: category.name,
                          isSelected: selectedCategory == category.id,
                          onTap: () => ref
                              .read(selectedCategoryProvider.notifier)
                              .state = category.id,
                        );
                      },
                    ),
                  ),
                  loading: () => const SizedBox(height: 56),
                  error: (_, __) => const SizedBox(height: 56),
                ),

                // Products grid
                Expanded(
                  child: productsAsync.when(
                    data: (products) {
                      final filtered = selectedCategory != null
                          ? products
                              .where((p) =>
                                  p.categoryId == selectedCategory &&
                                  p.isActive)
                              .toList()
                          : products.where((p) => p.isActive).toList();

                      if (filtered.isEmpty) {
                        return const Center(
                          child: Text('Mahsulotlar topilmadi'),
                        );
                      }

                      return GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 4,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                          childAspectRatio: 0.85,
                        ),
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final product = filtered[index];
                          return _ProductCard(
                            product: product,
                            onTap: () => _addProduct(product),
                          );
                        },
                      );
                    },
                    loading: () => const Center(
                      child:
                          CircularProgressIndicator(color: AppTheme.accent),
                    ),
                    error: (e, _) => Center(child: Text('Xatolik: $e')),
                  ),
                ),
              ],
            ),
          ),

          // Right: Order summary
          Container(
            width: 360,
            decoration: const BoxDecoration(
              color: AppTheme.surface,
              border: Border(
                left: BorderSide(color: AppTheme.border),
              ),
            ),
            child: Column(
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      const Icon(Icons.receipt_long, color: AppTheme.accent),
                      const SizedBox(width: 8),
                      Text(
                        'Buyurtma',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const Spacer(),
                      Text(
                        '${_orderItems.length} ta',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1, color: AppTheme.border),

                // Order items
                Expanded(
                  child: _orderItems.isEmpty
                      ? const Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.add_shopping_cart,
                                  size: 48, color: AppTheme.textMuted),
                              SizedBox(height: 12),
                              Text(
                                'Mahsulot qo\'shing',
                                style: TextStyle(color: AppTheme.textMuted),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          itemCount: _orderItems.length,
                          itemBuilder: (context, index) {
                            final item = _orderItems[index];
                            return _OrderItemTile(
                              item: item,
                              onIncrement: () => _updateQuantity(index, 1),
                              onDecrement: () => _updateQuantity(index, -1),
                              onRemove: () => _removeItem(index),
                            );
                          },
                        ),
                ),

                // Total and actions
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: const BoxDecoration(
                    border: Border(
                      top: BorderSide(color: AppTheme.border),
                    ),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Jami:',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          Text(
                            '${_total.toStringAsFixed(0)} so\'m',
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(
                                  color: AppTheme.accent,
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton.icon(
                          onPressed:
                              _orderItems.isNotEmpty ? _submitOrder : null,
                          icon: const Icon(Icons.send),
                          label: const Text('Buyurtma berish'),
                        ),
                      ),
                    ],
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

class _CategoryChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _CategoryChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8, top: 8, bottom: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? AppTheme.accent
                : AppTheme.accent.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : AppTheme.accent,
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  final Product product;
  final VoidCallback onTap;

  const _ProductCard({required this.product, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: AppTheme.glassCard(borderRadius: 12),
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image placeholder
            Expanded(
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: AppTheme.surfaceLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: product.image != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          product.image!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Center(
                            child: Icon(Icons.fastfood,
                                color: AppTheme.textMuted, size: 36),
                          ),
                        ),
                      )
                    : const Center(
                        child: Icon(Icons.fastfood,
                            color: AppTheme.textMuted, size: 36),
                      ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              product.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppTheme.textPrimary,
                fontWeight: FontWeight.w500,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${product.price.toStringAsFixed(0)} so\'m',
              style: const TextStyle(
                color: AppTheme.accent,
                fontWeight: FontWeight.bold,
                fontSize: 15,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderItemTile extends StatelessWidget {
  final OrderItem item;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;
  final VoidCallback onRemove;

  const _OrderItemTile({
    required this.item,
    required this.onIncrement,
    required this.onDecrement,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: ValueKey(item.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onRemove(),
      background: Container(
        color: AppTheme.error.withOpacity(0.2),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(Icons.delete, color: AppTheme.error),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.product?.name ?? 'Mahsulot',
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    '${item.price.toStringAsFixed(0)} x ${item.quantity} = ${item.subtotal.toStringAsFixed(0)}',
                    style: const TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            // Quantity controls
            Container(
              decoration: BoxDecoration(
                color: AppTheme.background,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  IconButton(
                    onPressed: onDecrement,
                    icon: const Icon(Icons.remove, size: 18),
                    constraints: const BoxConstraints(
                      minWidth: 36,
                      minHeight: 36,
                    ),
                    padding: EdgeInsets.zero,
                  ),
                  SizedBox(
                    width: 28,
                    child: Text(
                      '${item.quantity}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: onIncrement,
                    icon: const Icon(Icons.add, size: 18),
                    constraints: const BoxConstraints(
                      minWidth: 36,
                      minHeight: 36,
                    ),
                    padding: EdgeInsets.zero,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
