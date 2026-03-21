import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:hive_flutter/hive_flutter.dart';
import '../models/models.dart';

typedef OrderCallback = void Function(Order order);
typedef StatusCallback = void Function(String orderId, String status);

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  io.Socket? _socket;
  bool _isConnected = false;

  bool get isConnected => _isConnected;

  // Event streams
  final StreamController<Order> _onNewOrder =
      StreamController<Order>.broadcast();
  final StreamController<Map<String, String>> _onOrderStatus =
      StreamController<Map<String, String>>.broadcast();
  final StreamController<Order> _onOrderReady =
      StreamController<Order>.broadcast();
  final StreamController<Order> _onOrderCompleted =
      StreamController<Order>.broadcast();
  final StreamController<Order> _onOrderCancelled =
      StreamController<Order>.broadcast();

  Stream<Order> get onNewOrder => _onNewOrder.stream;
  Stream<Map<String, String>> get onOrderStatus => _onOrderStatus.stream;
  Stream<Order> get onOrderReady => _onOrderReady.stream;
  Stream<Order> get onOrderCompleted => _onOrderCompleted.stream;
  Stream<Order> get onOrderCancelled => _onOrderCancelled.stream;

  /// Connect to the Socket.IO server.
  void connect({String? url}) {
    final serverUrl = url ?? 'http://localhost:3000';
    final authBox = Hive.box('auth');
    final token = authBox.get('token') as String?;

    _socket = io.io(
      serverUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(10)
          .setReconnectionDelay(2000)
          .setAuth(token != null ? {'token': token} : {})
          .build(),
    );

    _setupListeners();
  }

  void _setupListeners() {
    final socket = _socket;
    if (socket == null) return;

    socket.onConnect((_) {
      _isConnected = true;
      // Join rooms
      socket.emit('join', ['kitchen', 'pos', 'waiter']);
    });

    socket.onDisconnect((_) {
      _isConnected = false;
    });

    socket.onReconnect((_) {
      _isConnected = true;
      socket.emit('join', ['kitchen', 'pos', 'waiter']);
    });

    socket.onConnectError((error) {
      _isConnected = false;
    });

    // Order events
    socket.on('order:new', (data) {
      try {
        final order = Order.fromJson(data as Map<String, dynamic>);
        _onNewOrder.add(order);
      } catch (_) {}
    });

    socket.on('order:status', (data) {
      try {
        final map = data as Map<String, dynamic>;
        _onOrderStatus.add({
          'orderId': map['orderId']?.toString() ?? '',
          'status': map['status']?.toString() ?? '',
        });
      } catch (_) {}
    });

    socket.on('order:ready', (data) {
      try {
        final order = Order.fromJson(data as Map<String, dynamic>);
        _onOrderReady.add(order);
      } catch (_) {}
    });

    socket.on('order:completed', (data) {
      try {
        final order = Order.fromJson(data as Map<String, dynamic>);
        _onOrderCompleted.add(order);
      } catch (_) {}
    });

    socket.on('order:cancelled', (data) {
      try {
        final order = Order.fromJson(data as Map<String, dynamic>);
        _onOrderCancelled.add(order);
      } catch (_) {}
    });
  }

  /// Emit order status update.
  void emitOrderStatusUpdate(String orderId, String status) {
    _socket?.emit('order:status_update', {
      'orderId': orderId,
      'status': status,
    });
  }

  /// Disconnect from the server.
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
  }

  /// Dispose all streams.
  void dispose() {
    disconnect();
    _onNewOrder.close();
    _onOrderStatus.close();
    _onOrderReady.close();
    _onOrderCompleted.close();
    _onOrderCancelled.close();
  }
}
