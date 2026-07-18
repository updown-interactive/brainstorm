import 'package:freezed_annotation/freezed_annotation.dart';
part 'state.freezed.dart';


@freezed
abstract class OnboardingState with _$OnboardingState {
  const factory OnboardingState({
    @Default(true) bool loading,
    @Default(false) bool completed,
    @Default(false) bool hasProjects,
  }) = _OnboardingState;
}