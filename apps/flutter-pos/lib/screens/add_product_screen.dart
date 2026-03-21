import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../services/barcode_lookup_service.dart';
import '../services/mxik_service.dart';
import '../services/api_service.dart';
import 'scanner_page.dart';

/// Admin mahsulot qo'shish sahifasi
/// Barcode scan → auto-fill → MXIK tekshirish → saqlash
class AddProductScreen extends StatefulWidget {
  const AddProductScreen({super.key});

  @override
  State<AddProductScreen> createState() => _AddProductScreenState();
}

class _AddProductScreenState extends State<AddProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _barcodeController = TextEditingController();
  final _priceController = TextEditingController();
  final _mxikController = TextEditingController();
  final _quantityController = TextEditingController(text: '1');
  final _weightController = TextEditingController();

  bool _isLookingUp = false;
  bool _isSearchingMxik = false;
  bool _isSaving = false;
  BarcodeLookupResult? _lookupResult;
  MxikResult? _mxikResult;
  String? _imageUrl;

  @override
  void dispose() {
    _nameController.dispose();
    _barcodeController.dispose();
    _priceController.dispose();
    _mxikController.dispose();
    _quantityController.dispose();
    _weightController.dispose();
    super.dispose();
  }

  // ==========================================
  // BARCODE SKANERLASH
  // ==========================================

  void _scanBarcode() async {
    final result = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const ScannerPage()),
    );
    if (result != null && result.isNotEmpty) {
      _barcodeController.text = result;
      _lookupBarcode(result);
    }
  }

  // ==========================================
  // BARCODE → MAHSULOT MA'LUMOTLARI + MXIK
  // Parallel: Open Food Facts + Soliq MXIK
  // ==========================================

  Future<void> _lookupBarcode(String barcode) async {
    if (barcode.isEmpty) return;

    setState(() {
      _isLookingUp = true;
      _isSearchingMxik = true;
    });

    // Parallel qidirish
    final results = await Future.wait([
      BarcodeLookupService().lookup(barcode),
      MxikService().searchByBarcode(barcode),
    ]);

    final lookupResult = results[0] as BarcodeLookupResult?;
    final mxikResult = results[1] as MxikResult?;

    if (mounted) {
      setState(() {
        _isLookingUp = false;
        _isSearchingMxik = false;
        _lookupResult = lookupResult;
        _mxikResult = mxikResult;
      });

      // Formani avtomatik to'ldirish
      if (lookupResult != null) {
        _nameController.text = lookupResult.displayName;
        _imageUrl = lookupResult.imageUrl;
        if (lookupResult.quantity != null) {
          _weightController.text = lookupResult.quantity!;
        }

        _showSnackBar('Mahsulot topildi: ${lookupResult.displayName}', Colors.green);
      }

      if (mxikResult != null) {
        _mxikController.text = mxikResult.mxikCode;
        _showSnackBar('MXIK topildi: ${mxikResult.mxikCode}', Colors.blue);
      } else if (lookupResult == null) {
        _showSnackBar('Barcode bazada topilmadi — qo\'lda to\'ldiring', Colors.orange);
      }
    }
  }

  // ==========================================
  // MXIK QIDIRISH (nomi bo'yicha)
  // ==========================================

  Future<void> _searchMxikByName() async {
    final keyword = _nameController.text.trim();
    if (keyword.isEmpty) {
      _showSnackBar('Avval mahsulot nomini kiriting', Colors.orange);
      return;
    }

    setState(() => _isSearchingMxik = true);
    final results = await MxikService().searchByKeyword(keyword, size: 10);
    setState(() => _isSearchingMxik = false);

    if (!mounted || results.isEmpty) {
      if (mounted) _showSnackBar('MXIK topilmadi', Colors.orange);
      return;
    }

    // MXIK tanlash dialog
    final selected = await showModalBottomSheet<MxikResult>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.6,
          maxChildSize: 0.9,
          minChildSize: 0.3,
          expand: false,
          builder: (context, scrollController) {
            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      const Icon(Icons.search, color: Colors.orange),
                      const SizedBox(width: 8),
                      Text('MXIK tanlang (${results.length} ta)',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: ListView.separated(
                    controller: scrollController,
                    itemCount: results.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final r = results[index];
                      return ListTile(
                        title: Text(r.name,
                            style: const TextStyle(fontSize: 13),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis),
                        subtitle: Text(r.mxikCode,
                            style: TextStyle(
                                fontSize: 12,
                                fontFamily: 'monospace',
                                color: Colors.grey[400])),
                        trailing: const Icon(Icons.chevron_right, size: 20),
                        onTap: () => Navigator.pop(context, r),
                      );
                    },
                  ),
                ),
              ],
            );
          },
        );
      },
    );

    if (selected != null && mounted) {
      setState(() {
        _mxikResult = selected;
        _mxikController.text = selected.mxikCode;
      });
    }
  }

  // ==========================================
  // MXIK KODNI TEKSHIRISH (qo'lda kiritilganda)
  // ==========================================

  Future<void> _verifyMxikCode() async {
    final code = _mxikController.text.trim();
    if (code.isEmpty) return;

    setState(() => _isSearchingMxik = true);
    final result = await MxikService().getByCode(code);
    setState(() => _isSearchingMxik = false);

    if (result != null && mounted) {
      setState(() => _mxikResult = result);
      _showSnackBar('MXIK tasdiqlandi: ${result.name}', Colors.green);
    } else if (mounted) {
      setState(() => _mxikResult = null);
      _showSnackBar(
        '⚠️ Bu MXIK kod tasnif soliq bazasida topilmadi. To\'g\'ri MXIK kodni kiriting.',
        Colors.red,
        duration: 5,
      );
    }
  }

  // ==========================================
  // SAQLASH
  // ==========================================

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      final data = {
        'name': _nameController.text.trim(),
        'barcode': _barcodeController.text.trim(),
        'price': double.parse(_priceController.text.trim()),
        'stockQuantity': int.tryParse(_quantityController.text.trim()) ?? 1,
        'weight': _weightController.text.trim().isNotEmpty ? _weightController.text.trim() : null,
        'image': _imageUrl,
        'sku': _mxikController.text.trim().isNotEmpty ? _mxikController.text.trim() : null,
      };

      // API ga yuborish
      // await ApiService().createProduct(data);

      if (mounted) {
        _showSnackBar('Mahsulot muvaffaqiyatli qo\'shildi!', Colors.green);
        Navigator.pop(context, true);
      }
    } catch (e) {
      _showSnackBar('Xatolik: $e', Colors.red);
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _showSnackBar(String message, Color color, {int duration = 3}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        duration: Duration(seconds: duration),
      ),
    );
  }

  // ==========================================
  // UI
  // ==========================================

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.chevron_left, size: 28),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Mahsulot qo\'shish',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [

                // ===== BARCODE =====
                const _Label(text: 'Barcode'),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _barcodeController,
                        decoration: const InputDecoration(hintText: 'Skanerlang yoki kiriting'),
                        validator: (v) => v == null || v.isEmpty ? 'Barcode kiriting' : null,
                        onFieldSubmitted: _lookupBarcode,
                      ),
                    ),
                    const SizedBox(width: 8),
                    _IconBtn(
                      icon: Icons.qr_code_scanner,
                      color: Colors.orange,
                      onPressed: _scanBarcode,
                    ),
                    const SizedBox(width: 8),
                    _IconBtn(
                      icon: Icons.search,
                      color: Colors.green,
                      loading: _isLookingUp,
                      onPressed: () => _lookupBarcode(_barcodeController.text.trim()),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text('Skanerlang yoki qo\'lda kiriting → avtomatik qidiradi',
                    style: TextStyle(fontSize: 11, color: Colors.grey[500])),

                // Barcode natijasi
                if (_lookupResult != null) ...[
                  const SizedBox(height: 12),
                  _InfoCard(
                    icon: Icons.cloud_done,
                    color: Colors.green,
                    title: 'Bazadan topildi',
                    items: [
                      if (_lookupResult!.brand != null) 'Brand: ${_lookupResult!.brand}',
                      if (_lookupResult!.category != null) 'Kategoriya: ${_lookupResult!.category}',
                      if (_lookupResult!.quantity != null) 'Hajmi: ${_lookupResult!.quantity}',
                    ],
                    isDark: isDark,
                  ),
                ],

                // Rasm
                if (_imageUrl != null) ...[
                  const SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(_imageUrl!, height: 100, fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const SizedBox()),
                  ),
                ],

                // ===== MAHSULOT NOMI =====
                const SizedBox(height: 24),
                const _Label(text: 'Mahsulot nomi'),
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(hintText: 'Masalan: Coca-Cola 1.5L'),
                  textCapitalization: TextCapitalization.words,
                  validator: (v) => v == null || v.isEmpty ? 'Nom kiriting' : null,
                ),

                // ===== NARX =====
                const SizedBox(height: 24),
                const _Label(text: 'Narxi'),
                TextFormField(
                  controller: _priceController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(hintText: '0', suffixText: 'so\'m'),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Narx kiriting';
                    if (double.tryParse(v) == null) return 'Noto\'g\'ri raqam';
                    return null;
                  },
                ),

                // ===== SONI =====
                const SizedBox(height: 24),
                const _Label(text: 'Soni (omborda)'),
                TextFormField(
                  controller: _quantityController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(hintText: '1', suffixText: 'dona'),
                ),

                // ===== OG'IRLIGI =====
                const SizedBox(height: 24),
                const _Label(text: 'Og\'irligi / Hajmi'),
                TextFormField(
                  controller: _weightController,
                  decoration: const InputDecoration(hintText: 'Masalan: 1.5L yoki 500g'),
                ),

                // ===== MXIK KOD =====
                const SizedBox(height: 24),
                const _Label(text: 'MXIK kod'),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _mxikController,
                        decoration: const InputDecoration(hintText: '00000000000000000'),
                        keyboardType: TextInputType.number,
                        onFieldSubmitted: (_) => _verifyMxikCode(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    _IconBtn(
                      icon: Icons.verified,
                      color: Colors.blue,
                      loading: _isSearchingMxik,
                      onPressed: _verifyMxikCode,
                      tooltip: 'Soliq bazasidan tekshirish',
                    ),
                    const SizedBox(width: 8),
                    _IconBtn(
                      icon: Icons.manage_search,
                      color: Colors.purple,
                      onPressed: _searchMxikByName,
                      tooltip: 'Nomi bo\'yicha MXIK qidirish',
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text('tasnif.soliq.uz dan tekshiriladi',
                    style: TextStyle(fontSize: 11, color: Colors.grey[500])),

                // MXIK natijasi
                if (_mxikResult != null) ...[
                  const SizedBox(height: 12),
                  _InfoCard(
                    icon: Icons.verified,
                    color: Colors.blue,
                    title: 'MXIK: ${_mxikResult!.mxikCode}',
                    items: [
                      _mxikResult!.name,
                      if (_mxikResult!.groupName != null) 'Guruh: ${_mxikResult!.groupName}',
                    ],
                    isDark: isDark,
                  ),
                ],

                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),

      // SAQLASH TUGMASI
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            height: 56,
            child: ElevatedButton.icon(
              onPressed: _isSaving ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              icon: _isSaving
                  ? const SizedBox(width: 20, height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.add_circle),
              label: Text(_isSaving ? 'Saqlanmoqda...' : 'Mahsulot qo\'shish',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
        ),
      ),
    );
  }
}

// ===== HELPER WIDGETS =====

class _Label extends StatelessWidget {
  final String text;
  const _Label({required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(text,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
    );
  }
}

class _IconBtn extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback? onPressed;
  final bool loading;
  final String? tooltip;

  const _IconBtn({
    required this.icon,
    required this.color,
    this.onPressed,
    this.loading = false,
    this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip ?? '',
      child: Container(
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: IconButton(
          icon: loading
              ? SizedBox(width: 20, height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: color))
              : Icon(icon, color: color),
          onPressed: loading ? null : onPressed,
          padding: const EdgeInsets.all(14),
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final List<String> items;
  final bool isDark;

  const _InfoCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.items,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? color.withOpacity(0.1) : color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(title,
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: color)),
              ),
            ],
          ),
          ...items.where((s) => s.isNotEmpty).map((item) => Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(item,
                style: const TextStyle(fontSize: 12),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
          )),
        ],
      ),
    );
  }
}
