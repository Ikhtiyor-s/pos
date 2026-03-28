import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/lang_store.dart';
import '../models/order.dart';
import '../models/product.dart';
import '../services/order_service.dart';
import '../services/product_service.dart';

class MenuScreen extends StatefulWidget {
  final String tableId;
  final int tableNumber;
  final String tableName;

  const MenuScreen({
    super.key,
    required this.tableId,
    required this.tableNumber,
    required this.tableName,
  });

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _CartItem {
  final Product product;
  int quantity;

  _CartItem({required this.product, required this.quantity});
}

class _MenuScreenState extends State<MenuScreen> {
  List<Order> _existingOrders = [];
  List<Category> _categories = [];
  List<Product> _products = [];
  String? _selectedCategoryId;
  bool _loadingOrders = true;
  bool _loadingProducts = true;
  bool _ordersExpanded = true;

  final Map<String, _CartItem> _cart = {};
  int _guestCount = 1;
  bool _cartDrawerOpen = false;

  // Per-item loading for quantity updates
  final Set<String> _updatingItems = {};
  bool _closingTable = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    _loadOrders();
    _loadProducts();
  }

  Future<void> _loadOrders() async {
    setState(() => _loadingOrders = true);
    try {
      final service = OrderService();
      final orders = await service.getByTableId(widget.tableId);
      if (mounted) {
        setState(() {
          _existingOrders = orders
              .where((o) =>
                  o.status != 'COMPLETED' && o.status != 'CANCELLED')
              .toList();
          _loadingOrders = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loadingOrders = false);
      }
    }
  }

  Future<void> _loadProducts({String? categoryId}) async {
    setState(() => _loadingProducts = true);
    try {
      final productService = ProductService();

      if (_categories.isEmpty) {
        final cats = await productService.getCategories();
        cats.sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
        if (mounted) setState(() => _categories = cats);
      }

      final products = await productService.getAll(categoryId: categoryId);
      if (mounted) {
        setState(() {
          _products = products.where((p) => p.isAvailable).toList();
          _loadingProducts = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loadingProducts = false);
      }
    }
  }

  void _selectCategory(String? categoryId) {
    setState(() => _selectedCategoryId = categoryId);
    _loadProducts(categoryId: categoryId);
  }

  void _addToCart(Product product) {
    setState(() {
      if (_cart.containsKey(product.id)) {
        _cart[product.id]!.quantity++;
      } else {
        _cart[product.id] = _CartItem(product: product, quantity: 1);
      }
    });
  }

  void _removeFromCart(Product product) {
    setState(() {
      if (_cart.containsKey(product.id)) {
        if (_cart[product.id]!.quantity <= 1) {
          _cart.remove(product.id);
        } else {
          _cart[product.id]!.quantity--;
        }
      }
    });
  }

  int get _cartTotal =>
      _cart.values.fold(0, (sum, item) => sum + item.quantity);

  double get _cartAmount => _cart.values
      .fold(0.0, (sum, item) => sum + item.product.price * item.quantity);

  Future<void> _confirmOrder() async {
    if (_cart.isEmpty) return;
    setState(() => _cartDrawerOpen = false);

    final items = _cart.values
        .map((c) => {'productId': c.product.id, 'quantity': c.quantity})
        .toList();

    try {
      final service = OrderService();
      await service.create(
        tableId: widget.tableId,
        guestCount: _guestCount,
        items: items,
      );
      setState(() => _cart.clear());
      await _loadOrders();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Buyurtma yuborildi!'),
            backgroundColor: Color(0xFF22C55E),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Xatolik: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _updateItemQty(
      Order order, OrderItem item, int newQty) async {
    final key = '${order.id}_${item.id}';
    if (_updatingItems.contains(key)) return;

    setState(() => _updatingItems.add(key));
    try {
      final service = OrderService();
      await service.updateItemQuantity(order.id, item.id, newQty);
      await _loadOrders();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Xatolik: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _updatingItems.remove(key));
    }
  }

  Future<void> _closeTable() async {
    final lang = context.read<LangNotifier>();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Stolni yopish'),
        content: const Text('Chekni chiqarib stolni yopishni tasdiqlaysizmi?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(lang.t('cancel')),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Yopish', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _closingTable = true);
    try {
      final service = OrderService();
      for (final order in _existingOrders) {
        try {
          await service.printReceipt(order.id);
        } catch (_) {}
      }
      if (mounted) {
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Xatolik: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _closingTable = false);
    }
  }

  String _formatPrice(double price) {
    final formatter = RegExp(r'(\d)(?=(\d{3})+(?!\d))');
    return price
            .toStringAsFixed(0)
            .replaceAllMapped(formatter, (m) => '${m[1]} ') +
        " so'm";
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
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<LangNotifier>();

    return Scaffold(
      body: Stack(
        children: [
          Column(
            children: [
              // Header
              Container(
                color: const Color(0xFF111827),
                child: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(4, 8, 16, 12),
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.arrow_back, color: Colors.white),
                          onPressed: () => context.pop(),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.tableName.isNotEmpty
                                  ? widget.tableName
                                  : 'Stol ${widget.tableNumber}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 17,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (widget.tableName.isNotEmpty)
                              Text(
                                'Stol ${widget.tableNumber}',
                                style: const TextStyle(
                                    color: Colors.white54, fontSize: 12),
                              ),
                          ],
                        ),
                        const Spacer(),
                        Stack(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.shopping_cart_outlined,
                                  color: Colors.white),
                              onPressed: () =>
                                  setState(() => _cartDrawerOpen = true),
                            ),
                            if (_cartTotal > 0)
                              Positioned(
                                right: 4,
                                top: 4,
                                child: Container(
                                  width: 18,
                                  height: 18,
                                  decoration: const BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Color(0xFFFF6B00),
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    '$_cartTotal',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              Expanded(
                child: CustomScrollView(
                  slivers: [
                    // Existing orders section
                    if (_loadingOrders)
                      const SliverToBoxAdapter(
                        child: Padding(
                          padding: EdgeInsets.all(16),
                          child: Center(
                              child: CircularProgressIndicator(
                                  color: Color(0xFFFF6B00))),
                        ),
                      )
                    else if (_existingOrders.isNotEmpty)
                      SliverToBoxAdapter(
                        child: _ExistingOrdersSection(
                          orders: _existingOrders,
                          expanded: _ordersExpanded,
                          onToggle: () =>
                              setState(() => _ordersExpanded = !_ordersExpanded),
                          updatingItems: _updatingItems,
                          onUpdateQty: _updateItemQty,
                          formatPrice: _formatPrice,
                          statusColor: _statusColor,
                          lang: lang,
                        ),
                      ),

                    // Close table button
                    if (_existingOrders.isNotEmpty)
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                          child: SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFEF4444),
                                foregroundColor: Colors.white,
                                padding:
                                    const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12)),
                              ),
                              onPressed: _closingTable ? null : _closeTable,
                              icon: _closingTable
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                          color: Colors.white, strokeWidth: 2),
                                    )
                                  : const Icon(Icons.close),
                              label: const Text(
                                'Stolni yopish',
                                style: TextStyle(
                                    fontSize: 15, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                        ),
                      ),

                    // Category chips
                    SliverToBoxAdapter(
                      child: _CategoryChips(
                        categories: _categories,
                        selectedId: _selectedCategoryId,
                        onSelect: _selectCategory,
                      ),
                    ),

                    // Products
                    if (_loadingProducts)
                      const SliverToBoxAdapter(
                        child: Padding(
                          padding: EdgeInsets.all(32),
                          child: Center(
                              child: CircularProgressIndicator(
                                  color: Color(0xFFFF6B00))),
                        ),
                      )
                    else if (_products.isEmpty)
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Center(
                            child: Text(
                              lang.t('menu.noProducts'),
                              style: const TextStyle(color: Colors.grey),
                            ),
                          ),
                        ),
                      )
                    else
                      SliverPadding(
                        padding: EdgeInsets.only(
                          left: 12,
                          right: 12,
                          top: 8,
                          bottom: _cartTotal > 0 ? 80 : 12,
                        ),
                        sliver: SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final product = _products[index];
                              final inCart = _cart[product.id]?.quantity ?? 0;
                              return _ProductTile(
                                product: product,
                                inCart: inCart,
                                onAdd: () => _addToCart(product),
                                onRemove: () => _removeFromCart(product),
                                formatPrice: _formatPrice,
                              );
                            },
                            childCount: _products.length,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),

          // Mini cart bar
          if (_cartTotal > 0 && !_cartDrawerOpen)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: GestureDetector(
                    onTap: () => setState(() => _cartDrawerOpen = true),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 14),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFF97316), Color(0xFFEC4899)],
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFFF6B00).withOpacity(0.4),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.25),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '$_cartTotal ta',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          const Text(
                            'Savatni ko\'rish',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            _formatPrice(_cartAmount),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Icon(Icons.arrow_forward_ios,
                              color: Colors.white, size: 14),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),

          // Cart drawer
          if (_cartDrawerOpen)
            _CartDrawer(
              cart: _cart,
              guestCount: _guestCount,
              onGuestCountChanged: (v) => setState(() => _guestCount = v),
              onAdd: _addToCart,
              onRemove: _removeFromCart,
              onClose: () => setState(() => _cartDrawerOpen = false),
              onConfirm: _confirmOrder,
              formatPrice: _formatPrice,
              cartAmount: _cartAmount,
              lang: lang,
            ),
        ],
      ),
    );
  }
}

// ─── Existing Orders Section ───────────────────────────────────────────────

class _ExistingOrdersSection extends StatelessWidget {
  final List<Order> orders;
  final bool expanded;
  final VoidCallback onToggle;
  final Set<String> updatingItems;
  final Future<void> Function(Order, OrderItem, int) onUpdateQty;
  final String Function(double) formatPrice;
  final Color Function(String) statusColor;
  final LangNotifier lang;

  const _ExistingOrdersSection({
    required this.orders,
    required this.expanded,
    required this.onToggle,
    required this.updatingItems,
    required this.onUpdateQty,
    required this.formatPrice,
    required this.statusColor,
    required this.lang,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 8),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E2530) : Colors.white,
        borderRadius: BorderRadius.circular(16),
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
            onTap: onToggle,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: Row(
                children: [
                  const Icon(Icons.receipt_outlined,
                      size: 18, color: Color(0xFFFF6B00)),
                  const SizedBox(width: 8),
                  Text(
                    lang.t('menu.existingOrders'),
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFF6B00).withOpacity(0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${orders.length}',
                      style: const TextStyle(
                        color: Color(0xFFFF6B00),
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Icon(
                    expanded
                        ? Icons.keyboard_arrow_up
                        : Icons.keyboard_arrow_down,
                    color: Colors.grey,
                  ),
                ],
              ),
            ),
          ),
          if (expanded)
            ...orders.map((order) => _OrderDetailCard(
                  order: order,
                  updatingItems: updatingItems,
                  onUpdateQty: onUpdateQty,
                  formatPrice: formatPrice,
                  statusColor: statusColor,
                  lang: lang,
                )),
        ],
      ),
    );
  }
}

class _OrderDetailCard extends StatelessWidget {
  final Order order;
  final Set<String> updatingItems;
  final Future<void> Function(Order, OrderItem, int) onUpdateQty;
  final String Function(double) formatPrice;
  final Color Function(String) statusColor;
  final LangNotifier lang;

  const _OrderDetailCard({
    required this.order,
    required this.updatingItems,
    required this.onUpdateQty,
    required this.formatPrice,
    required this.statusColor,
    required this.lang,
  });

  @override
  Widget build(BuildContext context) {
    final color = statusColor(order.status);

    return Container(
      margin: const EdgeInsets.fromLTRB(0, 0, 0, 1),
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(color: Colors.grey.withOpacity(0.1)),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
            child: Row(
              children: [
                Flexible(
                  child: Text(
                    '#${order.orderNumber}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    lang.t('orderStatus.${order.status}'),
                    style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  formatPrice(order.computedTotal),
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFFF6B00), fontSize: 13),
                ),
              ],
            ),
          ),
          ...order.items.map((item) {
            final key = '${order.id}_${item.id}';
            final isUpdating = updatingItems.contains(key);
            return Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
              child: Row(
                children: [
                  Expanded(
                    child: Text(item.productName, style: const TextStyle(fontSize: 13)),
                  ),
                  if (isUpdating)
                    const SizedBox(
                      width: 80,
                      child: Center(
                        child: SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Color(0xFFFF6B00)),
                        ),
                      ),
                    )
                  else
                    Row(
                      children: [
                        _SmallQtyBtn(
                          icon: item.quantity <= 1 ? Icons.delete_outline : Icons.remove,
                          color: item.quantity <= 1 ? Colors.red : null,
                          onTap: () async {
                            if (item.quantity <= 1) {
                              final confirmed = await showDialog<bool>(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  title: const Text('O\'chirish'),
                                  content: Text('${item.productName} ni buyurtmadan o\'chirmoqchimisiz?'),
                                  actions: [
                                    TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Bekor')),
                                    TextButton(
                                      onPressed: () => Navigator.pop(ctx, true),
                                      style: TextButton.styleFrom(foregroundColor: Colors.red),
                                      child: const Text('O\'chirish'),
                                    ),
                                  ],
                                ),
                              );
                              if (confirmed == true) onUpdateQty(order, item, 0);
                            } else {
                              onUpdateQty(order, item, item.quantity - 1);
                            }
                          },
                        ),
                        SizedBox(
                          width: 28,
                          child: Text(
                            '${item.quantity}',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                                fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                        ),
                        _SmallQtyBtn(
                          icon: Icons.add,
                          onTap: () => onUpdateQty(order, item, item.quantity + 1),
                        ),
                      ],
                    ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 80,
                    child: Text(
                      formatPrice(item.subtotal),
                      textAlign: TextAlign.right,
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

class _SmallQtyBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  final Color? color;

  const _SmallQtyBtn({required this.icon, this.onTap, this.color});

  @override
  Widget build(BuildContext context) {
    final c = color ?? (onTap != null ? const Color(0xFFFF6B00) : Colors.grey);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 26,
        height: 26,
        decoration: BoxDecoration(
          color: c.withOpacity(0.1),
          borderRadius: BorderRadius.circular(7),
        ),
        child: Icon(icon, size: 14, color: c),
      ),
    );
  }
}

// ─── Category Chips ────────────────────────────────────────────────────────

class _CategoryChips extends StatelessWidget {
  final List<Category> categories;
  final String? selectedId;
  final void Function(String?) onSelect;

  const _CategoryChips({
    required this.categories,
    required this.selectedId,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
      child: Row(
        children: [
          _Chip(
            label: 'Barchasi',
            selected: selectedId == null,
            onTap: () => onSelect(null),
          ),
          ...categories.map((cat) => _Chip(
                label: cat.name,
                selected: selectedId == cat.id,
                onTap: () => onSelect(cat.id),
              )),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _Chip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFFF6B00) : Colors.grey.withOpacity(0.15),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : null,
            fontWeight: selected ? FontWeight.bold : FontWeight.normal,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}

// ─── Product Tile ──────────────────────────────────────────────────────────

class _ProductTile extends StatelessWidget {
  final Product product;
  final int inCart;
  final VoidCallback onAdd;
  final VoidCallback onRemove;
  final String Function(double) formatPrice;

  const _ProductTile({
    required this.product,
    required this.inCart,
    required this.onAdd,
    required this.onRemove,
    required this.formatPrice,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E2530) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          // Image
          ClipRRect(
            borderRadius:
                const BorderRadius.horizontal(left: Radius.circular(12)),
            child: product.imageUrl != null
                ? Image.network(
                    product.imageUrl!,
                    width: 72,
                    height: 72,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _PlaceholderImage(),
                  )
                : _PlaceholderImage(),
          ),

          const SizedBox(width: 12),

          // Name + price
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 14),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  formatPrice(product.price),
                  style: const TextStyle(
                    color: Color(0xFFFF6B00),
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),

          // Add/qty controls
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: inCart == 0
                ? GestureDetector(
                    onTap: onAdd,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFF6B00),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        '+ Qo\'sh',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  )
                : Row(
                    children: [
                      _QtyButton(
                        icon: Icons.remove,
                        onTap: onRemove,
                      ),
                      SizedBox(
                        width: 30,
                        child: Text(
                          '$inCart',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ),
                      _QtyButton(
                        icon: Icons.add,
                        onTap: onAdd,
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _PlaceholderImage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 72,
      height: 72,
      color: Colors.grey.withOpacity(0.12),
      child: const Icon(Icons.fastfood_outlined, color: Colors.grey, size: 28),
    );
  }
}

class _QtyButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _QtyButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          color: const Color(0xFFFF6B00).withOpacity(0.12),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, size: 16, color: const Color(0xFFFF6B00)),
      ),
    );
  }
}

// ─── Cart Drawer ───────────────────────────────────────────────────────────

class _CartDrawer extends StatelessWidget {
  final Map<String, _CartItem> cart;
  final int guestCount;
  final void Function(int) onGuestCountChanged;
  final void Function(Product) onAdd;
  final void Function(Product) onRemove;
  final VoidCallback onClose;
  final VoidCallback onConfirm;
  final String Function(double) formatPrice;
  final double cartAmount;
  final LangNotifier lang;

  const _CartDrawer({
    required this.cart,
    required this.guestCount,
    required this.onGuestCountChanged,
    required this.onAdd,
    required this.onRemove,
    required this.onClose,
    required this.onConfirm,
    required this.formatPrice,
    required this.cartAmount,
    required this.lang,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onClose,
      child: Container(
        color: Colors.black54,
        child: Align(
          alignment: Alignment.bottomCenter,
          child: GestureDetector(
            onTap: () {},
            child: Container(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.75,
              ),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1A2133) : Colors.white,
                borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(24)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Handle
                  const SizedBox(height: 8),
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Header
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Row(
                      children: [
                        const Text(
                          'Savat',
                          style: TextStyle(
                              fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: onClose,
                        ),
                      ],
                    ),
                  ),

                  // Guest count
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                    child: Row(
                      children: [
                        Text(lang.t('menu.guestCount'),
                            style: const TextStyle(fontSize: 14)),
                        const Spacer(),
                        _QtyButton(
                          icon: Icons.remove,
                          onTap: guestCount > 1
                              ? () => onGuestCountChanged(guestCount - 1)
                              : () {},
                        ),
                        SizedBox(
                          width: 36,
                          child: Text(
                            '$guestCount',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                                fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        ),
                        _QtyButton(
                          icon: Icons.add,
                          onTap: () => onGuestCountChanged(guestCount + 1),
                        ),
                      ],
                    ),
                  ),

                  const Divider(height: 1),

                  // Items
                  Flexible(
                    child: ListView(
                      shrinkWrap: true,
                      padding: const EdgeInsets.all(0),
                      children: cart.values.map((cartItem) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 20, vertical: 10),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      cartItem.product.name,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 14),
                                    ),
                                    Text(
                                      formatPrice(cartItem.product.price),
                                      style: const TextStyle(
                                          color: Color(0xFFFF6B00),
                                          fontSize: 12),
                                    ),
                                  ],
                                ),
                              ),
                              Row(
                                children: [
                                  _QtyButton(
                                    icon: Icons.remove,
                                    onTap: () =>
                                        onRemove(cartItem.product),
                                  ),
                                  SizedBox(
                                    width: 32,
                                    child: Text(
                                      '${cartItem.quantity}',
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                  _QtyButton(
                                    icon: Icons.add,
                                    onTap: () => onAdd(cartItem.product),
                                  ),
                                ],
                              ),
                              SizedBox(
                                width: 80,
                                child: Text(
                                  formatPrice(cartItem.product.price *
                                      cartItem.quantity),
                                  textAlign: TextAlign.right,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13),
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ),

                  const Divider(height: 1),

                  // Total + confirm
                  SafeArea(
                    top: false,
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Text(
                                lang.t('total'),
                                style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold),
                              ),
                              const Spacer(),
                              Text(
                                formatPrice(cartAmount),
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFFFF6B00),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFFF6B00),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                    vertical: 14),
                                shape: RoundedRectangleBorder(
                                    borderRadius:
                                        BorderRadius.circular(14)),
                              ),
                              onPressed: onConfirm,
                              child: const Text(
                                'Buyurtma berish',
                                style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
