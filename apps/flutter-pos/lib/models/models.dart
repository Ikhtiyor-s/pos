class User {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;
  final String tenantId;

  User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    required this.tenantId,
  });

  String get fullName => '$firstName $lastName';

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      firstName: json['firstName']?.toString() ?? '',
      lastName: json['lastName']?.toString() ?? '',
      role: json['role']?.toString() ?? '',
      tenantId: json['tenantId']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'role': role,
      'tenantId': tenantId,
    };
  }
}

class Product {
  final String id;
  final String name;
  final double price;
  final String? image;
  final String categoryId;
  final bool isActive;
  final int? cookingTime; // minutes
  final String? weight;

  Product({
    required this.id,
    required this.name,
    required this.price,
    this.image,
    required this.categoryId,
    this.isActive = true,
    this.cookingTime,
    this.weight,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      price: (json['price'] is num)
          ? (json['price'] as num).toDouble()
          : double.tryParse(json['price']?.toString() ?? '0') ?? 0,
      image: json['image']?.toString(),
      categoryId: json['categoryId']?.toString() ?? '',
      isActive: json['isActive'] ?? true,
      cookingTime: json['cookingTime'] is num
          ? (json['cookingTime'] as num).toInt()
          : null,
      weight: json['weight']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'image': image,
      'categoryId': categoryId,
      'isActive': isActive,
      'cookingTime': cookingTime,
      'weight': weight,
    };
  }
}

class Category {
  final String id;
  final String name;
  final String? icon;
  final String? color;

  Category({
    required this.id,
    required this.name,
    this.icon,
    this.color,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      icon: json['icon']?.toString(),
      color: json['color']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'icon': icon,
      'color': color,
    };
  }
}

class RestaurantTable {
  final String id;
  final int number;
  final String name;
  final int capacity;
  final String status; // free, occupied, reserved
  final String? qrCode;

  RestaurantTable({
    required this.id,
    required this.number,
    required this.name,
    required this.capacity,
    this.status = 'free',
    this.qrCode,
  });

  bool get isFree => status == 'free';
  bool get isOccupied => status == 'occupied';
  bool get isReserved => status == 'reserved';

  factory RestaurantTable.fromJson(Map<String, dynamic> json) {
    return RestaurantTable(
      id: json['id']?.toString() ?? '',
      number: json['number'] is num ? (json['number'] as num).toInt() : 0,
      name: json['name']?.toString() ?? '',
      capacity:
          json['capacity'] is num ? (json['capacity'] as num).toInt() : 4,
      status: json['status']?.toString() ?? 'free',
      qrCode: json['qrCode']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'number': number,
      'name': name,
      'capacity': capacity,
      'status': status,
      'qrCode': qrCode,
    };
  }
}

class Order {
  final String id;
  final String orderNumber;
  final String source; // pos, qr, telegram
  final String type; // dine_in, takeaway, delivery
  final String status; // pending, preparing, ready, completed, cancelled
  final String? tableId;
  final List<OrderItem> items;
  final double total;
  final DateTime createdAt;

  Order({
    required this.id,
    required this.orderNumber,
    this.source = 'pos',
    this.type = 'dine_in',
    this.status = 'pending',
    this.tableId,
    this.items = const [],
    this.total = 0,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  int get itemCount => items.fold(0, (sum, item) => sum + item.quantity);

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id']?.toString() ?? '',
      orderNumber: json['orderNumber']?.toString() ?? '',
      source: json['source']?.toString() ?? 'pos',
      type: json['type']?.toString() ?? 'dine_in',
      status: json['status']?.toString() ?? 'pending',
      tableId: json['tableId']?.toString(),
      items: (json['items'] as List<dynamic>?)
              ?.map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      total: (json['total'] is num)
          ? (json['total'] as num).toDouble()
          : double.tryParse(json['total']?.toString() ?? '0') ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderNumber': orderNumber,
      'source': source,
      'type': type,
      'status': status,
      'tableId': tableId,
      'items': items.map((e) => e.toJson()).toList(),
      'total': total,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  Order copyWith({
    String? id,
    String? orderNumber,
    String? source,
    String? type,
    String? status,
    String? tableId,
    List<OrderItem>? items,
    double? total,
    DateTime? createdAt,
  }) {
    return Order(
      id: id ?? this.id,
      orderNumber: orderNumber ?? this.orderNumber,
      source: source ?? this.source,
      type: type ?? this.type,
      status: status ?? this.status,
      tableId: tableId ?? this.tableId,
      items: items ?? this.items,
      total: total ?? this.total,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

class OrderItem {
  final String id;
  final String productId;
  final Product? product;
  final int quantity;
  final double price;
  final String status; // pending, preparing, ready, served
  final String? notes;

  OrderItem({
    required this.id,
    required this.productId,
    this.product,
    this.quantity = 1,
    required this.price,
    this.status = 'pending',
    this.notes,
  });

  double get subtotal => price * quantity;

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id']?.toString() ?? '',
      productId: json['productId']?.toString() ?? '',
      product: json['product'] != null
          ? Product.fromJson(json['product'] as Map<String, dynamic>)
          : null,
      quantity: json['quantity'] is num ? (json['quantity'] as num).toInt() : 1,
      price: (json['price'] is num)
          ? (json['price'] as num).toDouble()
          : double.tryParse(json['price']?.toString() ?? '0') ?? 0,
      status: json['status']?.toString() ?? 'pending',
      notes: json['notes']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'productId': productId,
      'product': product?.toJson(),
      'quantity': quantity,
      'price': price,
      'status': status,
      'notes': notes,
    };
  }

  OrderItem copyWith({
    String? id,
    String? productId,
    Product? product,
    int? quantity,
    double? price,
    String? status,
    String? notes,
  }) {
    return OrderItem(
      id: id ?? this.id,
      productId: productId ?? this.productId,
      product: product ?? this.product,
      quantity: quantity ?? this.quantity,
      price: price ?? this.price,
      status: status ?? this.status,
      notes: notes ?? this.notes,
    );
  }
}

class Payment {
  final String id;
  final String orderId;
  final String method; // cash, card, transfer
  final double amount;
  final String status; // pending, completed, refunded

  Payment({
    required this.id,
    required this.orderId,
    required this.method,
    required this.amount,
    this.status = 'pending',
  });

  factory Payment.fromJson(Map<String, dynamic> json) {
    return Payment(
      id: json['id']?.toString() ?? '',
      orderId: json['orderId']?.toString() ?? '',
      method: json['method']?.toString() ?? 'cash',
      amount: (json['amount'] is num)
          ? (json['amount'] as num).toDouble()
          : double.tryParse(json['amount']?.toString() ?? '0') ?? 0,
      status: json['status']?.toString() ?? 'pending',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderId': orderId,
      'method': method,
      'amount': amount,
      'status': status,
    };
  }
}
