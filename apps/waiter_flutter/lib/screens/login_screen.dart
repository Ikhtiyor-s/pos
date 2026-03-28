import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/auth_store.dart';
import '../core/lang_store.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneCtrl = TextEditingController(text: '+998 ');
  final _passCtrl = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  String get _rawPhone => _phoneCtrl.text.replaceAll(' ', '').trim();

  Future<void> _submit() async {
    final phone = _rawPhone;
    final pass = _passCtrl.text;
    if (phone.length < 13 || pass.isEmpty) return;

    final auth = context.read<AuthNotifier>();
    final ok = await auth.loginWithPassword(phone, pass);
    if (ok && mounted) context.go('/tables');
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthNotifier>();
    final lang = context.watch<LangNotifier>();

    return Scaffold(
      backgroundColor: const Color(0xFF111827),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _LangButton(),
                    const Text('Ofitsiant', style: TextStyle(color: Colors.white54, fontSize: 14)),
                    const SizedBox(width: 48),
                  ],
                ),
              ),

              const SizedBox(height: 40),

              // Logo
              Container(
                width: 72, height: 72,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFFF97316), Color(0xFFEA580C)]),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [BoxShadow(color: const Color(0xFFF97316).withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8))],
                ),
                child: const Icon(Icons.restaurant, color: Colors.white, size: 36),
              ),
              const SizedBox(height: 16),
              Text(lang.t('login.appName'), style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Text(lang.t('login.appSubtitle'), style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),

              const SizedBox(height: 36),

              // Form
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Phone
                    Text('Telefon raqam', style: TextStyle(color: Colors.grey.shade400, fontSize: 13, fontWeight: FontWeight.w500)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _phoneCtrl,
                      keyboardType: TextInputType.phone,
                      textInputAction: TextInputAction.next,
                      inputFormatters: [_UzPhoneFormatter()],
                      style: const TextStyle(color: Colors.white, fontSize: 16, letterSpacing: 1),
                      decoration: InputDecoration(
                        hintText: '+998 90 123 45 67',
                        hintStyle: TextStyle(color: Colors.grey.shade700),
                        prefixIcon: Icon(Icons.phone_outlined, color: Colors.grey.shade600, size: 20),
                        filled: true,
                        fillColor: Colors.white.withValues(alpha: 0.06),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: Colors.grey.shade800)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFF97316), width: 1.5)),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Password
                    Text('Parol', style: TextStyle(color: Colors.grey.shade400, fontSize: 13, fontWeight: FontWeight.w500)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _passCtrl,
                      obscureText: _obscure,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _submit(),
                      style: const TextStyle(color: Colors.white, fontSize: 16),
                      decoration: InputDecoration(
                        hintText: '••••••',
                        hintStyle: TextStyle(color: Colors.grey.shade700),
                        prefixIcon: Icon(Icons.lock_outline, color: Colors.grey.shade600, size: 20),
                        suffixIcon: IconButton(
                          icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: Colors.grey.shade600),
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                        filled: true,
                        fillColor: Colors.white.withValues(alpha: 0.06),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: Colors.grey.shade800)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFF97316), width: 1.5)),
                      ),
                    ),

                    // Error
                    if (auth.error != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.red.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(auth.error!, style: const TextStyle(color: Color(0xFFEF4444), fontSize: 13), textAlign: TextAlign.center),
                      ),
                    ],

                    const SizedBox(height: 32),

                    // Submit
                    SizedBox(
                      width: double.infinity, height: 54,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF97316),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                        onPressed: auth.isLoading ? null : _submit,
                        child: auth.isLoading
                            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                            : const Text('Kirish', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                    ),

                    const SizedBox(height: 16),
                    Center(
                      child: Text(
                        'Qulfcha 🔒 bosilganda PIN bilan kirish mumkin',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// +998 XX XXX XX XX formatlovchi
class _UzPhoneFormatter extends TextInputFormatter {
  static const _prefix = '+998 ';

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    String raw = newValue.text;
    if (raw.startsWith('+998')) raw = raw.substring(4);
    raw = raw.replaceAll(RegExp(r'\D'), '');
    if (raw.length > 9) raw = raw.substring(0, 9);

    final buf = StringBuffer(_prefix);
    for (int i = 0; i < raw.length; i++) {
      if (i == 2 || i == 5 || i == 7) buf.write(' ');
      buf.write(raw[i]);
    }
    final text = buf.toString();
    return TextEditingValue(text: text, selection: TextSelection.collapsed(offset: text.length));
  }
}

class _LangButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final lang = context.watch<LangNotifier>();
    return GestureDetector(
      onTap: lang.cycleLang,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.grey.shade800),
        ),
        child: Text(lang.lang.toUpperCase(), style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 12)),
      ),
    );
  }
}
