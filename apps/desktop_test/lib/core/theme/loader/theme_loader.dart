import 'dart:io';
import 'package:brainstorm/core/theme/model/app_theme.dart';

abstract interface class ThemeLoader {
  Future<AppTheme> loadAsset(String asset);
  Future<AppTheme> loadFile(File file);
  Future<void> save(File file, AppTheme theme);
}

