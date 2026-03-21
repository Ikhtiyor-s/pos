import 'dart:convert';
import 'package:http/http.dart' as http;

class MxikResult {
  final String mxikCode;
  final String name;
  final String? groupName;
  final String? className;
  final String? brandName;
  final String? unitName;
  final String? internationalCode;

  const MxikResult({
    required this.mxikCode,
    required this.name,
    this.groupName,
    this.className,
    this.brandName,
    this.unitName,
    this.internationalCode,
  });
}

class MxikService {
  static const _baseUrl = 'https://tasnif.soliq.uz/api/cls-api';

  static final MxikService _instance = MxikService._();
  factory MxikService() => _instance;
  MxikService._();

  /// Barcode (GTIN) bo'yicha MXIK kodni qidirish
  Future<MxikResult?> searchByBarcode(String barcode) async {
    try {
      final url = Uri.parse(
          '$_baseUrl/mxik/search/by-params?gtin=$barcode&size=1&page=0&lang=uz');
      final response = await http.get(url).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final content = data['data']?['content'] as List?;
        if (content != null && content.isNotEmpty) {
          final item = content[0];
          return MxikResult(
            mxikCode: item['mxikCode'] ?? '',
            name: item['mxikName'] ?? '',
            groupName: item['groupName'],
            className: item['className'],
            brandName: item['brandName'],
            unitName: item['unitName'],
            internationalCode: item['internationalCode'],
          );
        }
      }
    } catch (_) {}
    return null;
  }

  /// Kalit so'z bo'yicha MXIK qidirish
  Future<List<MxikResult>> searchByKeyword(String keyword, {int size = 20}) async {
    try {
      final url = Uri.parse(
          '$_baseUrl/elasticsearch/search?search=${Uri.encodeComponent(keyword)}&size=$size&page=0&lang=uz');
      final response = await http.get(url).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final items = data['data'] as List?;
        if (items != null) {
          return items.map((item) => MxikResult(
            mxikCode: item['mxikCode'] ?? '',
            name: item['name'] ?? '',
            groupName: item['groupName'],
            className: item['className'],
            brandName: item['brandName'],
            unitName: item['unitsName'],
            internationalCode: item['internationalCode'],
          )).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  /// MXIK kod bo'yicha batafsil ma'lumot olish
  Future<MxikResult?> getByCode(String mxikCode) async {
    try {
      final url = Uri.parse(
          '$_baseUrl/integration-mxik/get/history/$mxikCode');
      final response = await http.get(url).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['data'] != null) {
          final item = data['data'];
          return MxikResult(
            mxikCode: item['mxikCode'] ?? mxikCode,
            name: item['name'] ?? '',
            groupName: item['groupName'],
            className: item['className'],
            brandName: item['brandName'],
            unitName: item['unitName'],
            internationalCode: item['internationalCode'],
          );
        }
      }
    } catch (_) {}
    return null;
  }
}
