import 'package:freezed_annotation/freezed_annotation.dart';

part 'state.freezed.dart';

enum SettingsCategory {
  general,
  appearance,
  models,
}

@freezed
abstract class SettingsState with _$SettingsState {
  const factory SettingsState({
    @Default(SettingsCategory.general) SettingsCategory activeCategory,
  }) = _SettingsState;
}
