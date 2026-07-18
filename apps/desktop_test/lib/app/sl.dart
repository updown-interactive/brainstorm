import 'dart:io';
import 'package:get_it/get_it.dart';
import 'package:path/path.dart' as p;
import 'package:brainstorm/core/theme/loader/theme_loader.dart';
import 'package:brainstorm/core/theme/loader/theme_loader_impl.dart';
import 'package:brainstorm/core/theme/loader/theme_repo.dart';
import 'package:brainstorm/core/theme/loader/theme_repo_impl.dart';
import 'package:brainstorm/core/theme/cubit/cubit.dart';
import 'package:brainstorm/features/onboarding/controller.dart';
import 'package:brainstorm/features/shell/controller.dart';
import 'package:brainstorm/features/settings/controller.dart';
import 'package:brainstorm/features/files/cubit/cubit.dart';
import 'package:brainstorm/core/database/brain_database.dart';
import 'package:brainstorm/core/database/dao/project_dao.dart';
import 'package:brainstorm/core/database/dao/project_settings_dao.dart';
import 'package:brainstorm/core/ui/toast/toast_cubit.dart';

final sl = GetIt.instance;

void init() {
  _registerServices();
  _registerControllers();
}

void _registerServices() {
  // Register ThemeLoader
  sl.registerLazySingleton<ThemeLoader>(() => const JsonThemeLoader());

  // Register Settings Directory
  final settingsDir = _getSettingsDirectory();
  sl.registerLazySingleton<Directory>(() => settingsDir, instanceName: 'settingsDir');

  // Register ThemeRepository
  sl.registerLazySingleton<ThemeRepository>(
    () => ThemeRepositoryImpl(
      loader: sl<ThemeLoader>(),
      settingsDao: sl<ProjectSettingsDao>(),
      settingsDirectory: sl<Directory>(instanceName: 'settingsDir'),
    ),
  );

  // Register BrainDatabase
  sl.registerLazySingleton<BrainDatabase>(() => BrainDatabase());

  // Register ProjectDao
  sl.registerLazySingleton<ProjectDao>(() => sl<BrainDatabase>().projectDao);

  // Register ProjectSettingsDao
  sl.registerLazySingleton<ProjectSettingsDao>(() => sl<BrainDatabase>().projectSettingsDao);
}

void _registerControllers() {
  sl.registerFactory(() => OnboardingCubit(sl<ProjectDao>()));
  sl.registerFactory(() => ThemeCubit(sl<ThemeRepository>()));
  sl.registerFactory(() => ShellCubit(sl<ProjectSettingsDao>(), sl<ProjectDao>()));
  sl.registerFactory(() => SettingsCubit());
  sl.registerFactory(() => FilesCubit());
  sl.registerLazySingleton(() => ToastCubit());
}

Directory _getSettingsDirectory() {
  if (Platform.isWindows) {
    final appData = Platform.environment['APPDATA'] ?? Platform.environment['USERPROFILE'] ?? '.';
    return Directory(p.join(appData, 'brainstorm'));
  } else {
    final home = Platform.environment['HOME'] ?? '.';
    return Directory(p.join(home, '.brainstorm'));
  }
}
