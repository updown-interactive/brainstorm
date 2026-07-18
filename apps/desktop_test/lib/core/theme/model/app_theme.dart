import 'app_colors.dart';
import 'app_radius.dart';
import 'app_spacing.dart';
import 'app_typography.dart';
import 'app_theme_serializer.dart';

class AppTheme {
  final String id;
  final String name;

  final AppColors colors;
  final AppRadius radius;
  final AppSpacing spacing;
  final AppTypography typography;

  const AppTheme({
    required this.id,
    required this.name,
    required this.colors,
    required this.radius,
    required this.spacing,
    required this.typography,
  });

  factory AppTheme.fromJson(Map<String, dynamic> json) {
    return AppThemeSerializer.fromJson(json);
  }

  Map<String, dynamic> toJson() {
    return AppThemeSerializer.toJson(this);
  }
}
