import 'package:freezed_annotation/freezed_annotation.dart';

import '../model/app_theme.dart';

part 'theme_state.freezed.dart';

@freezed
sealed class ThemeState with _$ThemeState {
  const factory ThemeState.loading() = ThemeLoading;

  const factory ThemeState.loaded({
    required AppTheme theme,
  }) = ThemeLoaded;

  const factory ThemeState.failure({
    required String message,
  }) = ThemeFailure;
}