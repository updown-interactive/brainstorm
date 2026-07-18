import 'package:drift/drift.dart';
import 'package:brainstorm/core/database/tables/project_table.dart';

@DataClassName('ProjectSetting')
class ProjectSettingsTable extends Table {
  @override
  String get tableName => 'project_settings';

  TextColumn get projectId => text().references(ProjectTable, #id)();
  TextColumn get key => text()();
  TextColumn get value => text()();

  @override
  Set<Column> get primaryKey => {projectId, key};
}
