import '../core/api.dart';
import '../models/user.dart';

class AuthService {
  Future<Map<String, dynamic>> loginWithPassword(
      String phone, String password) async {
    try {
      final response = await dio.post('/auth/login', data: {
        'phone': phone,
        'password': password,
      });
      final data = response.data;
      final Map<String, dynamic> body =
          data is Map<String, dynamic> ? data : {};
      final tokenData = body['data'] ?? body;
      final accessToken = tokenData['accessToken']?.toString() ??
          tokenData['token']?.toString() ??
          '';
      if (accessToken.isEmpty) throw Exception('Token olinmadi');
      final userData = tokenData['user'] ?? body['user'];
      final user = userData != null
          ? User.fromJson(userData as Map<String, dynamic>)
          : User(id: '', name: '', phone: '', role: 'WAITER');
      return {'accessToken': accessToken, 'user': user};
    } on Exception catch (e) {
      final msg = e.toString();
      if (msg.contains('401') || msg.contains('Unauthorized')) {
        throw Exception('Noto\'g\'ri telefon yoki parol');
      }
      if (msg.contains('SocketException') || msg.contains('connection')) {
        throw Exception('Serverga ulanib bo\'lmadi');
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> loginWithPin(String pin, String tenantId) async {
    try {
      final response = await dio.post('/auth/login-pin', data: {
        'pin': pin,
        'tenantId': tenantId,
      });

      final data = response.data;
      final Map<String, dynamic> body = data is Map<String, dynamic> ? data : {};

      final tokenData = body['data'] ?? body;
      final accessToken = tokenData['accessToken']?.toString() ??
          tokenData['token']?.toString() ??
          '';

      if (accessToken.isEmpty) {
        throw Exception('Token not received from server');
      }

      final userData = tokenData['user'] ?? body['user'];
      final user = userData != null
          ? User.fromJson(userData as Map<String, dynamic>)
          : User(id: '', name: '', phone: '', role: 'WAITER');

      return {'accessToken': accessToken, 'user': user};
    } on Exception catch (e) {
      final msg = e.toString();
      if (msg.contains('401') || msg.contains('Unauthorized')) {
        throw Exception('Noto\'g\'ri PIN kod');
      }
      if (msg.contains('SocketException') || msg.contains('connection')) {
        throw Exception('Serverga ulanib bo\'lmadi');
      }
      rethrow;
    }
  }

  Future<User> getMe() async {
    final response = await dio.get('/auth/me');
    final data = response.data;
    final Map<String, dynamic> body = data is Map<String, dynamic> ? data : {};
    final userData = body['data'] ?? body;
    return User.fromJson(userData as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> checkIn() async {
    final response = await dio.post('/attendance/check-in');
    final data = response.data;
    final Map<String, dynamic> body = data is Map<String, dynamic> ? data : {};
    return body['data'] as Map<String, dynamic>? ?? body;
  }

  Future<Map<String, dynamic>> checkOut() async {
    final response = await dio.post('/attendance/check-out');
    final data = response.data;
    final Map<String, dynamic> body = data is Map<String, dynamic> ? data : {};
    return body['data'] as Map<String, dynamic>? ?? body;
  }

  Future<Map<String, dynamic>> getMyDailyStats() async {
    final response = await dio.get('/attendance/my-stats/today');
    final data = response.data;
    final Map<String, dynamic> body = data is Map<String, dynamic> ? data : {};
    return body['data'] as Map<String, dynamic>? ?? body;
  }

  Future<void> changePassword(String currentPassword, String newPassword) async {
    try {
      await dio.put('/auth/change-password', data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      });
    } on Exception catch (e) {
      final msg = e.toString();
      if (msg.contains('401')) throw Exception('Joriy parol noto\'g\'ri');
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> getTodayAttendance() async {
    try {
      final response = await dio.get('/attendance/today');
      final data = response.data;
      final Map<String, dynamic> body = data is Map<String, dynamic> ? data : {};
      return body['data'] as Map<String, dynamic>? ?? body;
    } catch (_) {
      return null;
    }
  }
}
