import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import 'theme/app_theme.dart';
import 'services/api_service.dart';
import 'providers/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/table_screen.dart';
import 'screens/order_screen.dart';
import 'screens/payment_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Landscape mode for tablet
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  // Full screen
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

  // Hive (local DB)
  await Hive.initFlutter();
  await Hive.openBox('auth');
  await Hive.openBox('products');
  await Hive.openBox('categories');
  await Hive.openBox('tables');
  await Hive.openBox('orders');
  await Hive.openBox('sync_queue');

  runApp(const ProviderScope(child: OshxonaPOSApp()));
}

class OshxonaPOSApp extends ConsumerWidget {
  const OshxonaPOSApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      title: 'Oshxona POS',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: authState.isAuthenticated
          ? const TableScreen()
          : const LoginScreen(),
    );
  }
}
