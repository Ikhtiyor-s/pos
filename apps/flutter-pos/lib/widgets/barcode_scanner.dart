import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';
import '../models/models.dart';

/// Barcode Scanner Widget
/// 3 rejim: USB Hardware Scanner, Camera, Manual input
class BarcodeScannerDialog extends StatefulWidget {
  final Function(Product) onProductFound;

  const BarcodeScannerDialog({super.key, required this.onProductFound});

  @override
  State<BarcodeScannerDialog> createState() => _BarcodeScannerDialogState();
}

class _BarcodeScannerDialogState extends State<BarcodeScannerDialog> {
  final _manualController = TextEditingController();
  final _focusNode = FocusNode();
  String _buffer = '';
  DateTime _lastKeyTime = DateTime.now();
  bool _loading = false;
  String? _error;
  String? _success;
  int _mode = 0; // 0=scanner, 1=manual

  @override
  void initState() {
    super.initState();
    _focusNode.requestFocus();
  }

  @override
  void dispose() {
    _manualController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _searchByBarcode(String code) async {
    if (code.length < 3) return;

    setState(() {
      _loading = true;
      _error = null;
      _success = null;
    });

    try {
      final product = await ApiService().getProductByBarcode(code);
      if (product != null) {
        setState(() => _success = '${product.name} topildi!');
        widget.onProductFound(product);

        await Future.delayed(const Duration(seconds: 2));
        if (mounted) {
          setState(() {
            _success = null;
            _manualController.clear();
          });
        }
      }
    } catch (e) {
      setState(() => _error = '"$code" barcode bo\'yicha mahsulot topilmadi');
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) setState(() => _error = null);
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return KeyboardListener(
      focusNode: _focusNode,
      autofocus: true,
      onKeyEvent: (event) {
        if (_mode != 0) return; // Only in scanner mode
        if (event is! KeyDownEvent) return;

        final now = DateTime.now();
        final diff = now.difference(_lastKeyTime).inMilliseconds;
        _lastKeyTime = now;

        if (event.logicalKey == LogicalKeyboardKey.enter) {
          if (_buffer.length >= 4) {
            _searchByBarcode(_buffer.trim());
          }
          _buffer = '';
          return;
        }

        // Reset buffer if too slow (manual typing)
        if (diff > 100) _buffer = '';

        final char = event.character;
        if (char != null && char.isNotEmpty) {
          _buffer += char;
        }
      },
      child: Dialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Container(
          width: 400,
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.orange.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.qr_code_scanner, color: Colors.orange, size: 24),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Barcode Scanner', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                        Text('Skanerlang yoki kodni kiriting', style: TextStyle(color: Colors.grey, fontSize: 12)),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.grey),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Mode tabs
              Row(
                children: [
                  _buildTab(0, Icons.qr_code_scanner, 'USB Scanner'),
                  const SizedBox(width: 8),
                  _buildTab(1, Icons.keyboard, 'Qo\'lda'),
                ],
              ),
              const SizedBox(height: 20),

              // Content
              if (_mode == 0) ...[
                // Scanner mode
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 32),
                  child: Column(
                    children: [
                      Icon(Icons.qr_code_scanner, size: 64, color: Colors.orange.withOpacity(0.6)),
                      const SizedBox(height: 16),
                      const Text('USB/Bluetooth skaner tayyor', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w500)),
                      const SizedBox(height: 8),
                      const Text('Barcode ni skanerlang', style: TextStyle(color: Colors.grey, fontSize: 13)),
                    ],
                  ),
                ),
              ] else ...[
                // Manual mode
                TextField(
                  controller: _manualController,
                  autofocus: true,
                  style: const TextStyle(color: Colors.white, fontSize: 18, fontFamily: 'monospace', letterSpacing: 2),
                  decoration: InputDecoration(
                    hintText: 'Barcode raqami',
                    hintStyle: TextStyle(color: Colors.grey.shade600),
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.orange)),
                  ),
                  onSubmitted: (v) => _searchByBarcode(v.trim()),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _loading ? null : () => _searchByBarcode(_manualController.text.trim()),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: _loading
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.search),
                    label: Text(_loading ? 'Qidirilmoqda...' : 'Mahsulotni topish'),
                  ),
                ),
              ],

              // Status messages
              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.withOpacity(0.2)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.red, size: 18),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13))),
                    ],
                  ),
                ),
              ],
              if (_success != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.green.withOpacity(0.2)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle, color: Colors.green, size: 18),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_success!, style: const TextStyle(color: Colors.green, fontSize: 13))),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTab(int index, IconData icon, String label) {
    final selected = _mode == index;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _mode = index),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected ? Colors.orange.withOpacity(0.15) : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: selected ? Colors.orange : Colors.grey.shade700),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: selected ? Colors.orange : Colors.grey),
              const SizedBox(width: 6),
              Text(label, style: TextStyle(fontSize: 13, color: selected ? Colors.orange : Colors.grey, fontWeight: selected ? FontWeight.w600 : FontWeight.normal)),
            ],
          ),
        ),
      ),
    );
  }
}
