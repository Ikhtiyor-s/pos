import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/auth_store.dart';
import '../core/lang_store.dart';
import '../core/lock_store.dart';
import '../core/theme_store.dart';
import '../services/auth_service.dart';
import '../widgets/main_layout.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _attendance;
  Map<String, dynamic>? _stats;
  bool _loadingAttendance = true;
  bool _loadingStats = true;
  bool _checkingIn = false;
  bool _checkingOut = false;

  // Parol o'zgartirish
  final _curPassCtrl = TextEditingController();
  final _newPassCtrl = TextEditingController();
  bool _changingPass = false;
  String? _passError;
  bool _passSuccess = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _curPassCtrl.dispose();
    _newPassCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    _loadAttendance();
    _loadStats();
  }

  Future<void> _loadAttendance() async {
    setState(() => _loadingAttendance = true);
    try {
      final service = AuthService();
      final data = await service.getTodayAttendance();
      if (mounted) {
        setState(() {
          _attendance = data;
          _loadingAttendance = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingAttendance = false);
    }
  }

  Future<void> _loadStats() async {
    setState(() => _loadingStats = true);
    try {
      final service = AuthService();
      final data = await service.getMyDailyStats();
      if (mounted) {
        setState(() {
          _stats = data;
          _loadingStats = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingStats = false);
    }
  }

  Future<void> _checkIn() async {
    setState(() => _checkingIn = true);
    try {
      final service = AuthService();
      final data = await service.checkIn();
      if (mounted) {
        setState(() {
          _attendance = data;
          _checkingIn = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Kelish vaqti belgilandi!'),
            backgroundColor: Color(0xFF22C55E),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _checkingIn = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Xatolik: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _checkOut() async {
    setState(() => _checkingOut = true);
    try {
      final service = AuthService();
      final data = await service.checkOut();
      if (mounted) {
        setState(() {
          _attendance = data;
          _checkingOut = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Ketish vaqti belgilandi!'),
            backgroundColor: Color(0xFF22C55E),
          ),
        );
        _loadStats();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _checkingOut = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Xatolik: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _logout() async {
    final lang = context.read<LangNotifier>();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(lang.t('profile.logout')),
        content: Text(lang.t('profile.logoutConfirm')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(lang.t('cancel')),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF4444)),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(lang.t('profile.logout'),
                style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await context.read<AuthNotifier>().logout();
      if (mounted) context.go('/login');
    }
  }

  Future<void> _changePassword() async {
    final cur = _curPassCtrl.text;
    final nw = _newPassCtrl.text;
    if (cur.isEmpty || nw.isEmpty) return;
    if (nw.length < 6) {
      setState(() => _passError = 'Yangi parol kamida 6 belgi');
      return;
    }
    setState(() { _changingPass = true; _passError = null; _passSuccess = false; });
    try {
      await AuthService().changePassword(cur, nw);
      if (mounted) {
        _curPassCtrl.clear();
        _newPassCtrl.clear();
        setState(() { _changingPass = false; _passSuccess = true; });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _changingPass = false;
          _passError = e.toString().replaceFirst('Exception: ', '');
        });
      }
    }
  }

  String _formatPrice(double price) {
    final formatter = RegExp(r'(\d)(?=(\d{3})+(?!\d))');
    return price
            .toStringAsFixed(0)
            .replaceAllMapped(formatter, (m) => '${m[1]} ') +
        " so'm";
  }

  String _formatTime(String? iso) {
    if (iso == null) return '—';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '—';
    final local = dt.toLocal();
    return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }

  String _attendanceStatusLabel(String? status, LangNotifier lang) {
    if (status == null) return lang.t('attendanceStatus.notSet');
    switch (status) {
      case 'PRESENT':
        return lang.t('attendanceStatus.PRESENT');
      case 'ABSENT':
        return lang.t('attendanceStatus.ABSENT');
      case 'LATE':
        return lang.t('attendanceStatus.LATE');
      default:
        return lang.t('attendanceStatus.notSet');
    }
  }

  Color _attendanceStatusColor(String? status) {
    switch (status) {
      case 'PRESENT':
        return const Color(0xFF22C55E);
      case 'ABSENT':
        return const Color(0xFFEF4444);
      case 'LATE':
        return const Color(0xFFF59E0B);
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthNotifier>();
    final lang = context.watch<LangNotifier>();
    final theme = context.watch<ThemeNotifier>();
    final lock = context.watch<LockNotifier>();
    final user = auth.user;

    final attStatus = _attendance?['status']?.toString();
    final checkInTime = _attendance?['checkIn']?.toString() ??
        _attendance?['checkInTime']?.toString();
    final checkOutTime = _attendance?['checkOut']?.toString() ??
        _attendance?['checkOutTime']?.toString();
    final workDayEnded = checkOutTime != null;

    return MainLayout(
      currentIndex: 3,
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Gradient header
            Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFFF97316), Color(0xFFEC4899)],
                ),
              ),
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Text(
                            lang.t('profile.title'),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Spacer(),
                          IconButton(
                            icon: const Icon(Icons.logout, color: Colors.white),
                            onPressed: _logout,
                            tooltip: lang.t('profile.logout'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          // Avatar
                          Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withOpacity(0.25),
                              border: Border.all(color: Colors.white38, width: 2),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              user?.initials ?? '?',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  user?.name ?? '',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  user?.phone ?? '',
                                  style: const TextStyle(
                                      color: Colors.white70, fontSize: 14),
                                ),
                                const SizedBox(height: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(12),
                                    border:
                                        Border.all(color: Colors.white30),
                                  ),
                                  child: Text(
                                    lang.t('profile.role.${user?.role ?? 'WAITER'}'),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Attendance card
            _Card(
              title: lang.t('profile.attendance'),
              icon: Icons.access_time,
              child: _loadingAttendance
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: CircularProgressIndicator(
                            color: Color(0xFFFF6B00)),
                      ),
                    )
                  : Column(
                      children: [
                        _InfoRow(
                          label: lang.t('profile.status'),
                          value: _attendanceStatusLabel(attStatus, lang),
                          valueColor: _attendanceStatusColor(attStatus),
                        ),
                        _InfoRow(
                          label: lang.t('profile.checkIn'),
                          value: _formatTime(checkInTime),
                        ),
                        _InfoRow(
                          label: lang.t('profile.checkOut'),
                          value: _formatTime(checkOutTime),
                        ),
                        const SizedBox(height: 12),
                        if (_attendance != null)
                          if (workDayEnded)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  vertical: 8, horizontal: 16),
                              decoration: BoxDecoration(
                                color: const Color(0xFF22C55E).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                lang.t('profile.workDayEnded'),
                                style: const TextStyle(
                                    color: Color(0xFF22C55E),
                                    fontWeight: FontWeight.w600),
                              ),
                            )
                          else
                            Row(
                              children: [
                                if (checkInTime == null)
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor:
                                            const Color(0xFF22C55E),
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(10)),
                                      ),
                                      onPressed: _checkingIn ? null : _checkIn,
                                      icon: _checkingIn
                                          ? const SizedBox(
                                              width: 16,
                                              height: 16,
                                              child: CircularProgressIndicator(
                                                  color: Colors.white,
                                                  strokeWidth: 2),
                                            )
                                          : const Icon(Icons.login),
                                      label:
                                          Text(lang.t('profile.checkInBtn')),
                                    ),
                                  )
                                else if (checkOutTime == null)
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor:
                                            const Color(0xFFEF4444),
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(10)),
                                      ),
                                      onPressed:
                                          _checkingOut ? null : _checkOut,
                                      icon: _checkingOut
                                          ? const SizedBox(
                                              width: 16,
                                              height: 16,
                                              child: CircularProgressIndicator(
                                                  color: Colors.white,
                                                  strokeWidth: 2),
                                            )
                                          : const Icon(Icons.logout),
                                      label:
                                          Text(lang.t('profile.checkOutBtn')),
                                    ),
                                  ),
                              ],
                            ),
                      ],
                    ),
            ),

            // Stats card
            _Card(
              title: lang.t('profile.todayStats'),
              icon: Icons.bar_chart,
              child: _loadingStats
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: CircularProgressIndicator(
                            color: Color(0xFFFF6B00)),
                      ),
                    )
                  : Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: _StatBox(
                                label: lang.t('profile.ordersCount'),
                                value:
                                    '${_stats?['ordersCount'] ?? _stats?['totalOrders'] ?? 0}',
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _StatBox(
                                label: lang.t('profile.completedOrders'),
                                value:
                                    '${_stats?['completedOrders'] ?? _stats?['completed'] ?? 0}',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: _StatBox(
                                label: lang.t('profile.totalSales'),
                                value: _formatPrice(
                                  _parseDouble(_stats?['totalSales'] ??
                                      _stats?['totalRevenue']),
                                ),
                                small: true,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _StatBox(
                                label: lang.t('profile.averageOrder'),
                                value: _formatPrice(
                                  _parseDouble(_stats?['averageOrder'] ??
                                      _stats?['avgOrder']),
                                ),
                                small: true,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
            ),

            // Xavfsizlik kartasi
            _Card(
              title: 'Xavfsizlik',
              icon: Icons.security_outlined,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // PIN timeout
                  const Text(
                    'Ekran bloklash vaqti',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    children: LockNotifier.timeoutOptions.map((min) {
                      final selected = lock.timeoutMinutes == min;
                      return GestureDetector(
                        onTap: () => lock.setTimeoutMinutes(min),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 7),
                          decoration: BoxDecoration(
                            color: selected
                                ? const Color(0xFFFF6B00)
                                : Colors.grey.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            '${min} min',
                            style: TextStyle(
                              color: selected ? Colors.white : null,
                              fontWeight: selected
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 20),
                  const Divider(height: 1),
                  const SizedBox(height: 16),

                  // Parol o'zgartirish
                  const Text(
                    'Parolni o\'zgartirish',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 10),
                  _PassField(
                    controller: _curPassCtrl,
                    label: 'Joriy parol',
                  ),
                  const SizedBox(height: 10),
                  _PassField(
                    controller: _newPassCtrl,
                    label: 'Yangi parol (min 6 belgi)',
                  ),
                  if (_passError != null) ...[
                    const SizedBox(height: 8),
                    Text(_passError!,
                        style: const TextStyle(color: Colors.red, fontSize: 13)),
                  ],
                  if (_passSuccess) ...[
                    const SizedBox(height: 8),
                    const Text('Parol muvaffaqiyatli o\'zgartirildi',
                        style: TextStyle(
                            color: Color(0xFF22C55E), fontSize: 13)),
                  ],
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF111827),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                      ),
                      onPressed: _changingPass ? null : _changePassword,
                      child: _changingPass
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                  color: Colors.white, strokeWidth: 2),
                            )
                          : const Text('Parolni yangilash'),
                    ),
                  ),
                ],
              ),
            ),

            // Settings card
            _Card(
              title: lang.t('settings.title'),
              icon: Icons.settings_outlined,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Language
                  Text(
                    lang.t('settings.language'),
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _ToggleBtn(
                        label: lang.t('languages.uz'),
                        selected: lang.lang == 'uz',
                        onTap: () => lang.setLang('uz'),
                      ),
                      const SizedBox(width: 8),
                      _ToggleBtn(
                        label: lang.t('languages.ru'),
                        selected: lang.lang == 'ru',
                        onTap: () => lang.setLang('ru'),
                      ),
                      const SizedBox(width: 8),
                      _ToggleBtn(
                        label: lang.t('languages.en'),
                        selected: lang.lang == 'en',
                        onTap: () => lang.setLang('en'),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Theme
                  Text(
                    lang.t('settings.theme'),
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _ToggleBtn(
                        label: lang.t('settings.themeLight'),
                        selected: theme.mode == ThemeMode.light,
                        onTap: () => theme.setMode(ThemeMode.light),
                        icon: Icons.wb_sunny_outlined,
                      ),
                      const SizedBox(width: 8),
                      _ToggleBtn(
                        label: lang.t('settings.themeDark'),
                        selected: theme.mode == ThemeMode.dark,
                        onTap: () => theme.setMode(ThemeMode.dark),
                        icon: Icons.nightlight_outlined,
                      ),
                      const SizedBox(width: 8),
                      _ToggleBtn(
                        label: lang.t('settings.themeSystem'),
                        selected: theme.mode == ThemeMode.system,
                        onTap: () => theme.setMode(ThemeMode.system),
                        icon: Icons.settings_suggest_outlined,
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  static double _parseDouble(dynamic v) {
    if (v == null) return 0.0;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    return double.tryParse(v.toString()) ?? 0.0;
  }
}

class _Card extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;

  const _Card({required this.title, required this.icon, required this.child});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E2530) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 18, color: const Color(0xFFFF6B00)),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            child,
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _InfoRow({required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 14)),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  final String label;
  final String value;
  final bool small;

  const _StatBox({required this.label, required this.value, this.small = false});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withOpacity(0.05)
            : const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: Colors.grey, fontSize: 12),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: small ? 13 : 20,
              color: const Color(0xFFFF6B00),
            ),
          ),
        ],
      ),
    );
  }
}

class _PassField extends StatefulWidget {
  final TextEditingController controller;
  final String label;

  const _PassField({required this.controller, required this.label});

  @override
  State<_PassField> createState() => _PassFieldState();
}

class _PassFieldState extends State<_PassField> {
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: widget.controller,
      obscureText: _obscure,
      style: const TextStyle(fontSize: 14),
      decoration: InputDecoration(
        labelText: widget.label,
        labelStyle: const TextStyle(fontSize: 13),
        isDense: true,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFFFF6B00), width: 2),
        ),
        suffixIcon: IconButton(
          icon: Icon(_obscure
              ? Icons.visibility_off_outlined
              : Icons.visibility_outlined),
          iconSize: 18,
          onPressed: () => setState(() => _obscure = !_obscure),
        ),
      ),
    );
  }
}

class _ToggleBtn extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;

  const _ToggleBtn({
    required this.label,
    required this.selected,
    required this.onTap,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: selected
                ? const Color(0xFFFF6B00)
                : Colors.grey.withOpacity(0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            children: [
              if (icon != null)
                Icon(
                  icon,
                  size: 16,
                  color: selected ? Colors.white : Colors.grey,
                ),
              if (icon != null) const SizedBox(height: 2),
              Text(
                label,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: selected ? Colors.white : null,
                  fontWeight:
                      selected ? FontWeight.bold : FontWeight.normal,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
