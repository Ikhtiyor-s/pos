import '../core/api.dart';
import '../models/product.dart';

class ProductService {
  Future<List<Product>> getAll({String? categoryId}) async {
    final Map<String, dynamic> queryParams = {};
    if (categoryId != null) queryParams['categoryId'] = categoryId;

    final response = await dio.get(
      '/products',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );
    final data = response.data;
    final Map<String, dynamic> body = data is Map<String, dynamic> ? data : {};
    final List<dynamic> list = body['data'] as List<dynamic>? ??
        body['products'] as List<dynamic>? ??
        (data is List ? data : []);
    return list.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Category>> getCategories() async {
    final response = await dio.get('/categories');
    final data = response.data;
    final Map<String, dynamic> body = data is Map<String, dynamic> ? data : {};
    final List<dynamic> list = body['data'] as List<dynamic>? ??
        body['categories'] as List<dynamic>? ??
        (data is List ? data : []);
    return list.map((e) => Category.fromJson(e as Map<String, dynamic>)).toList();
  }
}
