import 'dart:convert';
import 'package:http/http.dart' as http;

class BarcodeLookupResult {
  final String barcode;
  final String name;
  final String? brand;
  final String? imageUrl;
  final String? category;
  final String? quantity;

  const BarcodeLookupResult({
    required this.barcode,
    required this.name,
    this.brand,
    this.imageUrl,
    this.category,
    this.quantity,
  });

  String get displayName {
    if (brand != null && brand!.isNotEmpty) {
      return '$brand - $name';
    }
    return name;
  }
}

class BarcodeLookupService {
  static final BarcodeLookupService _instance = BarcodeLookupService._();
  factory BarcodeLookupService() => _instance;
  BarcodeLookupService._();

  Future<BarcodeLookupResult?> lookup(String barcode) async {
    // Try Open Food Facts first
    final result = await _lookupOpenFoodFacts(barcode);
    if (result != null) return result;

    // Try Open Beauty Facts
    final beautyResult = await _lookupOpenBeautyFacts(barcode);
    if (beautyResult != null) return beautyResult;

    return null;
  }

  Future<BarcodeLookupResult?> _lookupOpenFoodFacts(String barcode) async {
    try {
      final url = Uri.parse(
          'https://world.openfoodfacts.org/api/v2/product/$barcode.json');
      final response = await http.get(url, headers: {
        'User-Agent': 'OshxonaPOS/3.0',
      }).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['status'] == 1 && data['product'] != null) {
          final product = data['product'];
          final name = product['product_name'] ??
              product['product_name_en'] ??
              product['generic_name'] ??
              '';

          if (name.toString().isEmpty) return null;

          return BarcodeLookupResult(
            barcode: barcode,
            name: name.toString(),
            brand: product['brands']?.toString(),
            imageUrl: product['image_front_small_url']?.toString(),
            category: product['categories']?.toString(),
            quantity: product['quantity']?.toString(),
          );
        }
      }
    } catch (_) {}
    return null;
  }

  Future<BarcodeLookupResult?> _lookupOpenBeautyFacts(String barcode) async {
    try {
      final url = Uri.parse(
          'https://world.openbeautyfacts.org/api/v2/product/$barcode.json');
      final response = await http.get(url, headers: {
        'User-Agent': 'OshxonaPOS/3.0',
      }).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['status'] == 1 && data['product'] != null) {
          final product = data['product'];
          final name = product['product_name'] ??
              product['product_name_en'] ??
              '';

          if (name.toString().isEmpty) return null;

          return BarcodeLookupResult(
            barcode: barcode,
            name: name.toString(),
            brand: product['brands']?.toString(),
            imageUrl: product['image_front_small_url']?.toString(),
            category: product['categories']?.toString(),
          );
        }
      }
    } catch (_) {}
    return null;
  }
}
