import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:brainstorm/core/theme/loader/theme_repo.dart';

import '../model/app_theme.dart';

import 'theme_state.dart';

class ThemeCubit extends Cubit<ThemeState> {
  ThemeCubit(this._repository) : super(const ThemeState.loading());

  final ThemeRepository _repository;

  Future<void> initialize([String? projectId]) async {
    emit(const ThemeState.loading());

    try {
      final theme = await _repository.loadCurrent(projectId);

      emit(ThemeState.loaded(theme: theme));
    } catch (e) {
      emit(ThemeState.failure(message: e.toString()));
    }
  }

  Future<void> setTheme(AppTheme theme, [String? projectId]) async {
    try {
      await _repository.saveCurrent(theme, projectId);

      emit(ThemeState.loaded(theme: theme));
    } catch (e) {
      emit(ThemeState.failure(message: e.toString()));
    }
  }

  Future<void> reload([String? projectId]) async {
    await initialize(projectId);
  }
}
