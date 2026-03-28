import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LockNotifier extends ChangeNotifier {
  bool _isLocked = false;
  bool _initialized = false;
  Timer? _inactivityTimer;

  // Daqiqalarda: 1, 2, 5, 10, 30. 0 = hech qachon
  static const List<int> timeoutOptions = [1, 2, 5, 10, 30];
  static const _prefKey = 'lock_timeout_minutes';
  static const _defaultMinutes = 5;

  int _timeoutMinutes = _defaultMinutes;
  int get timeoutMinutes => _timeoutMinutes;
  bool get isLocked => _isLocked;

  LockNotifier() {
    _loadTimeout();
  }

  Future<void> _loadTimeout() async {
    final prefs = await SharedPreferences.getInstance();
    _timeoutMinutes = prefs.getInt(_prefKey) ?? _defaultMinutes;
  }

  Future<void> setTimeoutMinutes(int minutes) async {
    _timeoutMinutes = minutes;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_prefKey, minutes);
    if (_initialized && !_isLocked) _resetTimer();
    notifyListeners();
  }

  Duration get _timeout => _timeoutMinutes == 0
      ? const Duration(hours: 24) // "hech qachon" — 24 soat
      : Duration(minutes: _timeoutMinutes);

  void initialize() {
    _initialized = true;
    _resetTimer();
  }

  void lock() {
    _inactivityTimer?.cancel();
    if (!_isLocked) {
      _isLocked = true;
      notifyListeners();
    }
  }

  void unlock() {
    _isLocked = false;
    notifyListeners();
    _resetTimer();
  }

  void onActivity() {
    if (!_initialized || _isLocked) return;
    _resetTimer();
  }

  void _resetTimer() {
    _inactivityTimer?.cancel();
    _inactivityTimer = Timer(_timeout, lock);
  }

  void stop() {
    _initialized = false;
    _inactivityTimer?.cancel();
  }

  @override
  void dispose() {
    _inactivityTimer?.cancel();
    super.dispose();
  }
}
