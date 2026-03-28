class Category {
  final String id;
  final String name;
  final int sortOrder;

  Category({
    required this.id,
    required this.name,
    required this.sortOrder,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      sortOrder: json['sortOrder'] is int
          ? json['sortOrder'] as int
          : int.tryParse(json['sortOrder']?.toString() ?? '0') ?? 0,
    );
  }
}

class Product {
  final String id;
  final String name;
  final double price;
  final String? imageUrl;
  final String categoryId;
  final String categoryName;
  final bool isAvailable;

  Product({
    required this.id,
    required this.name,
    required this.price,
    this.imageUrl,
    required this.categoryId,
    required this.categoryName,
    required this.isAvailable,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    final category = json['category'];
    return Product(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      price: _parseDouble(json['price']),
      imageUrl: json['imageUrl']?.toString() ?? json['image']?.toString(),
      categoryId: category?['id']?.toString() ?? json['categoryId']?.toString() ?? '',
      categoryName: category?['name']?.toString() ?? '',
      isAvailable: json['isAvailable'] == true || json['isAvailable'] == 1,
    );
  }

  static double _parseDouble(dynamic v) {
    if (v == null) return 0.0;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    return double.tryParse(v.toString()) ?? 0.0;
  }
}
