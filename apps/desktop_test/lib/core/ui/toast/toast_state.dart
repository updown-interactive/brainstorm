part of 'toast_cubit.dart';

@freezed
abstract class ToastMessage with _$ToastMessage {
  const factory ToastMessage({
    required String id,
    required String title,
    String? message,
    Color? color,
    IconData? icon,
  }) = _ToastMessage;
}

@freezed
abstract class ToastState with _$ToastState {
  const factory ToastState({
    @Default([]) List<ToastMessage> toasts,
  }) = _ToastState;
}
