import 'dart:ui';

import 'app_colors.dart';
import 'app_radius.dart';
import 'app_spacing.dart';
import 'app_theme.dart';
import 'app_typography.dart';

class AppThemeSerializer {
  const AppThemeSerializer._();

  static AppTheme fromJson(Map<String, dynamic> json) {
    return AppTheme(
      id: json['id'] as String,
      name: json['name'] as String,

      colors: _colorsFromJson(json['colors']),

      radius: _radiusFromJson(json['radius']),

      spacing: _spacingFromJson(json['spacing']),

      typography: _typographyFromJson(json['typography']),
    );
  }

  static Map<String, dynamic> toJson(AppTheme theme) {
    return {
      'id': theme.id,
      'name': theme.name,

      'colors': _colorsToJson(theme.colors),

      'radius': _radiusToJson(theme.radius),

      'spacing': _spacingToJson(theme.spacing),

      'typography': _typographyToJson(theme.typography),
    };
  }

  // ---------------------------------------------------------------------------
  // Colors
  // ---------------------------------------------------------------------------

  static AppColors _colorsFromJson(dynamic json) {
    final map = json as Map<String, dynamic>;

    return AppColors(
      background: _color(map['background']),
      surface: _color(map['surface']),
      surfaceVariant: _color(map['surfaceVariant']),

      sidebar: _color(map['sidebar']),
      toolbar: _color(map['toolbar']),

      primary: _color(map['primary']),
      secondary: _color(map['secondary']),

      success: _color(map['success']),
      warning: _color(map['warning']),
      error: _color(map['error']),

      text: _color(map['text']),
      textMuted: _color(map['textMuted']),

      border: _color(map['border']),
      divider: _color(map['divider']),

      hover: _color(map['hover']),
      focus: _color(map['focus']),
      selection: _color(map['selection']),
    );
  }

  static Map<String, dynamic> _colorsToJson(AppColors colors) {
    return {
      'background': _hex(colors.background),
      'surface': _hex(colors.surface),
      'surfaceVariant': _hex(colors.surfaceVariant),

      'sidebar': _hex(colors.sidebar),
      'toolbar': _hex(colors.toolbar),

      'primary': _hex(colors.primary),
      'secondary': _hex(colors.secondary),

      'success': _hex(colors.success),
      'warning': _hex(colors.warning),
      'error': _hex(colors.error),

      'text': _hex(colors.text),
      'textMuted': _hex(colors.textMuted),

      'border': _hex(colors.border),
      'divider': _hex(colors.divider),

      'hover': _hex(colors.hover),
      'focus': _hex(colors.focus),
      'selection': _hex(colors.selection),
    };
  }

  // ---------------------------------------------------------------------------
  // Radius
  // ---------------------------------------------------------------------------

  static AppRadius _radiusFromJson(dynamic json) {
    final map = json as Map<String, dynamic>;

    return AppRadius(
      small: (map['small'] as num).toDouble(),
      medium: (map['medium'] as num).toDouble(),
      large: (map['large'] as num).toDouble(),
    );
  }

  static Map<String, dynamic> _radiusToJson(AppRadius radius) {
    return {
      'small': radius.small,
      'medium': radius.medium,
      'large': radius.large,
    };
  }

  // ---------------------------------------------------------------------------
  // Spacing
  // ---------------------------------------------------------------------------

  static AppSpacing _spacingFromJson(dynamic json) {
    final map = json as Map<String, dynamic>;

    return AppSpacing(
      xs: (map['xs'] as num).toDouble(),
      sm: (map['sm'] as num).toDouble(),
      md: (map['md'] as num).toDouble(),
      lg: (map['lg'] as num).toDouble(),
      xl: (map['xl'] as num).toDouble(),
    );
  }

  static Map<String, dynamic> _spacingToJson(AppSpacing spacing) {
    return {
      'xs': spacing.xs,
      'sm': spacing.sm,
      'md': spacing.md,
      'lg': spacing.lg,
      'xl': spacing.xl,
    };
  }

  // ---------------------------------------------------------------------------
  // Typography
  // ---------------------------------------------------------------------------

  static AppTypography _typographyFromJson(dynamic json) {
    final map = json as Map<String, dynamic>;

    return AppTypography(
      fontFamily: map['fontFamily'] as String,

      small: (map['small'] as num).toDouble(),
      body: (map['body'] as num).toDouble(),
      title: (map['title'] as num).toDouble(),
      headline: (map['headline'] as num).toDouble(),
    );
  }

  static Map<String, dynamic> _typographyToJson(AppTypography typography) {
    return {
      'fontFamily': typography.fontFamily,

      'small': typography.small,
      'body': typography.body,
      'title': typography.title,
      'headline': typography.headline,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  static Color _color(String hex) {
    hex = hex.replaceFirst('#', '');

    if (hex.length == 6) {
      hex = 'FF$hex';
    }

    return Color(int.parse(hex, radix: 16));
  }

  static String _hex(Color color) {
    final value = color.toARGB32();
    return '#${value.toRadixString(16).substring(2).toUpperCase()}';
  }
}