import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../models/models.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio _dio;
  final Box _authBox = Hive.box('auth');

  static const String _defaultBaseUrl = 'http://localhost:3000/api';

  ApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: const String.fromEnvironment(
        'API_URL',
        defaultValue: _defaultBaseUrl,
      ),
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // JWT Token interceptor
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        final token = _authBox.get('token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          // Token expired — clear auth
          _authBox.delete('token');
          _authBox.delete('user');
        }
        return handler.next(error);
      },
    ));
  }

  // ---------- Auth ----------

  Future<Map<String, dynamic>> loginWithPin(
      String pin, String tenantId) async {
    try {
      final response = await _dio.post('/auth/pin-login', data: {
        'pin': pin,
        'tenantId': tenantId,
      });
      final data = response.data as Map<String, dynamic>;

      // Save token and user
      if (data['token'] != null) {
        await _authBox.put('token', data['token']);
      }
      if (data['user'] != null) {
        await _authBox.put('user', data['user']);
      }

      return data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post('/auth/logout');
    } catch (_) {
      // Ignore logout errors
    } finally {
      await _authBox.delete('token');
      await _authBox.delete('user');
    }
  }

  // ---------- Products ----------

  Future<List<Product>> getProducts() async {
    try {
      final response = await _dio.get('/products');
      final List<dynamic> data = response.data is List
          ? response.data
          : (response.data['data'] as List<dynamic>?) ?? [];
      return data
          .map((json) => Product.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Product?> getProductByBarcode(String barcode) async {
    try {
      final response = await _dio.get('/products/barcode/$barcode');
      final data = response.data is Map && response.data['data'] != null
          ? response.data['data']
          : response.data;
      return Product.fromJson(data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw _handleError(e);
    }
  }

  // ---------- Categories ----------

  Future<List<Category>> getCategories() async {
    try {
      final response = await _dio.get('/categories');
      final List<dynamic> data = response.data is List
          ? response.data
          : (response.data['data'] as List<dynamic>?) ?? [];
      return data
          .map((json) => Category.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // ---------- Tables ----------

  Future<List<RestaurantTable>> getTables() async {
    try {
      final response = await _dio.get('/tables');
      final List<dynamic> data = response.data is List
          ? response.data
          : (response.data['data'] as List<dynamic>?) ?? [];
      return data
          .map(
              (json) => RestaurantTable.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // ---------- Orders ----------

  Future<List<Order>> getOrders({String? status}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (status != null) queryParams['status'] = status;

      final response = await _dio.get('/orders',
          queryParameters: queryParams.isNotEmpty ? queryParams : null);
      final List<dynamic> data = response.data is List
          ? response.data
          : (response.data['data'] as List<dynamic>?) ?? [];
      return data
          .map((json) => Order.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Order> createOrder(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/orders', data: data);
      final orderData = response.data is Map
          ? (response.data['data'] ?? response.data)
          : response.data;
      return Order.fromJson(orderData as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Order> updateOrderStatus(String id, String status) async {
    try {
      final response = await _dio.patch('/orders/$id/status', data: {
        'status': status,
      });
      final orderData = response.data is Map
          ? (response.data['data'] ?? response.data)
          : response.data;
      return Order.fromJson(orderData as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // ---------- Payments ----------

  Future<Payment> createPayment(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/payments', data: data);
      final paymentData = response.data is Map
          ? (response.data['data'] ?? response.data)
          : response.data;
      return Payment.fromJson(paymentData as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // ---------- Error Handling ----------

  String _handleError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return 'Server bilan aloqa uzildi. Internet tekshiring.';
      case DioExceptionType.connectionError:
        return 'Serverga ulanib bo\'lmadi. Server ishlayotganini tekshiring.';
      case DioExceptionType.badResponse:
        final statusCode = e.response?.statusCode;
        final message = e.response?.data is Map
            ? (e.response?.data['message'] ?? 'Xatolik yuz berdi')
            : 'Xatolik yuz berdi';
        switch (statusCode) {
          case 400:
            return 'Noto\'g\'ri so\'rov: $message';
          case 401:
            return 'Avtorizatsiya xatosi. Qaytadan kiring.';
          case 403:
            return 'Ruxsat berilmagan.';
          case 404:
            return 'Ma\'lumot topilmadi.';
          case 422:
            return 'Validatsiya xatosi: $message';
          case 500:
            return 'Server xatosi. Keyinroq urinib ko\'ring.';
          default:
            return 'Xatolik ($statusCode): $message';
        }
      case DioExceptionType.cancel:
        return 'So\'rov bekor qilindi.';
      default:
        return 'Noma\'lum xatolik: ${e.message}';
    }
  }
}
