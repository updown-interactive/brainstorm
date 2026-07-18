import 'dart:io';
import 'package:brainstorm/shared/widgets/logo.dart';
import 'package:flutter/material.dart';
import 'package:window_manager/window_manager.dart';
import 'package:flutter/foundation.dart';
import 'package:brainstorm/core/theme/theme.dart';

class Surface extends StatelessWidget {
  final Widget body;
  final Widget? toolBar;
  final Color? logoColor;

  const Surface({super.key, required this.body, this.toolBar, this.logoColor});

  bool get _showWindowActions =>
      !kIsWeb && (Platform.isWindows || Platform.isLinux);
  bool get _isMac => Platform.isMacOS;
  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final bar = toolBar;
    return Scaffold(
      backgroundColor: colors.background,
      body: Column(
        children: [
          Container(
            height: 40,
            decoration: BoxDecoration(
              color: colors.toolbar,
              border: Border(bottom: BorderSide(color: colors.divider)),
            ),
            child: Row(
              children: [
                if (!_isMac)
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: SizedBox(height: 30, width: 30, child: const Logo()),
                  ),
                Expanded(
                  child: DragToMoveArea(
                    child: Padding(
                      padding: .only(left: _isMac ? 80 : 0, top: 8, bottom: 8),
                      child: Row(children: [?bar]),
                    ),
                  ),
                ),

                if (_showWindowActions) const _ToolActionButton(),
                if (_isMac)
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: SizedBox(height: 26, width: 26, child:  Logo(logoColor: logoColor,)),
                  ),
              ],
            ),
          ),

          Expanded(child: body),
        ],
      ),
    );
  }
}

class _ToolActionButton extends StatefulWidget {
  const _ToolActionButton();

  @override
  State<_ToolActionButton> createState() => _ToolActionButtonState();
}

class _ToolActionButtonState extends State<_ToolActionButton>
    with WindowListener {
  bool _isMaximized = false;

  @override
  void initState() {
    super.initState();
    windowManager.addListener(this);
    _loadState();
  }

  Future<void> _loadState() async {
    _isMaximized = await windowManager.isMaximized();
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    windowManager.removeListener(this);
    super.dispose();
  }

  @override
  void onWindowMaximize() {
    setState(() => _isMaximized = true);
  }

  @override
  void onWindowUnmaximize() {
    setState(() => _isMaximized = false);
  }

  Widget _button({
    required IconData icon,
    required VoidCallback onPressed,
    Color? hoverColor,
  }) {
    final colors = context.colors;
    return SizedBox(
      width: 46,
      height: 32,
      child: InkWell(
        hoverColor: hoverColor ?? colors.hover,
        onTap: onPressed,
        child: Center(child: Icon(icon, size: 16, color: colors.textMuted)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _button(icon: Icons.remove, onPressed: () => windowManager.minimize()),
        _button(
          icon: _isMaximized ? Icons.filter_none : Icons.crop_square,
          onPressed: () async {
            if (_isMaximized) {
              await windowManager.unmaximize();
            } else {
              await windowManager.maximize();
            }
          },
        ),
        _button(
          icon: Icons.close,
          hoverColor: Colors.red,
          onPressed: () => windowManager.close(),
        ),
      ],
    );
  }
}
