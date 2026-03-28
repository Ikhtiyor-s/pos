import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../core/lock_store.dart';
import '../core/api.dart';
import '../services/auth_service.dart';

class LockOverlay extends StatefulWidget {
  const LockOverlay({super.key});

  @override
  State<LockOverlay> createState() => _LockOverlayState();
}

class _LockOverlayState extends State<LockOverlay> {
  String _pin = '';
  bool _loading = false;
  String? _error;
  final FocusNode _focusNode = FocusNode();

  static const int _pinLength = 4;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  void _addDigit(String d) {
    if (_pin.length >= _pinLength || _loading) return;
    setState(() {
      _pin += d;
      _error = null;
    });
    if (_pin.length == _pinLength) _verify();
  }

  void _removeDigit() {
    if (_pin.isEmpty) return;
    setState(() => _pin = _pin.substring(0, _pin.length - 1));
  }

  Future<void> _verify() async {
    setState(() => _loading = true);
    try {
      final service = AuthService();
      await service.loginWithPin(_pin, kTenantId);
      if (mounted) {
        context.read<LockNotifier>().unlock();
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _pin = '';
          _error = 'Noto\'g\'ri PIN kod';
          _loading = false;
        });
      }
    }
  }

  void _handleKey(KeyEvent event) {
    if (event is KeyDownEvent) {
      final char = event.character;
      if (char != null && RegExp(r'[0-9]').hasMatch(char)) {
        _addDigit(char);
      } else if (event.logicalKey == LogicalKeyboardKey.backspace) {
        _removeDigit();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return KeyboardListener(
      focusNode: _focusNode,
      autofocus: true,
      onKeyEvent: _handleKey,
      child: Scaffold(
        backgroundColor: const Color(0xFF111827),
        body: SafeArea(
          child: Column(
            children: [
              const Spacer(),
              // Lock icon
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.lock_outline,
                  color: Colors.white,
                  size: 36,
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'PIN-kodni kiriting',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 28),

              // PIN dots
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(_pinLength, (i) {
                  final filled = i < _pin.length;
                  return Container(
                    margin: const EdgeInsets.symmetric(horizontal: 12),
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: filled
                          ? const Color(0xFFFF6B00)
                          : Colors.transparent,
                      border: Border.all(
                        color: filled
                            ? const Color(0xFFFF6B00)
                            : Colors.white30,
                        width: 2,
                      ),
                    ),
                  );
                }),
              ),

              // Error
              const SizedBox(height: 16),
              SizedBox(
                height: 20,
                child: _error != null
                    ? Text(
                        _error!,
                        style: const TextStyle(
                          color: Colors.redAccent,
                          fontSize: 13,
                        ),
                      )
                    : null,
              ),

              const Spacer(),

              // Numpad
              if (_loading)
                const CircularProgressIndicator(color: Color(0xFFFF6B00))
              else
                _NumPad(onDigit: _addDigit, onBackspace: _removeDigit),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}

class _NumPad extends StatelessWidget {
  final void Function(String) onDigit;
  final VoidCallback onBackspace;

  const _NumPad({required this.onDigit, required this.onBackspace});

  @override
  Widget build(BuildContext context) {
    final keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', '<'],
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 40),
      child: Column(
        children: keys.map((row) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: row.map((key) {
                if (key.isEmpty) return const SizedBox(width: 72, height: 72);
                return _Key(
                  label: key,
                  onTap: () {
                    if (key == '<') {
                      onBackspace();
                    } else {
                      onDigit(key);
                    }
                  },
                );
              }).toList(),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _Key extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _Key({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isBack = label == '<';
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 72,
        height: 72,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withOpacity(0.08),
        ),
        child: isBack
            ? const Icon(Icons.backspace_outlined,
                color: Colors.white70, size: 22)
            : Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 26,
                  fontWeight: FontWeight.w500,
                ),
              ),
      ),
    );
  }
}
