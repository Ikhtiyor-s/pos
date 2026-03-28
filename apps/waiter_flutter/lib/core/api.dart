import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// Web da localhost, mobilda tarmoq IP
const String _mobileUrl = 'http://192.168.1.29:3000/api';
const String _webUrl = 'http://localhost:3000/api';
final String kBaseUrl = kIsWeb ? _webUrl : _mobileUrl;
const String kTenantId = '004f93b4-05d1-4abf-a165-aa6ff5c2a5b2';
const _storage = FlutterSecureStorage();

Dio createDio() {
  final dio = Dio(BaseOptions(
    baseUrl: kBaseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': kTenantId,
    },
  ));

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await _storage.read(key: 'access_token');
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      handler.next(options);
    },
    onError: (error, handler) {
      handler.next(error);
    },
  ));

  return dio;
}

final dio = createDio();

Future<void> saveToken(String token) async {
  await _storage.write(key: 'access_token', value: token);
}

Future<String?> readToken() async {
  return _storage.read(key: 'access_token');
}

Future<void> clearToken() async {
  await _storage.delete(key: 'access_token');
}
