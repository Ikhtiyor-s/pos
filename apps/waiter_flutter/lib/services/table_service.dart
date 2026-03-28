import '../core/api.dart';
import '../models/table.dart';

class TableService {
  Future<List<TableModel>> getAll() async {
    final response = await dio.get('/tables');
    final data = response.data;
    final Map<String, dynamic> body = data is Map<String, dynamic> ? data : {};
    final List<dynamic> list = body['data'] as List<dynamic>? ??
        body['tables'] as List<dynamic>? ??
        (data is List ? data : []);
    return list.map((e) => TableModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<TableModel> getById(String id) async {
    final response = await dio.get('/tables/$id');
    final data = response.data;
    final Map<String, dynamic> body = data is Map<String, dynamic> ? data : {};
    final tableData = body['data'] ?? body;
    return TableModel.fromJson(tableData as Map<String, dynamic>);
  }
}
