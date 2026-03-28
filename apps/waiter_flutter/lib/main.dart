import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'core/auth_store.dart';
import 'core/lang_store.dart';
import 'core/theme_store.dart';
import 'core/lock_store.dart';
import 'core/router.dart';
import 'widgets/lock_overlay.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const App());
}

class App extends StatefulWidget {
  const App({super.key});

  @override
  State<App> createState() => _AppState();
}

class _AppState extends State<App> with WidgetsBindingObserver {
  late final LockNotifier _lockNotifier;
  late final AuthNotifier _authNotifier;
  late final LangNotifier _langNotifier;
  late final ThemeNotifier _themeNotifier;
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _lockNotifier = LockNotifier();
    _authNotifier = AuthNotifier();
    _langNotifier = LangNotifier();
    _themeNotifier = ThemeNotifier();
    _authNotifier.setLockNotifier(_lockNotifier);
    _router = createRouter(_authNotifier);
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _authNotifier.dispose();
    _langNotifier.dispose();
    _themeNotifier.dispose();
    _lockNotifier.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_authNotifier.isAuthenticated) return;
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      _lockNotifier.lock();
    }
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _authNotifier),
        ChangeNotifierProvider.value(value: _langNotifier),
        ChangeNotifierProvider.value(value: _themeNotifier),
        ChangeNotifierProvider.value(value: _lockNotifier),
      ],
      child: _AppRoot(router: _router),
    );
  }
}

class _AppRoot extends StatelessWidget {
  final GoRouter router;

  const _AppRoot({required this.router});

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeNotifier>();

    return MaterialApp.router(
      title: 'Oshxona POS',
      debugShowCheckedModeBanner: false,
      themeMode: theme.mode,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFFF6B00),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF5F6FA),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF111827),
          foregroundColor: Colors.white,
          elevation: 0,
        ),
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFFF6B00),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF0F1623),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF111827),
          foregroundColor: Colors.white,
          elevation: 0,
        ),
        useMaterial3: true,
      ),
      // builder wraps the Navigator — correct way to add full-screen overlays
      builder: (ctx, child) {
        return Listener(
          behavior: HitTestBehavior.translucent,
          onPointerDown: (_) =>
              Provider.of<LockNotifier>(ctx, listen: false).onActivity(),
          child: Consumer2<AuthNotifier, LockNotifier>(
            builder: (_, auth, lock, __) => Stack(
              children: [
                child ?? const SizedBox.shrink(),
                if (auth.isAuthenticated && lock.isLocked)
                  const LockOverlay(),
              ],
            ),
          ),
        );
      },
      routerConfig: router,
    );
  }
}
