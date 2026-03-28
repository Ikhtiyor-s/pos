import '../core/api.dart';
import '../models/order.dart';

class OrderService {
  Future<List<Order>> getAll({String? status}) async {
    final Map<String, dynamic> queryParams = {};
    if (status != null) queryParams['status'] = status;

    final response = await dio.get('/orders', queryParameters: queryParams.isNotEmpty ? queryParams : null);
    final data = response.data;
    final Map<String, dynamic> body = data is Map<String, dynamic> ? data : {};
    final List<dynamic> list = body['data'] as List<dynamic>? ??
        body['orders'] as List<dynamic>? ??
        (data is List ? data : []);
    return list.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Order>> getByTableId(String tableId) async {
    final response = await dio.get('/orders', queryParameters: {'tableId': tableId});
    final data = response.data;
    final Map<String, dynamic> body = data is Map<String, dynamic> ? data : {};
    final List<dynamic> list = body['data'] as List<dynamic>? ??
        body['orders'] as List<dynamic>? ??
        (data is List ? data : []);
    return list.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Order> create({
    required String tableId,
    required int guestCount,
    required List<Map<String, dynamic>> items,
  }) async {
    final response = await dio.post('/orders', data: {
      'type': 'DINE_IN',
      'tableId': tableId,
      'guestCount': guestCount,
      'items': items,
    });
    final data = response.data;
    final Map<String, dynamic> body = data is Map<String, dynamic> ? data : {};
    final orderData = body['data'] ?? body;
    return Order.fromJson(orderData as Map<String, dynamic>);
  }

  Future<Order> addItems(String orderId, List<Map<String, dynamic>> items) async {
    final response = await dio.post('/orders/$orderId/items', data: {'items': items});
    final data = response.data;
    final Map<String, dynamic> body = data is Map<String, dynamic> ? data : {};
    final orderData = body['data'] ?? body;
    return Order.fromJson(orderData as Map<String, dynamic>);
  }

  Future<Order> updateItemQuantity(String orderId, String itemId, int quantity) async {
    final response = await dio.patch('/orders/$orderId/items/$itemId', data: {'quantity': quantity});
    final data = response.data;
    final Map<String, dynamic> body = data is Map<String, dynamic> ? data : {};
    final orderData = body['data'] ?? body;
    return Order.fromJson(orderData as Map<String, dynamic>);
  }

  Future<Order> updateStatus(String orderId, String status) async {
    final response = await dio.patch('/orders/$orderId/status', data: {'status': status});
    final data = response.data;
    final Map<String, dynamic> body = data is Map<String, dynamic> ? data : {};
    final orderData = body['data'] ?? body;
    return Order.fromJson(orderData as Map<String, dynamic>);
  }

  Future<void> printReceipt(String orderId) async {
    await dio.post('/printer/print/receipt/$orderId');
  }

  Future<void> closeTable(String tableId) async {
    await dio.post('/tables/$tableId/close');
  }
}
