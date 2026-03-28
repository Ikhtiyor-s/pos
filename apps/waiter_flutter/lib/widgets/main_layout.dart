import 'package:flutter/material.dart';
import 'bottom_nav.dart';

class MainLayout extends StatelessWidget {
  final Widget body;
  final int currentIndex;

  const MainLayout({
    super.key,
    required this.body,
    required this.currentIndex,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: body,
      bottomNavigationBar: BottomNav(currentIndex: currentIndex),
    );
  }
}
