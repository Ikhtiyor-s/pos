class TableModel {
  final String id;
  final int number;
  final String name;
  final int capacity;
  final String status;
  final int activeOrders;
  final double totalAmount;

  TableModel({
    required this.id,
    required this.number,
    required this.name,
    required this.capacity,
    required this.status,
    required this.activeOrders,
    this.totalAmount = 0,
  });

  factory TableModel.fromJson(Map<String, dynamic> json) {
    // orders dan umumiy summani hisoblash
    double total = 0;
    final orders = json['orders'];
    if (orders is List) {
      for (final o in orders) {
        total += _parseDouble(o['total']);
      }
    }

    return TableModel(
      id: json['id']?.toString() ?? '',
      number: _parseInt(json['number']),
      name: json['name']?.toString() ?? '',
      capacity: _parseInt(json['capacity']),
      status: json['status']?.toString() ?? 'FREE',
      activeOrders: _parseInt(json['activeOrders'] ?? json['activeOrdersCount']),
      totalAmount: total,
    );
  }

  static int _parseInt(dynamic v) {
    if (v == null) return 0;
    if (v is int) return v;
    return int.tryParse(v.toString()) ?? 0;
  }

  static double _parseDouble(dynamic v) {
    if (v == null) return 0;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    return double.tryParse(v.toString()) ?? 0;
  }
}
