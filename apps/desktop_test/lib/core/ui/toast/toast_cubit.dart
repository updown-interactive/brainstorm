import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'toast_state.dart';
part 'toast_cubit.freezed.dart';

class ToastCubit extends Cubit<ToastState> {
  ToastCubit() : super(const ToastState());

  int _idCounter = 0;

  void showToast({
    required String title,
    String? message,
    Color? color,
    IconData? icon,
    Duration duration = const Duration(seconds: 4),
  }) {
    final id = (_idCounter++).toString();
    final toast = ToastMessage(
      id: id,
      title: title,
      message: message,
      color: color,
      icon: icon,
    );
    
    emit(state.copyWith(toasts: [...state.toasts, toast]));

    Future.delayed(duration, () {
      if (!isClosed) {
        removeToast(id);
      }
    });
  }

  void removeToast(String id) {
    emit(state.copyWith(
      toasts: state.toasts.where((t) => t.id != id).toList(),
    ));
  }
}
