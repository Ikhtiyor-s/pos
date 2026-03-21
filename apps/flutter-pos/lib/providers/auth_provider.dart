import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';

class AuthState {
  final User? user;
  final bool isAuthenticated;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.user,
    this.isAuthenticated = false,
    this.isLoading = false,
    this.error,
  });

  AuthState copyWith({
    User? user,
    bool? isAuthenticated,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiService _api = ApiService();
  final Box _authBox = Hive.box('auth');

  AuthNotifier() : super(const AuthState()) {
    _loadSavedAuth();
  }

  void _loadSavedAuth() {
    final token = _authBox.get('token');
    final userData = _authBox.get('user');

    if (token != null && userData != null) {
      try {
        final userMap = userData is String
            ? jsonDecode(userData) as Map<String, dynamic>
            : userData as Map<String, dynamic>;
        final user = User.fromJson(userMap);
        state = AuthState(user: user, isAuthenticated: true);

        // Connect socket
        SocketService().connect();
      } catch (_) {
        // Invalid saved data
        _authBox.delete('token');
        _authBox.delete('user');
      }
    }
  }

  Future<void> loginWithPin(String pin, String tenantId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final data = await _api.loginWithPin(pin, tenantId);
      final userMap = data['user'] as Map<String, dynamic>;
      final user = User.fromJson(userMap);

      state = AuthState(user: user, isAuthenticated: true);

      // Connect socket after login
      SocketService().connect();
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> logout() async {
    SocketService().disconnect();
    await _api.logout();
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
