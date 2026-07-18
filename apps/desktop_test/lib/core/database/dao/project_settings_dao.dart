import 'package:drift/drift.dart';
import 'package:brainstorm/core/database/brain_database.dart';
import 'package:brainstorm/core/database/tables/project_settings_table.dart';
import 'package:brainstorm/core/database/tables/project_table.dart';

part 'project_settings_dao.g.dart';

@DriftAccessor(tables: [ProjectSettingsTable, ProjectTable])
class ProjectSettingsDao extends DatabaseAccessor<BrainDatabase> with _$ProjectSettingsDaoMixin {
  ProjectSettingsDao(super.db);

  Future<String?> getSetting(String projectId, String key) async {
    final query = select(projectSettingsTable)
      ..where((t) => t.projectId.equals(projectId))
      ..where((t) => t.key.equals(key));
    
    final result = await query.getSingleOrNull();
    return result?.value;
  }

  Future<void> setSetting(String projectId, String key, String value) async {
    await into(projectSettingsTable).insertOnConflictUpdate(
      ProjectSettingsTableCompanion(
        projectId: Value(projectId),
        key: Value(key),
        value: Value(value),
      ),
    );
  }

  Future<void> clearSettingsForProject(String projectId) async {
    await (delete(projectSettingsTable)..where((t) => t.projectId.equals(projectId))).go();
  }
}
