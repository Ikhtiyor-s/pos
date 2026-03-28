import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'translations.dart';

class LangNotifier extends ChangeNotifier {
  static const _key = 'lang';
  String _lang = 'uz';

  String get lang => _lang;

  LangNotifier() {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_key);
    if (saved != null && appTranslations.containsKey(saved)) {
      _lang = saved;
      notifyListeners();
    }
  }

  Future<void> setLang(String lang) async {
    if (!appTranslations.containsKey(lang)) return;
    _lang = lang;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, lang);
  }

  void cycleLang() {
    const langs = ['uz', 'ru', 'en'];
    final idx = langs.indexOf(_lang);
    final next = langs[(idx + 1) % langs.length];
    setLang(next);
  }

  String t(String key) {
    final map = appTranslations[_lang];
    if (map == null) return key;
    return map[key] ?? appTranslations['uz']?[key] ?? key;
  }
}
