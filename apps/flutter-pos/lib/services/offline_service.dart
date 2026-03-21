import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../models/models.dart';
import 'api_service.dart';

class OfflineService {
  static final OfflineService _instance = OfflineService._internal();
  factory OfflineService() => _instance;
  OfflineService._internal();

  final Box _productsBox = Hive.box('products');
  final Box _categoriesBox = Hive.box('categories');
  final Box _tablesBox = Hive.box('tables');
  final Box _ordersBox = Hive.box('orders');
  final Box _syncQueueBox = Hive.box('sync_queue');

  // ---------- Connectivity ----------

  Future<bool> isOnline() async {
    final result = await Connectivity().checkConnectivity();
    return result != ConnectivityResult.none;
  }

  Stream<ConnectivityResult> get connectivityStream =>
      Connectivity().onConnectivityChanged.map((results) =>
          results.isNotEmpty ? results.first : ConnectivityResult.none);

  // ---------- Cache Products ----------

  Future<void> cacheProducts(List<Product> products) async {
    await _productsBox.clear();
    for (final product in products) {
      await _productsBox.put(product.id, jsonEncode(product.toJson()));
    }
  }

  List<Product> getProductsOffline() {
    return _productsBox.values.map((json) {
      final decoded = jsonDecode(json as String) as Map<String, dynamic>;
      return Product.fromJson(decoded);
    }).toList();
  }

  // ---------- Cache Categories ----------

  Future<void> cacheCategories(List<Category> categories) async {
    await _categoriesBox.clear();
    for (final category in categories) {
      await _categoriesBox.put(category.id, jsonEncode(category.toJson()));
    }
  }

  List<Category> getCategoriesOffline() {
    return _categoriesBox.values.map((json) {
      final decoded = jsonDecode(json as String) as Map<String, dynamic>;
      return Category.fromJson(decoded);
    }).toList();
  }

  // ---------- Cache Tables ----------

  Future<void> cacheTables(List<RestaurantTable> tables) async {
    await _tablesBox.clear();
    for (final table in tables) {
      await _tablesBox.put(table.id, jsonEncode(table.toJson()));
    }
  }

  List<RestaurantTable> getTablesOffline() {
    return _tablesBox.values.map((json) {
      final decoded = jsonDecode(json as String) as Map<String, dynamic>;
      return RestaurantTable.fromJson(decoded);
    }).toList();
  }

  // ---------- Cache Orders ----------

  Future<void> cacheOrders(List<Order> orders) async {
    await _ordersBox.clear();
    for (final order in orders) {
      await _ordersBox.put(order.id, jsonEncode(order.toJson()));
    }
  }

  List<Order> getOrdersOffline() {
    return _ordersBox.values.map((json) {
      final decoded = jsonDecode(json as String) as Map<String, dynamic>;
      return Order.fromJson(decoded);
    }).toList();
  }

  // ---------- Sync Queue ----------

  /// Adds an offline operation to the sync queue.
  /// [operation] should contain: type (create_order, update_status, create_payment),
  /// endpoint, method, and data.
  Future<void> addToSyncQueue(Map<String, dynamic> operation) async {
    final key = DateTime.now().millisecondsSinceEpoch.toString();
    operation['timestamp'] = key;
    operation['synced'] = false;
    await _syncQueueBox.put(key, jsonEncode(operation));
  }

  /// Returns all pending (unsynced) operations.
  List<Map<String, dynamic>> getPendingSyncOperations() {
    return _syncQueueBox.values.map((json) {
      return jsonDecode(json as String) as Map<String, dynamic>;
    }).where((op) => op['synced'] != true).toList();
  }

  /// Processes the sync queue when back online.
  /// Returns the number of successfully synced operations.
  Future<int> processSyncQueue() async {
    if (!await isOnline()) return 0;

    final api = ApiService();
    final pending = getPendingSyncOperations();
    int synced = 0;

    for (final operation in pending) {
      try {
        final type = operation['type'] as String?;
        final data = operation['data'] as Map<String, dynamic>?;

        switch (type) {
          case 'create_order':
            if (data != null) {
              await api.createOrder(data);
            }
            break;
          case 'update_status':
            final orderId = operation['orderId'] as String?;
            final status = operation['status'] as String?;
            if (orderId != null && status != null) {
              await api.updateOrderStatus(orderId, status);
            }
            break;
          case 'create_payment':
            if (data != null) {
              await api.createPayment(data);
            }
            break;
          default:
            // Unknown operation type, skip
            continue;
        }

        // Mark as synced
        final key = operation['timestamp'] as String;
        operation['synced'] = true;
        await _syncQueueBox.put(key, jsonEncode(operation));
        synced++;
      } catch (e) {
        // Failed to sync — will retry next time
        continue;
      }
    }

    // Clean up synced operations
    await _cleanSyncedOperations();

    return synced;
  }

  /// Removes all synced operations from the queue.
  Future<void> _cleanSyncedOperations() async {
    final keysToRemove = <String>[];

    for (final key in _syncQueueBox.keys) {
      final json = _syncQueueBox.get(key) as String?;
      if (json != null) {
        final operation = jsonDecode(json) as Map<String, dynamic>;
        if (operation['synced'] == true) {
          keysToRemove.add(key.toString());
        }
      }
    }

    for (final key in keysToRemove) {
      await _syncQueueBox.delete(key);
    }
  }

  /// Clears all cached data.
  Future<void> clearAll() async {
    await _productsBox.clear();
    await _categoriesBox.clear();
    await _tablesBox.clear();
    await _ordersBox.clear();
    await _syncQueueBox.clear();
  }

  /// Returns the number of pending sync operations.
  int get pendingSyncCount => getPendingSyncOperations().length;
}
