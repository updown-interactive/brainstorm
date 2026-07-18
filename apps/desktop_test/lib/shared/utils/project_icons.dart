import 'package:flutter/material.dart';

class ProjectIcons {
  static const Map<String, IconData> values = {
    'workspaces': Icons.workspaces_rounded,
    'folder': Icons.folder_rounded,
    'book': Icons.book_rounded,
    'code': Icons.code_rounded,
    'analytics': Icons.analytics_rounded,
    'cloud': Icons.cloud_rounded,
    'terminal': Icons.terminal_rounded,
    'lightbulb': Icons.lightbulb_outline_rounded,
    'dashboard': Icons.dashboard_rounded,
    'storage': Icons.storage_rounded,
  };

  static IconData getIcon(String? key) {
    if (key == null) return Icons.workspaces_rounded;
    return values[key] ?? Icons.workspaces_rounded;
  }
}
