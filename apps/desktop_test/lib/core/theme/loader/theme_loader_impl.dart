
import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';

import '../model/app_theme.dart';
import 'theme_loader.dart';

class JsonThemeLoader implements ThemeLoader {
  const JsonThemeLoader();

  @override
  Future<AppTheme> loadAsset(String asset) async {
    final jsonString = await rootBundle.loadString(asset);
    final map = jsonDecode(jsonString) as Map<String, dynamic>;

    return AppTheme.fromJson(map);
  }

  @override
  Future<AppTheme> loadFile(File file) async {
    final jsonString = await file.readAsString();
    final map = jsonDecode(jsonString) as Map<String, dynamic>;

    return AppTheme.fromJson(map);
  }

  @override
  Future<void> save(File file, AppTheme theme) async {
    final jsonString = const JsonEncoder.withIndent(
      '  ',
    ).convert(theme.toJson());

    await file.writeAsString(jsonString);
  }
}