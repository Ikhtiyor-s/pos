import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _pinController = TextEditingController();
  final _tenantController = TextEditingController();
  String _enteredPin = '';

  @override
  void dispose() {
    _pinController.dispose();
    _tenantController.dispose();
    super.dispose();
  }

  void _onNumberTap(String number) {
    if (_enteredPin.length < 6) {
      setState(() {
        _enteredPin += number;
      });
      if (_enteredPin.length == 4) {
        // Auto-login on 4-digit pin
        _login();
      }
    }
  }

  void _onBackspace() {
    if (_enteredPin.isNotEmpty) {
      setState(() {
        _enteredPin = _enteredPin.substring(0, _enteredPin.length - 1);
      });
    }
  }

  void _onClear() {
    setState(() {
      _enteredPin = '';
    });
  }

  Future<void> _login() async {
    final tenantId = _tenantController.text.isNotEmpty
        ? _tenantController.text
        : 'default';
    await ref.read(authProvider.notifier).loginWithPin(_enteredPin, tenantId);

    final error = ref.read(authProvider).error;
    if (error != null && mounted) {
      setState(() => _enteredPin = '');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error),
          backgroundColor: AppTheme.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: Center(
        child: Container(
          width: 420,
          padding: const EdgeInsets.all(40),
          decoration: AppTheme.glassCard(borderRadius: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Logo / Title
              const Icon(
                Icons.restaurant_menu,
                size: 64,
                color: AppTheme.accent,
              ),
              const SizedBox(height: 16),
              Text(
                'Oshxona POS',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: AppTheme.textPrimary,
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                'PIN kodingizni kiriting',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 32),

              // PIN dots
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(4, (index) {
                  final filled = index < _enteredPin.length;
                  return Container(
                    margin: const EdgeInsets.symmetric(horizontal: 8),
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: filled ? AppTheme.accent : Colors.transparent,
                      border: Border.all(
                        color: filled ? AppTheme.accent : AppTheme.textMuted,
                        width: 2,
                      ),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 32),

              // Number pad
              _buildNumberPad(),

              if (authState.isLoading) ...[
                const SizedBox(height: 24),
                const CircularProgressIndicator(color: AppTheme.accent),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNumberPad() {
    final buttons = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['C', '0', '<'],
    ];

    return Column(
      children: buttons.map((row) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: row.map((label) {
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: _buildNumButton(label),
              );
            }).toList(),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildNumButton(String label) {
    final isAction = label == 'C' || label == '<';

    return SizedBox(
      width: 72,
      height: 72,
      child: ElevatedButton(
        onPressed: () {
          if (label == 'C') {
            _onClear();
          } else if (label == '<') {
            _onBackspace();
          } else {
            _onNumberTap(label);
          }
        },
        style: ElevatedButton.styleFrom(
          backgroundColor:
              isAction ? AppTheme.surfaceLight : AppTheme.surface,
          foregroundColor: isAction ? AppTheme.accent : AppTheme.textPrimary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: AppTheme.glassBorder),
          ),
          padding: EdgeInsets.zero,
        ),
        child: label == '<'
            ? const Icon(Icons.backspace_outlined, size: 24)
            : Text(
                label,
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }
}
