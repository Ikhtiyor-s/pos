import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'auth_store.dart';
import '../screens/login_screen.dart';
import '../screens/tables_screen.dart';
import '../screens/orders_screen.dart';
import '../screens/menu_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/notifications_screen.dart';

GoRouter createRouter(AuthNotifier authNotifier) {
  return GoRouter(
    initialLocation: '/tables',
    refreshListenable: authNotifier,
    redirect: (BuildContext context, GoRouterState state) {
      final isAuthenticated = authNotifier.isAuthenticated;
      final isLoginRoute = state.matchedLocation == '/login';

      if (!isAuthenticated && !isLoginRoute) {
        return '/login';
      }
      if (isAuthenticated && isLoginRoute) {
        return '/tables';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/tables',
        builder: (context, state) => const TablesScreen(),
      ),
      GoRoute(
        path: '/orders',
        builder: (context, state) => const OrdersScreen(),
      ),
      GoRoute(
        path: '/menu/:tableId',
        builder: (context, state) {
          final tableId = state.pathParameters['tableId']!;
          final tableNumber = state.uri.queryParameters['tableNumber'];
          final tableName = state.uri.queryParameters['tableName'];
          return MenuScreen(
            tableId: tableId,
            tableNumber: tableNumber != null ? int.tryParse(tableNumber) ?? 0 : 0,
            tableName: tableName ?? '',
          );
        },
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfileScreen(),
      ),
    ],
  );
}
