import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/auth_service.dart';
import 'api.dart';
import 'lock_store.dart';

class AuthNotifier extends ChangeNotifier {
  User? _user;
  String? _accessToken;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  String? get accessToken => _accessToken;
  bool get isAuthenticated => _user != null && _accessToken != null;
  bool get isLoading => _isLoading;
  String? get error => _error;

  AuthNotifier() {
    _tryRestoreSession();
  }

  Future<void> _tryRestoreSession() async {
    final token = await readToken();
    if (token != null && token.isNotEmpty) {
      _accessToken = token;
      try {
        final authService = AuthService();
        final user = await authService.getMe();
        _user = user;
        _lockNotifier?.initialize();
      } catch (_) {
        _user = null;
        _accessToken = null;
        await clearToken();
      }
      notifyListeners();
    }
  }

  LockNotifier? _lockNotifier;

  void setLockNotifier(LockNotifier lock) {
    _lockNotifier = lock;
  }

  Future<bool> loginWithPassword(String phone, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final authService = AuthService();
      final result = await authService.loginWithPassword(phone, password);
      _accessToken = result['accessToken'] as String;
      _user = result['user'] as User;
      await saveToken(_accessToken!);
      _isLoading = false;
      notifyListeners();
      _lockNotifier?.initialize();
      return true;
    } catch (e) {
      _isLoading = false;
      _error = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> loginWithPin(String pin) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final authService = AuthService();
      final result = await authService.loginWithPin(pin, kTenantId);
      _accessToken = result['accessToken'] as String;
      _user = result['user'] as User;
      await saveToken(_accessToken!);
      _isLoading = false;
      notifyListeners();
      _lockNotifier?.initialize();
      return true;
    } catch (e) {
      _isLoading = false;
      _error = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _lockNotifier?.stop();
    _user = null;
    _accessToken = null;
    _error = null;
    await clearToken();
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
