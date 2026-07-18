import 'package:flutter/material.dart';
import 'model/app_theme.dart';
import 'model/app_colors.dart';
import 'model/app_radius.dart';
import 'model/app_spacing.dart';
import 'model/app_typography.dart';

export 'model/app_theme.dart';
export 'model/app_colors.dart';
export 'model/app_radius.dart';
export 'model/app_spacing.dart';
export 'model/app_typography.dart';
export 'cubit/cubit.dart';
export 'cubit/theme_state.dart';
export 'loader/theme_repo.dart';

class AppThemeScope extends InheritedWidget {
  const AppThemeScope({
    super.key,
    required this.theme,
    required super.child,
  });

  final AppTheme theme;

  static AppTheme of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppThemeScope>();
    if (scope == null) {
      throw StateError('No AppThemeScope found in context');
    }
    return scope.theme;
  }

  @override
  bool updateShouldNotify(AppThemeScope oldWidget) {
    return theme.id != oldWidget.theme.id || theme != oldWidget.theme;
  }
}

extension AppThemeBuildContext on BuildContext {
  AppTheme get theme => AppThemeScope.of(this);
  AppColors get colors => theme.colors;
  AppRadius get radius => theme.radius;
  AppSpacing get spacing => theme.spacing;
  AppTypography get typography => theme.typography;
}
