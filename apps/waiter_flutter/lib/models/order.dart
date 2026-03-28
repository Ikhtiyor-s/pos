class OrderItem {
  final String id;
  final String productId;
  final String productName;
  final double price;
  int quantity;
  final String? notes;

  OrderItem({
    required this.id,
    required this.productId,
    required this.productName,
    required this.price,
    required this.quantity,
    this.notes,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    final product = json['product'];
    return OrderItem(
      id: json['id']?.toString() ?? '',
      productId: product?['id']?.toString() ?? json['productId']?.toString() ?? '',
      productName: product?['name']?.toString() ?? json['productName']?.toString() ?? '',
      price: _parseDouble(json['price'] ?? product?['price']),
      quantity: _parseInt(json['quantity']),
      notes: json['notes']?.toString(),
    );
  }

  static double _parseDouble(dynamic v) {
    if (v == null) return 0.0;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    return double.tryParse(v.toString()) ?? 0.0;
  }

  static int _parseInt(dynamic v) {
    if (v == null) return 0;
    if (v is int) return v;
    return int.tryParse(v.toString()) ?? 0;
  }

  double get subtotal => price * quantity;
}

class Order {
  final String id;
  final String orderNumber;
  final String status;
  final String? tableId;
  final String? tableName;
  final int? tableNumber;
  final int guestCount;
  final List<OrderItem> items;
  final double total;
  final DateTime createdAt;
  final DateTime? updatedAt;

  Order({
    required this.id,
    required this.orderNumber,
    required this.status,
    this.tableId,
    this.tableName,
    this.tableNumber,
    required this.guestCount,
    required this.items,
    required this.total,
    required this.createdAt,
    this.updatedAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    final table = json['table'];
    final itemsJson = json['items'] as List<dynamic>? ?? json['orderItems'] as List<dynamic>? ?? [];

    return Order(
      id: json['id']?.toString() ?? '',
      orderNumber: json['orderNumber']?.toString() ?? json['number']?.toString() ?? '',
      status: json['status']?.toString() ?? 'NEW',
      tableId: table?['id']?.toString() ?? json['tableId']?.toString(),
      tableName: table?['name']?.toString(),
      tableNumber: table?['number'] is int
          ? table!['number'] as int
          : int.tryParse(table?['number']?.toString() ?? ''),
      guestCount: _parseInt(json['guestCount']),
      items: itemsJson.map((e) => OrderItem.fromJson(e as Map<String, dynamic>)).toList(),
      total: _parseDouble(json['total'] ?? json['totalAmount']),
      createdAt: _parseDate(json['createdAt']) ?? DateTime.now(),
      updatedAt: _parseDate(json['updatedAt']),
    );
  }

  static int _parseInt(dynamic v) {
    if (v == null) return 0;
    if (v is int) return v;
    return int.tryParse(v.toString()) ?? 0;
  }

  static double _parseDouble(dynamic v) {
    if (v == null) return 0.0;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    return double.tryParse(v.toString()) ?? 0.0;
  }

  static DateTime? _parseDate(dynamic v) {
    if (v == null) return null;
    return DateTime.tryParse(v.toString());
  }

  double get computedTotal {
    if (total > 0) return total;
    return items.fold(0.0, (sum, item) => sum + item.subtotal);
  }
}
