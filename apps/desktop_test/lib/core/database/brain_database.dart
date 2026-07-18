import 'dart:io';
import 'package:drift/drift.dart';
import 'dart:ui' show Color;
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'tables/project_table.dart';
import 'tables/project_settings_table.dart';
import 'dao/project_dao.dart';
import 'dao/project_settings_dao.dart';
import 'migrations/migration_v1.dart';
import 'migrations/migration_v2.dart';
import 'migrations/migration_v3.dart';

part 'brain_database.g.dart';

@DriftDatabase(
  tables: [ProjectTable, ProjectSettingsTable],
  daos: [ProjectDao, ProjectSettingsDao],
)
class BrainDatabase extends _$BrainDatabase {
  BrainDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 3;

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (m) async {
        await MigrationV1.onCreate(this, m);
      },
      onUpgrade: (m, from, to) async {
        if (from < 2) {
          await MigrationV2.onUpgrade(this, m);
        }
        if (from < 3) {
          await MigrationV3.onUpgrade(this, m);
        }
      },
    );
  }
}

QueryExecutor _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'brainstorm.db'));
    return NativeDatabase(file);
  });
}

extension ProjectColorExtension on Project {
  Color? get projectColor => color == null ? null : Color(color!);
}
