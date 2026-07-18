import 'package:brainstorm/core/theme/model/app_theme.dart';

abstract interface class ThemeRepository {
  Future<AppTheme> loadCurrent([String? projectId]);

  Future<void> saveCurrent(AppTheme theme, [String? projectId]);

  Future<List<AppTheme>> builtin();

  Future<List<AppTheme>> installed();
}
