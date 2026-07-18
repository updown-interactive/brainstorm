import 'dart:convert';
import 'dart:io';
import 'package:path/path.dart' as p;
import 'package:brainstorm/core/theme/loader/theme_loader.dart';
import 'package:brainstorm/core/theme/loader/theme_repo.dart';
import 'package:brainstorm/core/theme/model/app_theme.dart';
import 'package:brainstorm/core/database/dao/project_settings_dao.dart';

class ThemeRepositoryImpl implements ThemeRepository {
  ThemeRepositoryImpl({
    required this.loader,
    required this.settingsDao,
    required this.settingsDirectory,
  });

  final ThemeLoader loader;
  final ProjectSettingsDao settingsDao;
  final Directory settingsDirectory;

  Directory get _installedDir => Directory(p.join(settingsDirectory.path, 'themes'));

  @override
  Future<List<AppTheme>> builtin() async {
    final themes = <AppTheme>[];
    try {
      final darkTheme = await loader.loadAsset('lib/core/theme/builtin/dark.json');
      themes.add(darkTheme);
    } catch (_) {
      // Ignore
    }
    try {
      final lightTheme = await loader.loadAsset('lib/core/theme/builtin/light.json');
      themes.add(lightTheme);
    } catch (_) {
      // Ignore
    }
    return themes;
  }

  @override
  Future<List<AppTheme>> installed() async {
    if (!await _installedDir.exists()) {
      return [];
    }
    final themes = <AppTheme>[];
    try {
      await for (final entity in _installedDir.list()) {
        if (entity is File && entity.path.endsWith('.json')) {
          try {
            final theme = await loader.loadFile(entity);
            themes.add(theme);
          } catch (_) {
            // Ignore invalid files
          }
        }
      }
    } catch (_) {
      // Ignore list directory errors
    }
    return themes;
  }

  @override
  Future<AppTheme> loadCurrent([String? projectId]) async {
    String? currentThemeId;

    final settingsFile = File(p.join(settingsDirectory.path, 'settings.json'));
    if (await settingsFile.exists()) {
      try {
        final content = await settingsFile.readAsString();
        final map = jsonDecode(content) as Map<String, dynamic>;
        if (map.containsKey('theme')) {
          currentThemeId = map['theme'] as String?;
        }
      } catch (_) {
        // Ignore JSON read errors
      }
    }

    currentThemeId ??= 'dark';

    // Try built-in first
    final builtins = await builtin();
    for (final theme in builtins) {
      if (theme.id == currentThemeId) {
        return theme;
      }
    }

    // Try installed
    final customThemes = await installed();
    for (final theme in customThemes) {
      if (theme.id == currentThemeId) {
        return theme;
      }
    }

    // Fallback to first builtin
    if (builtins.isNotEmpty) {
      return builtins.first;
    }
    throw StateError('No themes available');
  }

  @override
  Future<void> saveCurrent(AppTheme theme, [String? projectId]) async {
    final settingsFile = File(p.join(settingsDirectory.path, 'settings.json'));
    try {
      final content = jsonEncode({'theme': theme.id});
      await settingsFile.writeAsString(content);
    } catch (_) {
      // Ignore write errors
    }

    // If it's a custom theme (not built-in), also save/update the file in the installed folder
    final builtins = await builtin();
    final isBuiltin = builtins.any((t) => t.id == theme.id);
    if (!isBuiltin) {
      await _installedDir.create(recursive: true);
      final themeFile = File(p.join(_installedDir.path, '${theme.id}.json'));
      await loader.save(themeFile, theme);
    }
  }
}
